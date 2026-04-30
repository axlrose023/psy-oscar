import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestMyProfileRoutes:
    async def test_psychologist_can_create_own_course_via_me_route(
        self,
        client: AsyncClient,
        authenticated_psychologist: dict,
    ):
        headers = {
            "Authorization": f"Bearer {authenticated_psychologist['access_token']}"
        }
        payload = {
            "institution": "Training Center",
            "completion_date": "2026-04-24",
            "topic": "Profile routing",
            "ect_hours": 3,
        }

        resp = await client.post("/users/me/courses", json=payload, headers=headers)

        assert resp.status_code == 201
        data = resp.json()
        assert data["institution"] == payload["institution"]
        assert data["completion_date"] == payload["completion_date"]
        assert data["topic"] == payload["topic"]
        assert data["ect_hours"] == payload["ect_hours"]
