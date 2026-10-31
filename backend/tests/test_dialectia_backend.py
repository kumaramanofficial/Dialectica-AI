"""Dialectia backend end-to-end pytest suite.

Covers: auth (signup/login/me/profile/logout), conversation lifecycle (start/continue/end/list/get/delete),
voice (TTS + Whisper STT roundtrip), stats, and protected-endpoint auth enforcement.
"""
import os
import io
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://voice-debate-hub.preview.emergentagent.com").rstrip("/")
# When running inside container the frontend env may not be loaded; allow override via REACT_APP_BACKEND_URL,
# else fall back to local frontend env file.
if "voice-debate-hub" not in BASE_URL and "preview.emergentagent.com" not in BASE_URL:
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"
TIMEOUT = 90  # Gemini calls can be slow


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def existing_user_token(http):
    """Login as the seeded alice@test.com user."""
    r = http.post(f"{API}/auth/login", json={"email": "alice@test.com", "password": "test1234"}, timeout=TIMEOUT)
    assert r.status_code == 200, f"Seeded user login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def fresh_user(http):
    """Create a brand-new user for isolated CRUD/conversation tests."""
    email = f"TEST_{uuid.uuid4().hex[:10]}@example.com"
    payload = {"email": email, "password": "Pass1234!", "name": "TEST User"}
    r = http.post(f"{API}/auth/signup", json=payload, timeout=TIMEOUT)
    assert r.status_code == 200, f"Signup failed: {r.status_code} {r.text}"
    data = r.json()
    return {"email": email, "password": "Pass1234!", "token": data["token"], "user": data["user"]}


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Auth ----------
class TestAuth:
    def test_signup_returns_token_and_no_id_leak(self, fresh_user):
        assert "token" in fresh_user and len(fresh_user["token"]) > 20
        u = fresh_user["user"]
        assert u["email"] == fresh_user["email"]
        assert u["auth_provider"] == "email"
        assert "_id" not in u
        assert "password_hash" not in u
        assert u["user_id"].startswith("user_")

    def test_signup_duplicate_email_rejected(self, http, fresh_user):
        r = http.post(f"{API}/auth/signup",
                      json={"email": fresh_user["email"], "password": "x", "name": "X"},
                      timeout=TIMEOUT)
        assert r.status_code == 400

    def test_login_invalid_credentials(self, http):
        r = http.post(f"{API}/auth/login",
                      json={"email": "alice@test.com", "password": "WRONG"}, timeout=TIMEOUT)
        assert r.status_code == 401

    def test_login_seeded_user(self, existing_user_token):
        assert isinstance(existing_user_token, str) and len(existing_user_token) > 20

    def test_me_with_jwt(self, http, fresh_user):
        r = http.get(f"{API}/auth/me", headers=auth_headers(fresh_user["token"]), timeout=TIMEOUT)
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == fresh_user["email"]
        assert "_id" not in body
        assert "password_hash" not in body

    def test_me_without_auth(self, http):
        r = http.get(f"{API}/auth/me", timeout=TIMEOUT)
        assert r.status_code == 401

    def test_me_with_bad_token(self, http):
        r = http.get(f"{API}/auth/me", headers={"Authorization": "Bearer junkjunkjunk"}, timeout=TIMEOUT)
        assert r.status_code == 401

    def test_update_profile_persists(self, http, fresh_user):
        r = http.put(f"{API}/auth/profile",
                     headers=auth_headers(fresh_user["token"]),
                     json={"name": "Updated Name", "bio": "Hi I am test", "picture": "https://example.com/p.png"},
                     timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["name"] == "Updated Name"
        assert body["bio"] == "Hi I am test"
        assert body["picture"] == "https://example.com/p.png"
        assert "_id" not in body
        # GET me to verify persistence
        me = http.get(f"{API}/auth/me", headers=auth_headers(fresh_user["token"]), timeout=TIMEOUT).json()
        assert me["name"] == "Updated Name"
        assert me["bio"] == "Hi I am test"

    def test_logout_returns_ok(self, http, fresh_user):
        r = http.post(f"{API}/auth/logout", headers=auth_headers(fresh_user["token"]), timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- Conversation ----------
class TestConversation:
    def test_start_debate_returns_ai_text(self, http, fresh_user):
        r = http.post(f"{API}/conversation/start",
                      headers=auth_headers(fresh_user["token"]),
                      json={"mode": "debate", "topic": "Should AI replace teachers?",
                            "stance": "for", "difficulty": "medium"},
                      timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["mode"] == "debate"
        assert data["topic"] == "Should AI replace teachers?"
        assert isinstance(data["ai_text"], str) and len(data["ai_text"]) > 5
        assert data["conversation_id"].startswith("conv_")
        # store on the fixture object for chained tests
        pytest.debate_conv_id = data["conversation_id"]

    def test_start_interview_with_role(self, http, fresh_user):
        r = http.post(f"{API}/conversation/start",
                      headers=auth_headers(fresh_user["token"]),
                      json={"mode": "interview", "topic": "Backend systems",
                            "role": "Software Engineer", "difficulty": "medium"},
                      timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["mode"] == "interview"
        assert isinstance(data["ai_text"], str) and len(data["ai_text"]) > 5
        pytest.interview_conv_id = data["conversation_id"]

    def test_continue_conversation(self, http, fresh_user):
        cid = getattr(pytest, "debate_conv_id", None)
        assert cid, "debate conversation must be created first"
        r = http.post(f"{API}/conversation/continue",
                      headers=auth_headers(fresh_user["token"]),
                      json={"conversation_id": cid,
                            "user_text": "I disagree, teachers provide social skills no AI can replace."},
                      timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        assert isinstance(r.json()["ai_text"], str) and len(r.json()["ai_text"]) > 5

    def test_continue_unauthenticated(self, http):
        r = http.post(f"{API}/conversation/continue",
                      json={"conversation_id": "x", "user_text": "y"}, timeout=TIMEOUT)
        assert r.status_code == 401

    def test_list_conversations(self, http, fresh_user):
        r = http.get(f"{API}/conversations", headers=auth_headers(fresh_user["token"]), timeout=TIMEOUT)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 2
        for it in items:
            assert "_id" not in it
            assert "system_prompt" not in it  # excluded
            assert it["user_id"] == fresh_user["user"]["user_id"]

    def test_get_single_conversation(self, http, fresh_user):
        cid = pytest.debate_conv_id
        r = http.get(f"{API}/conversation/{cid}", headers=auth_headers(fresh_user["token"]), timeout=TIMEOUT)
        assert r.status_code == 200
        body = r.json()
        assert body["conversation_id"] == cid
        assert "_id" not in body
        assert isinstance(body["messages"], list) and len(body["messages"]) >= 3  # opening + 1 user + 1 ai

    def test_get_other_users_conversation_404(self, http, existing_user_token):
        cid = pytest.debate_conv_id
        r = http.get(f"{API}/conversation/{cid}", headers=auth_headers(existing_user_token), timeout=TIMEOUT)
        assert r.status_code == 404

    def test_end_conversation_returns_analysis(self, http, fresh_user):
        cid = pytest.debate_conv_id
        r = http.post(f"{API}/conversation/{cid}/end",
                      headers=auth_headers(fresh_user["token"]), timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        a = r.json()
        for k in ("score", "tone", "clarity", "pacing", "engagement", "filler_words",
                  "strengths", "improvements", "summary"):
            assert k in a, f"missing key {k} in analysis: {a}"
        assert isinstance(a["score"], (int, float))
        assert 0 <= a["score"] <= 10
        assert isinstance(a["strengths"], list)
        assert isinstance(a["improvements"], list)

    def test_delete_conversation(self, http, fresh_user):
        cid = pytest.interview_conv_id
        r = http.delete(f"{API}/conversation/{cid}",
                        headers=auth_headers(fresh_user["token"]), timeout=TIMEOUT)
        assert r.status_code == 200
        # verify gone
        r2 = http.get(f"{API}/conversation/{cid}",
                      headers=auth_headers(fresh_user["token"]), timeout=TIMEOUT)
        assert r2.status_code == 404


# ---------- Voice ----------
class TestVoice:
    def test_tts_returns_mp3_bytes(self, http, fresh_user):
        r = http.post(f"{API}/voice/tts",
                      headers=auth_headers(fresh_user["token"]),
                      json={"text": "Hello"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        assert "audio/mpeg" in r.headers.get("content-type", "")
        assert len(r.content) > 500
        # store for transcribe test
        pytest.tts_audio = r.content

    def test_transcribe_with_tts_audio(self, http, fresh_user):
        audio = getattr(pytest, "tts_audio", None)
        assert audio, "TTS must run first"
        files = {"file": ("audio.mp3", io.BytesIO(audio), "audio/mpeg")}
        r = requests.post(f"{API}/voice/transcribe",
                          headers={"Authorization": f"Bearer {fresh_user['token']}"},
                          files=files, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "text" in body
        assert isinstance(body["text"], str)

    def test_tts_unauth(self, http):
        r = http.post(f"{API}/voice/tts", json={"text": "hi"}, timeout=TIMEOUT)
        assert r.status_code == 401


# ---------- Stats ----------
class TestStats:
    def test_stats_after_session_end(self, http, fresh_user):
        r = http.get(f"{API}/stats", headers=auth_headers(fresh_user["token"]), timeout=TIMEOUT)
        assert r.status_code == 200
        s = r.json()
        for k in ("last_score", "avg_score", "total_sessions", "history"):
            assert k in s
        # We ended one debate conversation -> total_sessions >= 1
        assert s["total_sessions"] >= 1
        assert s["last_score"] is not None
        assert isinstance(s["history"], list)

    def test_stats_unauth(self, http):
        r = http.get(f"{API}/stats", timeout=TIMEOUT)
        assert r.status_code == 401


# ---------- Protected endpoints reject unauth ----------
class TestAuthEnforcement:
    @pytest.mark.parametrize("method,path,body", [
        ("get", "/auth/me", None),
        ("put", "/auth/profile", {"name": "x"}),
        ("delete", "/auth/profile", None),
        ("post", "/conversation/start", {"mode": "debate", "topic": "x"}),
        ("get", "/conversations", None),
        ("get", "/stats", None),
    ])
    def test_requires_auth(self, http, method, path, body):
        fn = getattr(http, method)
        r = fn(f"{API}{path}", json=body, timeout=TIMEOUT) if body else fn(f"{API}{path}", timeout=TIMEOUT)
        assert r.status_code == 401, f"{method.upper()} {path} expected 401 got {r.status_code}"


# ---------- Cleanup: delete fresh user (must run last) ----------
class TestZCleanup:
    def test_delete_profile_cleans_up(self, http, fresh_user):
        r = http.delete(f"{API}/auth/profile", headers=auth_headers(fresh_user["token"]), timeout=TIMEOUT)
        assert r.status_code == 200
        # auth/me should now fail (user deleted)
        r2 = http.get(f"{API}/auth/me", headers=auth_headers(fresh_user["token"]), timeout=TIMEOUT)
        assert r2.status_code == 401
