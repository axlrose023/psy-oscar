import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestCreateUser:
    endpoint = "/users"

    async def test_create_user_success(
        self,
        client: AsyncClient,
        authenticated_user: dict,
    ):
        access_token = authenticated_user["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        payload = {
            "username": "testuser",
            "password": "testpass123",
            "role": "psychologist",
        }

        resp = await client.post(self.endpoint, json=payload, headers=headers)

        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data
        assert data["username"] == "testuser"
        assert data["role"] == "psychologist"

    async def test_create_user_default_role(
        self,
        client: AsyncClient,
        authenticated_user: dict,
    ):
        access_token = authenticated_user["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        payload = {
            "username": "testuser_default",
            "password": "testpass123",
        }

        resp = await client.post(self.endpoint, json=payload, headers=headers)

        assert resp.status_code == 201
        data = resp.json()
        assert data["role"] == "respondent"

    async def test_create_user_unauthorized(
        self,
        client: AsyncClient,
    ):
        payload = {
            "username": "testuser2",
            "password": "testpass123",
        }

        resp = await client.post(self.endpoint, json=payload)

        assert resp.status_code == 401

    async def test_create_user_forbidden_psychologist(
        self,
        client: AsyncClient,
        authenticated_psychologist: dict,
    ):
        access_token = authenticated_psychologist["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        payload = {
            "username": "testuser3",
            "password": "testpass123",
        }

        resp = await client.post(self.endpoint, json=payload, headers=headers)

        assert resp.status_code == 403

    async def test_create_user_forbidden_respondent(
        self,
        client: AsyncClient,
        authenticated_respondent: dict,
    ):
        access_token = authenticated_respondent["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        payload = {
            "username": "testuser4",
            "password": "testpass123",
        }

        resp = await client.post(self.endpoint, json=payload, headers=headers)

        assert resp.status_code == 403

    async def test_create_user_empty_username(
        self,
        client: AsyncClient,
        authenticated_user: dict,
    ):
        access_token = authenticated_user["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        payload = {
            "username": "",
            "password": "testpass123",
        }

        resp = await client.post(self.endpoint, json=payload, headers=headers)

        assert resp.status_code == 422

    async def test_create_user_empty_password(
        self,
        client: AsyncClient,
        authenticated_user: dict,
    ):
        access_token = authenticated_user["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        payload = {
            "username": "testuser5",
            "password": "",
        }

        resp = await client.post(self.endpoint, json=payload, headers=headers)

        assert resp.status_code == 422
