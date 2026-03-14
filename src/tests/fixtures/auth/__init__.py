import pytest_asyncio
from httpx import AsyncClient

from tests.fixtures.users.admin import psychologist_user, respondent_user, user


@pytest_asyncio.fixture
async def authenticated_user(
    client: AsyncClient,
    user,  # noqa: F811
) -> dict:
    """Authenticate admin user and return tokens."""
    resp = await client.post("/auth/login", json={"username": user.username, "password": "admin123"})
    assert resp.status_code == 200
    return resp.json()


@pytest_asyncio.fixture
async def authenticated_psychologist(
    client: AsyncClient,
    psychologist_user,  # noqa: F811
) -> dict:
    """Authenticate psychologist user and return tokens."""
    resp = await client.post("/auth/login", json={"username": psychologist_user.username, "password": "psych123"})
    assert resp.status_code == 200
    return resp.json()


@pytest_asyncio.fixture
async def authenticated_respondent(
    client: AsyncClient,
    respondent_user,  # noqa: F811
) -> dict:
    """Authenticate respondent user and return tokens."""
    resp = await client.post("/auth/login", json={"username": respondent_user.username, "password": "resp123"})
    assert resp.status_code == 200
    return resp.json()
