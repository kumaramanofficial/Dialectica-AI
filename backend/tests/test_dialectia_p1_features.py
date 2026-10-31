"""Iteration 2: tests for NEW P1 features.

Covers:
- GET /api/stats (new shape: streak, best_score, last_active_date) on fresh user
- GET /api/challenge/today
- GET /api/leaderboard (empty + after one ended session)
- POST /api/voice/speak (combined endpoint) — multipart, headers, persistence
- Streak / best_score / total_score updates on /api/conversation/{id}/end
- Voice/speak unauth + 404 invalid conv

Minimises LLM calls: 1 conversation start + 1 voice/speak (which internally does
STT + Gemini + TTS) + 1 conversation end. We reuse a small TTS audio for STT.
"""
import os
import io
import base64
import uuid
import time
import requests
import pytest

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://voice-debate-hub.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"
TIMEOUT = 120


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def fresh_user():
    email = f"TEST_{uuid.uuid4().hex[:10]}@example.com"
    r = requests.post(
        f"{API}/auth/signup",
        json={"email": email, "password": "Pass1234!", "name": "TEST P1"},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    yield {"email": email, "token": data["token"], "user": data["user"]}
    # cleanup
    try:
        requests.delete(
            f"{API}/auth/profile",
            headers={"Authorization": f"Bearer {data['token']}"},
            timeout=TIMEOUT,
        )
    except Exception:
        pass


def H(token):
    return {"Authorization": f"Bearer {token}"}


# =====================================================================
# 1. NEW USER STATS — must show NO score for brand-new user
# =====================================================================
class TestStatsNewUser:
    def test_stats_brand_new_user_shape(self, fresh_user):
        r = requests.get(f"{API}/stats", headers=H(fresh_user["token"]), timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        s = r.json()
        # Must contain new keys
        for k in ("last_score", "avg_score", "best_score", "total_sessions",
                  "history", "streak", "last_active_date"):
            assert k in s, f"missing key {k}"
        # New user => everything null/0/empty
        assert s["last_score"] is None, f"expected None last_score, got {s['last_score']}"
        assert s["avg_score"] is None
        assert s["best_score"] is None, f"expected None best_score, got {s['best_score']}"
        assert s["total_sessions"] == 0
        assert s["streak"] == 0
        assert s["history"] == []


# =====================================================================
# 2. DAILY CHALLENGE
# =====================================================================
class TestDailyChallenge:
    def test_challenge_today_shape(self, fresh_user):
        r = requests.get(f"{API}/challenge/today", headers=H(fresh_user["token"]), timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        c = r.json()
        for k in ("mode", "topic", "date", "completed", "difficulty"):
            assert k in c, f"missing key {k} in {c}"
        assert c["mode"] in ("debate", "interview")
        assert c["completed"] is False  # new user has not completed
        assert c["difficulty"] == "medium"
        # mode-specific keys
        if c["mode"] == "debate":
            assert "stance" in c and c["stance"] in ("for", "against")
        else:
            assert "role" in c and isinstance(c["role"], str)

    def test_challenge_unauth(self):
        r = requests.get(f"{API}/challenge/today", timeout=TIMEOUT)
        assert r.status_code == 401


# =====================================================================
# 3. LEADERBOARD - empty for fresh user
# =====================================================================
class TestLeaderboardEmpty:
    def test_leaderboard_shape_for_fresh_user(self, fresh_user):
        r = requests.get(f"{API}/leaderboard", headers=H(fresh_user["token"]), timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        b = r.json()
        for k in ("top", "me_rank", "me"):
            assert k in b
        assert isinstance(b["top"], list)
        assert isinstance(b["me_rank"], int)
        assert b["me_rank"] >= 1
        assert b["me"] is not None
        # me must contain expected keys
        for k in ("user_id", "name", "best_score", "sessions_completed", "streak"):
            assert k in b["me"], f"missing {k} in me={b['me']}"

    def test_leaderboard_unauth(self):
        r = requests.get(f"{API}/leaderboard", timeout=TIMEOUT)
        assert r.status_code == 401


# =====================================================================
# 4. STREAK / BEST_SCORE update via /conversation/{id}/end
# =====================================================================
class TestStreakAndScoreUpdates:
    """Start one conversation, end it twice on same day (should keep streak=1)."""

    def test_full_flow_end_updates_user(self, fresh_user):
        token = fresh_user["token"]
        # 1. Start conversation
        r = requests.post(
            f"{API}/conversation/start",
            headers=H(token),
            json={"mode": "debate", "topic": "TEST_Streak topic", "stance": "for", "difficulty": "easy"},
            timeout=TIMEOUT,
        )
        if r.status_code in (502, 503):
            pytest.skip(f"LLM unavailable: {r.text}")
        assert r.status_code == 200, r.text
        cid = r.json()["conversation_id"]
        pytest.p1_conv_id = cid

        # 2. End first time
        r = requests.post(
            f"{API}/conversation/{cid}/end",
            headers=H(token), timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        analysis = r.json()
        assert "score" in analysis

        # 3. /api/stats should now reflect best_score, streak=1, last_score
        r = requests.get(f"{API}/stats", headers=H(token), timeout=TIMEOUT)
        assert r.status_code == 200
        s = r.json()
        assert s["total_sessions"] >= 1, f"stats={s}"
        assert s["last_score"] is not None, f"stats={s}"
        assert s["best_score"] is not None, (
            f"BUG: end_conversation did NOT update user.best_score. stats={s}"
        )
        assert s["streak"] == 1, (
            f"BUG: end_conversation did NOT set streak=1. stats={s}"
        )

        # 4. End again same day -> streak should still be 1
        r2 = requests.post(
            f"{API}/conversation/{cid}/end",
            headers=H(token), timeout=TIMEOUT,
        )
        assert r2.status_code == 200, r2.text
        r = requests.get(f"{API}/stats", headers=H(token), timeout=TIMEOUT)
        s2 = r.json()
        assert s2["streak"] == 1, f"streak must remain 1 on same-day repeat, got {s2['streak']}"

    def test_leaderboard_includes_user_after_end(self, fresh_user):
        if not getattr(pytest, "p1_conv_id", None):
            pytest.skip("conversation flow skipped")
        r = requests.get(f"{API}/leaderboard", headers=H(fresh_user["token"]), timeout=TIMEOUT)
        assert r.status_code == 200
        b = r.json()
        my_id = fresh_user["user"]["user_id"]
        ids = [u.get("user_id") for u in b["top"]]
        assert my_id in ids, f"user not in leaderboard top after ended session. top user_ids={ids}"
        my_entry = next(u for u in b["top"] if u["user_id"] == my_id)
        assert my_entry.get("best_score") is not None


# =====================================================================
# 5. VOICE/SPEAK (combined endpoint)
# =====================================================================
class TestVoiceSpeak:
    def test_speak_unauth(self):
        files = {"file": ("a.mp3", io.BytesIO(b"\x00" * 100), "audio/mpeg")}
        r = requests.post(
            f"{API}/voice/speak",
            data={"conversation_id": "xx", "voice": "nova"},
            files=files, timeout=TIMEOUT,
        )
        assert r.status_code == 401

    def test_speak_invalid_conv_404(self, fresh_user):
        # Need real audio bytes — generate via /voice/tts first
        rr = requests.post(
            f"{API}/voice/tts",
            headers=H(fresh_user["token"]),
            json={"text": "hello"}, timeout=TIMEOUT,
        )
        if rr.status_code in (502, 503):
            pytest.skip(f"TTS unavailable: {rr.text}")
        assert rr.status_code == 200
        audio = rr.content
        files = {"file": ("a.mp3", io.BytesIO(audio), "audio/mpeg")}
        r = requests.post(
            f"{API}/voice/speak",
            headers=H(fresh_user["token"]),
            data={"conversation_id": "conv_doesnotexist123", "voice": "nova"},
            files=files, timeout=TIMEOUT,
        )
        assert r.status_code == 404, r.text

    def test_speak_full_flow(self, fresh_user):
        cid = getattr(pytest, "p1_conv_id", None)
        if not cid:
            pytest.skip("no conversation available")
        # Get TTS audio for STT input
        rr = requests.post(
            f"{API}/voice/tts",
            headers=H(fresh_user["token"]),
            json={"text": "I strongly believe AI cannot replace teachers because empathy matters."},
            timeout=TIMEOUT,
        )
        if rr.status_code in (502, 503):
            pytest.skip(f"TTS unavailable: {rr.text}")
        assert rr.status_code == 200
        audio = rr.content
        assert len(audio) > 500

        files = {"file": ("a.mp3", io.BytesIO(audio), "audio/mpeg")}
        r = requests.post(
            f"{API}/voice/speak",
            headers=H(fresh_user["token"]),
            data={"conversation_id": cid, "voice": "nova"},
            files=files, timeout=TIMEOUT,
        )
        if r.status_code in (502, 503):
            pytest.skip(f"AI unavailable: {r.text}")
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        # MP3 returned
        assert "audio/mpeg" in r.headers.get("content-type", ""), r.headers
        assert len(r.content) > 500
        # Headers
        x_user = r.headers.get("x-user-text") or r.headers.get("X-User-Text")
        x_ai = r.headers.get("x-ai-text") or r.headers.get("X-AI-Text")
        expose = r.headers.get("access-control-expose-headers", "")
        assert x_user, f"missing X-User-Text header. headers={dict(r.headers)}"
        assert x_ai, f"missing X-AI-Text header. headers={dict(r.headers)}"
        assert "X-User-Text" in expose and "X-AI-Text" in expose, f"expose hdr={expose}"
        # base64 decodable
        u_text = base64.b64decode(x_user).decode("utf-8")
        a_text = base64.b64decode(x_ai).decode("utf-8")
        assert len(u_text) > 0
        assert len(a_text) > 0

        # Verify both messages persisted in conversation
        rr = requests.get(f"{API}/conversation/{cid}",
                          headers=H(fresh_user["token"]), timeout=TIMEOUT)
        assert rr.status_code == 200
        msgs = rr.json()["messages"]
        # Find the latest user + assistant pair
        roles = [m["role"] for m in msgs[-2:]]
        assert "user" in roles and "assistant" in roles, f"last 2 msgs roles={roles}"
