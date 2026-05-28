import pytest
from httpx import AsyncClient

from app.models.profile import CandidateProfile


@pytest.mark.asyncio
async def test_register_creates_user_and_profile(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "full_name": "New User",
            "password": "securepassword1",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "newuser@example.com"
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email_rejected(client: AsyncClient):
    payload = {
        "email": "duplicate@example.com",
        "full_name": "Dup User",
        "password": "securepassword1",
    }
    await client.post("/api/auth/register", json=payload)
    resp = await client.post("/api/auth/register", json=payload)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login_returns_token(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={"email": "login@example.com", "full_name": "Login User", "password": "mypassword1"},
    )
    resp = await client.post(
        "/api/auth/login",
        data={"username": "login@example.com", "password": "mypassword1"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_get_profile_requires_auth(client: AsyncClient):
    resp = await client.get("/api/profile/")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_profile_persists_data(
    client: AsyncClient, auth_headers: dict, db_session, test_user
):
    # Ensure profile exists
    profile = CandidateProfile(user_id=test_user.id)
    db_session.add(profile)
    await db_session.flush()

    payload = {
        "phone": "+61 400 000 000",
        "location_suburb": "Fitzroy",
        "location_state": "VIC",
        "technical_skills": ["Python", "FastAPI", "Docker"],
        "seek_keywords": ["python developer"],
        "seek_locations": ["Melbourne-VIC-3000"],
        "min_score_threshold": 70,
    }
    resp = await client.put("/api/profile/", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["phone"] == "+61 400 000 000"
    assert "Python" in data["technical_skills"]
    assert data["min_score_threshold"] == 70


@pytest.mark.asyncio
async def test_update_profile_invalid_work_type_rejected(
    client: AsyncClient, auth_headers: dict, db_session, test_user
):
    profile = CandidateProfile(user_id=test_user.id)
    db_session.add(profile)
    await db_session.flush()

    resp = await client.put(
        "/api/profile/",
        json={"work_type": "freelance"},  # invalid
        headers=auth_headers,
    )
    assert resp.status_code == 422
