import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestTaskFilters:
    async def test_filter_tasks_by_multiple_statuses(
        self,
        client: AsyncClient,
        authenticated_user: dict,
        psychologist_user,
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}

        created = await client.post(
            "/tasks",
            json={"title": "status-filter-created"},
            headers=headers,
        )
        assigned = await client.post(
            "/tasks",
            json={
                "title": "status-filter-assigned",
                "assigned_to_ids": [str(psychologist_user.id)],
            },
            headers=headers,
        )
        completed = await client.post(
            "/tasks",
            json={"title": "status-filter-completed"},
            headers=headers,
        )

        assert created.status_code == 201
        assert assigned.status_code == 201
        assert completed.status_code == 201

        completed_id = completed.json()["id"]
        done = await client.patch(
            f"/tasks/{completed_id}",
            json={"status": "completed"},
            headers=headers,
        )
        assert done.status_code == 200

        resp = await client.get(
            "/tasks",
            params=[
                ("title__search", "status-filter-"),
                ("status__in", "assigned"),
                ("status__in", "completed"),
                ("page_size", "20"),
            ],
            headers=headers,
        )

        assert resp.status_code == 200
        items = resp.json()["items"]
        titles = {item["title"] for item in items}
        statuses = {item["status"] for item in items}
        assert titles == {"status-filter-assigned", "status-filter-completed"}
        assert statuses == {"assigned", "completed"}
