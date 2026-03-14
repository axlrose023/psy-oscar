import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestLogin:
    endpoint = "/auth/login"

    async def test_login_success(
        self,
        client: AsyncClient,
        user,
    ):
        resp = await client.post(
            self.endpoint,
            json={"username": user.username, "password": "admin123"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data

    async def test_login_wrong_password(
        self,
        client: AsyncClient,
        user,
    ):
        resp = await client.post(
            self.endpoint,
            json={"username": user.username, "password": "wrongpassword"},
        )

        assert resp.status_code == 401

    async def test_login_nonexistent_user(
        self,
        client: AsyncClient,
    ):
        resp = await client.post(
            self.endpoint,
            json={"username": "nonexistent", "password": "password"},
        )

        assert resp.status_code == 401

    async def test_login_missing_fields(
        self,
        client: AsyncClient,
    ):
        resp = await client.post(self.endpoint, json={})

        assert resp.status_code == 422
