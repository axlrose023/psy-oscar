import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestGetUsers:
    endpoint = "/users"

    async def test_get_users_success_admin(
        self,
        client: AsyncClient,
        authenticated_user: dict,
    ):
        access_token = authenticated_user["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        resp = await client.get(
            self.endpoint, headers=headers, params={"page": 1, "page_size": 10}
        )

        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "items" in data
        assert "page" in data
        assert "page_size" in data

    async def test_get_users_success_psychologist(
        self,
        client: AsyncClient,
        authenticated_psychologist: dict,
    ):
        access_token = authenticated_psychologist["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        resp = await client.get(
            self.endpoint, headers=headers, params={"page": 1, "page_size": 10}
        )

        assert resp.status_code == 200

    async def test_get_users_forbidden_respondent(
        self,
        client: AsyncClient,
        authenticated_respondent: dict,
    ):
        access_token = authenticated_respondent["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        resp = await client.get(
            self.endpoint, headers=headers, params={"page": 1, "page_size": 10}
        )

        assert resp.status_code == 403

    async def test_get_users_unauthorized(
        self,
        client: AsyncClient,
    ):
        resp = await client.get(self.endpoint, params={"page": 1, "page_size": 10})

        assert resp.status_code == 401
