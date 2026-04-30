import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestTaskCreationPermissions:
    async def test_psychologist_can_create_own_task(
        self,
        client: AsyncClient,
        authenticated_psychologist: dict,
        psychologist_user,
    ):
        headers = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}

        resp = await client.post(
            "/tasks",
            json={"title": "Psychologist created task"},
            headers=headers,
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["created_by"]["id"] == str(psychologist_user.id)
        assert data["assignees"][0]["user"]["id"] == str(psychologist_user.id)

    async def test_psychologist_can_create_subtask_for_accessible_task(
        self,
        client: AsyncClient,
        authenticated_user: dict,
        authenticated_psychologist: dict,
        psychologist_user,
    ):
        admin_headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        psych_headers = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}
        parent = await client.post(
            "/tasks",
            json={
                "title": "Parent task",
                "assigned_to_ids": [str(psychologist_user.id)],
            },
            headers=admin_headers,
        )
        assert parent.status_code == 201

        resp = await client.post(
            "/tasks",
            json={
                "title": "Psychologist subtask",
                "parent_task_id": parent.json()["id"],
            },
            headers=psych_headers,
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["parent_task_id"] == parent.json()["id"]
        assert data["created_by"]["id"] == str(psychologist_user.id)

    async def test_psychologist_cannot_assign_new_task_to_others(
        self,
        client: AsyncClient,
        authenticated_psychologist: dict,
        user,
    ):
        headers = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}

        resp = await client.post(
            "/tasks",
            json={
                "title": "Invalid assignment",
                "assigned_to_ids": [str(user.id)],
            },
            headers=headers,
        )

        assert resp.status_code == 403
