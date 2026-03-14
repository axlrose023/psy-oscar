import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestGetUserById:
    endpoint = "/users"

    async def test_get_user_by_id_success(
        self,
        client: AsyncClient,
        authenticated_user: dict,
        user,
    ):
        access_token = authenticated_user["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        resp = await client.get(f"{self.endpoint}/{user.id}", headers=headers)

        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(user.id)
        assert data["username"] == user.username
        assert data["role"] == user.role.value

    async def test_get_user_by_id_psychologist(
        self,
        client: AsyncClient,
        authenticated_psychologist: dict,
        user,
    ):
        access_token = authenticated_psychologist["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        resp = await client.get(f"{self.endpoint}/{user.id}", headers=headers)

        assert resp.status_code == 200

    async def test_get_user_by_id_forbidden_respondent(
        self,
        client: AsyncClient,
        authenticated_respondent: dict,
        user,
    ):
        access_token = authenticated_respondent["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        resp = await client.get(f"{self.endpoint}/{user.id}", headers=headers)

        assert resp.status_code == 403

    async def test_get_user_by_id_not_found(
        self,
        client: AsyncClient,
        authenticated_user: dict,
    ):
        access_token = authenticated_user["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        fake_id = uuid.uuid4()
        resp = await client.get(f"{self.endpoint}/{fake_id}", headers=headers)

        assert resp.status_code == 404

    async def test_get_user_by_id_unauthorized(
        self,
        client: AsyncClient,
        user,
    ):
        resp = await client.get(f"{self.endpoint}/{user.id}")

        assert resp.status_code == 401
