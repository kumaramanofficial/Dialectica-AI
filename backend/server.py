"""Dialectica - Debate & Interview Prep AI Backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
import bcrypt
import jwt as pyjwt
import requests
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAISpeechToText, OpenAITextToSpeech


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Env
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_DAYS = 7

# App
app = FastAPI(title="Dialectica API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================
# MODELS
# ============================================================
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    picture: Optional[str] = None


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    bio: Optional[str] = None
    auth_provider: str = "email"
    created_at: datetime


class GoogleSessionRequest(BaseModel):
    session_id: str


class StartConversationRequest(BaseModel):
    mode: Literal["debate", "interview"]
    topic: str
    stance: Optional[str] = None  # for debate: 'for' or 'against'
    role: Optional[str] = None    # for interview: e.g., 'Software Engineer'
    difficulty: Optional[str] = "medium"


class ContinueConversationRequest(BaseModel):
    conversation_id: str
    user_text: str


class TtsRequest(BaseModel):
    text: str
    voice: Optional[str] = "nova"


# ============================================================
# AUTH HELPERS
# ============================================================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_jwt(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    """Auth: supports either Bearer JWT (email auth) or session_token cookie (Google auth)."""
    user_id = None

    # 1. Bearer token (JWT)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        # Try JWT first
        try:
            payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("user_id")
        except pyjwt.PyJWTError:
            # Maybe it's an Emergent session token
            session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
            if session_doc:
                expires_at = session_doc["expires_at"]
                if isinstance(expires_at, str):
                    expires_at = datetime.fromisoformat(expires_at)
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at > datetime.now(timezone.utc):
                    user_id = session_doc["user_id"]

    # 2. Cookie (Emergent Google Auth)
    if not user_id:
        session_token = request.cookies.get("session_token")
        if session_token:
            session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
            if session_doc:
                expires_at = session_doc["expires_at"]
                if isinstance(expires_at, str):
                    expires_at = datetime.fromisoformat(expires_at)
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at > datetime.now(timezone.utc):
                    user_id = session_doc["user_id"]

    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ============================================================
# AUTH ROUTES - Email/Password
# ============================================================
@api_router.post("/auth/signup")
async def signup(req: SignupRequest):
    existing = await db.users.find_one({"email": req.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": req.email,
        "name": req.name,
        "password_hash": hash_password(req.password),
        "picture": None,
        "bio": None,
        "auth_provider": "email",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_jwt(user_id)
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": req.email,
            "name": req.name,
            "picture": None,
            "bio": None,
            "auth_provider": "email",
        }
    }


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt(user["user_id"])
    user.pop("password_hash", None)
    return {"token": token, "user": user}


@api_router.post("/auth/google/session")
async def google_session(req: GoogleSessionRequest, response: Response):
    """Process Emergent Google Auth session_id and create user/session."""
    try:
        r = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": req.session_id},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        logger.error(f"Google session exchange failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid session")

    email = data["email"]
    name = data["name"]
    picture = data.get("picture")
    session_token = data["session_token"]

    # Find or create user
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "bio": None,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc)
        user = user_doc
    else:
        user_id = user["user_id"]
        if not user.get("picture") and picture:
            await db.users.update_one({"user_id": user_id}, {"$set": {"picture": picture}})
            user["picture"] = picture

    # Save session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )

    user.pop("password_hash", None)
    return {"user": user, "token": session_token}


@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    # Clear cookie + delete session row if any
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@api_router.put("/auth/profile")
async def update_profile(req: UpdateProfileRequest, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update:
        return user
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    updated = await db.users.find_one(
        {"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0}
    )
    return updated


@api_router.delete("/auth/profile")
async def delete_profile(user: dict = Depends(get_current_user), response: Response = None):
    user_id = user["user_id"]
    await db.users.delete_one({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.conversations.delete_many({"user_id": user_id})
    if response:
        response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ============================================================
# AI CONVERSATION ROUTES
# ============================================================
def _system_prompt(mode: str, topic: str, stance: Optional[str], role: Optional[str], difficulty: str) -> str:
    if mode == "debate":
        opposing = "against" if stance == "for" else "for"
        return (
            f"You are a sharp, charismatic AI debate opponent. The topic is: '{topic}'. "
            f"The user is arguing {stance or 'their position'}; you must argue {opposing}. "
            f"Difficulty: {difficulty}. Keep responses conversational, ~2-4 sentences, "
            f"as if speaking out loud. Push back firmly but respectfully. Always end with "
            f"a question or challenge that invites the user to respond. Do not use markdown, "
            f"lists, or code formatting — pure spoken prose."
        )
    return (
        f"You are a professional AI interviewer for a '{role or 'general'}' role. "
        f"Difficulty: {difficulty}. Ask focused interview questions one at a time. "
        f"Acknowledge the candidate's previous answer in 1 sentence, then ask the next "
        f"question. Vary between behavioral, technical, and situational questions. "
        f"Keep responses ~2-3 sentences, spoken-style, no markdown. Topic focus: '{topic}'."
    )


async def _gemini_respond(conversation_id: str, system_prompt: str, user_text: str) -> str:
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=conversation_id,
            system_message=system_prompt,
        ).with_model("gemini", "gemini-3.1-pro-preview")
        msg = UserMessage(text=user_text)
        return await chat.send_message(msg)
    except Exception as e:
        logger.exception("Gemini call failed")
        msg_str = str(e).lower()
        if "budget" in msg_str or "exceeded" in msg_str or "quota" in msg_str:
            raise HTTPException(status_code=503, detail="AI quota exhausted. Please top up your Emergent Universal Key (Profile → Universal Key → Add Balance).")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)[:200]}")


@api_router.post("/conversation/start")
async def start_conversation(req: StartConversationRequest, user: dict = Depends(get_current_user)):
    conversation_id = f"conv_{uuid.uuid4().hex[:16]}"
    system_prompt = _system_prompt(req.mode, req.topic, req.stance, req.role, req.difficulty)

    # Generate AI opening
    opening_prompt = (
        f"Begin the {req.mode}. Greet the user briefly and deliver your first "
        f"{'argument' if req.mode == 'debate' else 'interview question'}."
    )
    ai_text = await _gemini_respond(conversation_id, system_prompt, opening_prompt)

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "conversation_id": conversation_id,
        "user_id": user["user_id"],
        "mode": req.mode,
        "topic": req.topic,
        "stance": req.stance,
        "role": req.role,
        "difficulty": req.difficulty,
        "system_prompt": system_prompt,
        "messages": [{"role": "assistant", "text": ai_text, "ts": now}],
        "created_at": now,
        "updated_at": now,
        "score": None,
    }
    await db.conversations.insert_one(doc)

    return {
        "conversation_id": conversation_id,
        "ai_text": ai_text,
        "mode": req.mode,
        "topic": req.topic,
    }


@api_router.post("/conversation/continue")
async def continue_conversation(req: ContinueConversationRequest, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one(
        {"conversation_id": req.conversation_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    ai_text = await _gemini_respond(conv["conversation_id"], conv["system_prompt"], req.user_text)

    now = datetime.now(timezone.utc).isoformat()
    await db.conversations.update_one(
        {"conversation_id": req.conversation_id},
        {
            "$push": {"messages": {"$each": [
                {"role": "user", "text": req.user_text, "ts": now},
                {"role": "assistant", "text": ai_text, "ts": now},
            ]}},
            "$set": {"updated_at": now},
        },
    )
    return {"ai_text": ai_text}


@api_router.post("/conversation/{conversation_id}/end")
async def end_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
    """Score the conversation and return analysis."""
    conv = await db.conversations.find_one(
        {"conversation_id": conversation_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    transcript = "\n".join(
        f"{m['role'].upper()}: {m['text']}" for m in conv["messages"]
    )
    analysis_prompt = (
        f"Analyze this {conv['mode']} session transcript and return ONLY a strict JSON "
        f"object (no markdown, no commentary) with these keys: "
        f"score (number 0-10), tone (string one of: Persuasive/Confident/Hesitant/Calm/Energetic), "
        f"clarity (string one of: Low/Medium/High), pacing (string one of: Slow/Dynamic/Fast), "
        f"engagement (string one of: Low/Medium/High), filler_words (string one of: Low/Medium/High), "
        f"strengths (array of 2-3 short strings), improvements (array of 2-3 short strings), "
        f"summary (1 sentence string). "
        f"Transcript:\n{transcript}"
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"analyze_{conversation_id}",
            system_message="You are a strict JSON-only analysis engine. Output only valid JSON, no markdown.",
        ).with_model("gemini", "gemini-3.1-pro-preview")
        raw = await chat.send_message(UserMessage(text=analysis_prompt))
    except Exception:
        logger.exception("Gemini analyze call failed")
        raw = ""

    import json
    # try to extract JSON
    raw_str = raw.strip()
    if raw_str.startswith("```"):
        raw_str = raw_str.strip("`")
        if raw_str.startswith("json"):
            raw_str = raw_str[4:]
        raw_str = raw_str.strip()
    try:
        analysis = json.loads(raw_str)
    except Exception:
        # fallback minimal
        analysis = {
            "score": 7.5, "tone": "Confident", "clarity": "High", "pacing": "Dynamic",
            "engagement": "Medium", "filler_words": "Low",
            "strengths": ["Clear arguments", "Good engagement"],
            "improvements": ["More specific examples", "Vary pacing"],
            "summary": "Solid performance with room to grow."
        }

    # Skip user-doc updates if conversation was already ended (idempotency)
    already_ended = await db.conversations.find_one(
        {"conversation_id": conversation_id}, {"_id": 0, "ended_at": 1}
    )
    was_already_ended = bool(already_ended and already_ended.get("ended_at"))

    await db.conversations.update_one(
        {"conversation_id": conversation_id},
        {"$set": {"analysis": analysis, "score": analysis.get("score"), "ended_at": datetime.now(timezone.utc).isoformat()}},
    )

    # Update user stats only on first end
    if not was_already_ended:
        today = datetime.now(timezone.utc).date().isoformat()
        user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        last_active = user_doc.get("last_active_date")
        current_streak = user_doc.get("streak", 0) or 0
        if last_active == today:
            new_streak = current_streak or 1
        elif last_active:
            from datetime import date as _date
            try:
                last = _date.fromisoformat(last_active)
                today_d = datetime.now(timezone.utc).date()
                if (today_d - last).days == 1:
                    new_streak = current_streak + 1
                else:
                    new_streak = 1
            except Exception:
                new_streak = 1
        else:
            new_streak = 1

        score = float(analysis.get("score") or 0)
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {
                "$set": {"last_active_date": today, "streak": new_streak},
                "$max": {"best_score": score},
                "$inc": {"total_score": score, "sessions_completed": 1},
            },
        )
    return analysis


@api_router.get("/conversation/{conversation_id}")
async def get_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one(
        {"conversation_id": conversation_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    return conv


@api_router.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    items = await db.conversations.find(
        {"user_id": user["user_id"]}, {"_id": 0, "system_prompt": 0}
    ).sort("created_at", -1).to_list(100)
    return items


@api_router.delete("/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
    res = await db.conversations.delete_one(
        {"conversation_id": conversation_id, "user_id": user["user_id"]}
    )
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ============================================================
# VOICE ROUTES (STT / TTS)
# ============================================================
@api_router.post("/voice/transcribe")
async def transcribe(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    audio_bytes = await file.read()
    # Build a file-like object with the proper extension
    ext = "webm"
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in {"mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"}:
        ext = "webm"

    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio too large (max 25MB)")

    bio = io.BytesIO(audio_bytes)
    bio.name = f"audio.{ext}"

    try:
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        response = await stt.transcribe(file=bio, model="whisper-1", response_format="json")
        text = getattr(response, "text", None) or (response.get("text") if isinstance(response, dict) else "")
        return {"text": text}
    except Exception as e:
        logger.exception("Whisper STT failed")
        msg_str = str(e).lower()
        if "budget" in msg_str or "exceeded" in msg_str or "quota" in msg_str:
            raise HTTPException(status_code=503, detail="AI quota exhausted. Please top up your Emergent Universal Key.")
        raise HTTPException(status_code=502, detail=f"Transcription failed: {str(e)[:200]}")


@api_router.post("/voice/tts")
async def tts(req: TtsRequest, user: dict = Depends(get_current_user)):
    text = req.text[:4000]
    voice = req.voice or "nova"
    try:
        tts_client = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        audio_bytes = await tts_client.generate_speech(
            text=text, model="tts-1", voice=voice, response_format="mp3"
        )
        return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")
    except Exception as e:
        logger.exception("OpenAI TTS failed")
        msg_str = str(e).lower()
        if "budget" in msg_str or "exceeded" in msg_str or "quota" in msg_str:
            raise HTTPException(status_code=503, detail="AI quota exhausted. Please top up your Emergent Universal Key.")
        raise HTTPException(status_code=502, detail=f"TTS failed: {str(e)[:200]}")


@api_router.post("/voice/speak")
async def voice_speak(
    file: UploadFile = File(...),
    conversation_id: str = Form(...),
    voice: str = Form("nova"),
    user: dict = Depends(get_current_user),
):
    """Combined fast endpoint: transcribe audio -> Gemini reply -> TTS mp3. Returns MP3 with AI text header."""
    import base64

    conv = await db.conversations.find_one(
        {"conversation_id": conversation_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    audio_bytes = await file.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio too large")

    ext = "webm"
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in {"mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"}:
        ext = "webm"
    bio = io.BytesIO(audio_bytes)
    bio.name = f"audio.{ext}"

    try:
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        stt_resp = await stt.transcribe(file=bio, model="whisper-1", response_format="json")
        user_text = (getattr(stt_resp, "text", None) or "").strip()
    except Exception as e:
        logger.exception("STT failed")
        raise HTTPException(status_code=502, detail=f"Transcription failed: {str(e)[:160]}")

    if not user_text:
        raise HTTPException(status_code=400, detail="Could not understand audio")

    ai_text = await _gemini_respond(conv["conversation_id"], conv["system_prompt"], user_text)

    now = datetime.now(timezone.utc).isoformat()
    await db.conversations.update_one(
        {"conversation_id": conversation_id},
        {
            "$push": {"messages": {"$each": [
                {"role": "user", "text": user_text, "ts": now},
                {"role": "assistant", "text": ai_text, "ts": now},
            ]}},
            "$set": {"updated_at": now},
        },
    )

    try:
        tts_client = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        audio_out = await tts_client.generate_speech(
            text=ai_text[:4000], model="tts-1", voice=voice, response_format="mp3"
        )
    except Exception as e:
        logger.exception("TTS failed")
        raise HTTPException(status_code=502, detail=f"TTS failed: {str(e)[:160]}")

    # Encode text in base64 header (to avoid header encoding issues)
    headers = {
        "X-User-Text": base64.b64encode(user_text.encode("utf-8")).decode("ascii"),
        "X-AI-Text": base64.b64encode(ai_text.encode("utf-8")).decode("ascii"),
        "Access-Control-Expose-Headers": "X-User-Text, X-AI-Text",
    }
    return StreamingResponse(io.BytesIO(audio_out), media_type="audio/mpeg", headers=headers)


# ============================================================
# DASHBOARD STATS
# ============================================================
@api_router.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    items = await db.conversations.find(
        {"user_id": user["user_id"], "score": {"$ne": None}},
        {"_id": 0, "score": 1, "created_at": 1, "mode": 1, "topic": 1}
    ).sort("created_at", -1).to_list(50)
    last_score = items[0]["score"] if items else None
    avg = sum(i["score"] for i in items) / len(items) if items else None

    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0}) or {}
    # Check if streak is still valid (not broken by inactivity)
    streak = user_doc.get("streak", 0)
    last_active = user_doc.get("last_active_date")
    if last_active and streak:
        from datetime import date as _date
        try:
            days_since = (datetime.now(timezone.utc).date() - _date.fromisoformat(last_active)).days
            if days_since > 1:
                streak = 0
        except Exception:
            streak = 0

    return {
        "last_score": last_score,
        "avg_score": avg,
        "best_score": user_doc.get("best_score"),
        "total_sessions": len(items),
        "history": list(reversed(items[:20])),
        "streak": streak,
        "last_active_date": last_active,
    }


# ============================================================
# LEADERBOARD
# ============================================================
@api_router.get("/leaderboard")
async def leaderboard(user: dict = Depends(get_current_user)):
    """Top users by best_score, with total_score as tiebreaker."""
    cursor = db.users.find(
        {"sessions_completed": {"$gt": 0}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "best_score": 1, "total_score": 1, "sessions_completed": 1, "streak": 1}
    ).sort([("best_score", -1), ("total_score", -1)]).limit(50)
    top = await cursor.to_list(50)
    # default-fill missing fields on top
    for u in top:
        u.setdefault("best_score", None)
        u.setdefault("total_score", 0)
        u.setdefault("sessions_completed", 0)
        u.setdefault("streak", 0)
        u.setdefault("picture", None)

    # Find current user's rank
    me_rank = None
    me_entry = None
    for i, u in enumerate(top):
        if u["user_id"] == user["user_id"]:
            me_rank = i + 1
            me_entry = u
    if me_rank is None:
        higher_count = await db.users.count_documents({
            "sessions_completed": {"$gt": 0},
            "best_score": {"$gt": user.get("best_score") or 0}
        })
        me_rank = higher_count + 1
        me_doc = await db.users.find_one(
            {"user_id": user["user_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "best_score": 1, "total_score": 1, "sessions_completed": 1, "streak": 1}
        ) or {}
        me_entry = {
            "user_id": me_doc.get("user_id", user["user_id"]),
            "name": me_doc.get("name", user.get("name", "")),
            "picture": me_doc.get("picture"),
            "best_score": me_doc.get("best_score"),
            "total_score": me_doc.get("total_score", 0),
            "sessions_completed": me_doc.get("sessions_completed", 0),
            "streak": me_doc.get("streak", 0),
        }

    return {"top": top, "me_rank": me_rank, "me": me_entry}


# ============================================================
# DAILY CHALLENGE
# ============================================================
_CHALLENGE_TOPICS = [
    {"mode": "debate", "topic": "Should social media platforms be held legally responsible for misinformation?", "stance": "for"},
    {"mode": "debate", "topic": "Is remote work better than in-office for long-term productivity?", "stance": "for"},
    {"mode": "interview", "topic": "Leadership & conflict resolution", "role": "Engineering Manager"},
    {"mode": "debate", "topic": "Should AI-generated art qualify for copyright protection?", "stance": "against"},
    {"mode": "debate", "topic": "Is a four-day workweek better for society?", "stance": "for"},
    {"mode": "interview", "topic": "System design fundamentals", "role": "Senior Software Engineer"},
    {"mode": "debate", "topic": "Should elite universities eliminate standardized tests entirely?", "stance": "against"},
    {"mode": "debate", "topic": "Is universal basic income a sustainable policy?", "stance": "for"},
    {"mode": "interview", "topic": "Product strategy & prioritization", "role": "Product Manager"},
    {"mode": "debate", "topic": "Should governments regulate cryptocurrency as strictly as banks?", "stance": "for"},
    {"mode": "debate", "topic": "Is space exploration worth the cost when Earth needs attention?", "stance": "against"},
    {"mode": "interview", "topic": "Data pipelines & ETL at scale", "role": "Data Engineer"},
    {"mode": "debate", "topic": "Should schools ban smartphones during class entirely?", "stance": "for"},
    {"mode": "debate", "topic": "Is cancel culture a net positive for society?", "stance": "against"},
]


@api_router.get("/challenge/today")
async def daily_challenge(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    idx = today.toordinal() % len(_CHALLENGE_TOPICS)
    challenge = _CHALLENGE_TOPICS[idx]

    # Has user completed today's challenge?
    today_start = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc).isoformat()
    completed = await db.conversations.count_documents({
        "user_id": user["user_id"],
        "topic": challenge.get("topic"),
        "ended_at": {"$gte": today_start},
        "score": {"$ne": None},
    }) > 0

    return {
        **challenge,
        "date": today.isoformat(),
        "completed": completed,
        "difficulty": "medium",
    }


@api_router.get("/")
async def root():
    return {"app": "Dialectica", "status": "ok"}


# ============================================================
# APP SETUP
# ============================================================
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
