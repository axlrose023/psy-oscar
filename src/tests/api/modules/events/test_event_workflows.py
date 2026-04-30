from uuid import uuid4

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestEventWorkflows:
    async def test_admin_can_assign_event_to_psychologist_and_only_assignee_sees_it(
        self,
        client: AsyncClient,
        authenticated_user: dict,
        authenticated_psychologist: dict,
        psychologist_user,
    ):
        admin_headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        psych_headers = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}
        other_username = f"psych_event_visibility_{uuid4().hex[:8]}"

        other_resp = await client.post(
            "/users",
            json={
                "username": other_username,
                "password": "psych123",
                "role": "psychologist",
            },
            headers=admin_headers,
        )
        assert other_resp.status_code == 201
        other_id = other_resp.json()["id"]

        other_login = await client.post(
            "/auth/login",
            json={"username": other_username, "password": "psych123"},
        )
        assert other_login.status_code == 200
        other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

        event_resp = await client.post(
            "/events",
            json={
                "date": "2026-05-04",
                "activity_type": "aid",
                "content": "Індивідуальна консультація",
                "status": "planned",
                "psychologist_id": str(psychologist_user.id),
            },
            headers=admin_headers,
        )
        assert event_resp.status_code == 201
        event_id = event_resp.json()["id"]
        assert event_resp.json()["psychologist"]["id"] == str(psychologist_user.id)
        assert {a["user"]["id"] for a in event_resp.json()["assignees"]} == {
            str(psychologist_user.id)
        }

        assigned_list = await client.get(
            "/events",
            params={"date__gte": "2026-05-04", "date__lte": "2026-05-04"},
            headers=psych_headers,
        )
        assert assigned_list.status_code == 200
        assert event_id in {item["id"] for item in assigned_list.json()["items"]}

        other_list = await client.get(
            "/events",
            params={"date__gte": "2026-05-04", "date__lte": "2026-05-04"},
            headers=other_headers,
        )
        assert other_list.status_code == 200
        assert event_id not in {item["id"] for item in other_list.json()["items"]}
        assert (await client.get(f"/events/{event_id}", headers=other_headers)).status_code == 403
        assert (await client.get(f"/events/{event_id}/history", headers=other_headers)).status_code == 403

        reassigned = await client.patch(
            f"/events/{event_id}",
            json={"psychologist_ids": [str(psychologist_user.id), other_id]},
            headers=admin_headers,
        )
        assert reassigned.status_code == 200
        assert reassigned.json()["psychologist"]["id"] == str(psychologist_user.id)
        assert {a["user"]["id"] for a in reassigned.json()["assignees"]} == {
            str(psychologist_user.id),
            other_id,
        }

        other_after_reassign = await client.get(
            "/events",
            params={"date__gte": "2026-05-04", "date__lte": "2026-05-04"},
            headers=other_headers,
        )
        assert other_after_reassign.status_code == 200
        assert event_id in {item["id"] for item in other_after_reassign.json()["items"]}

    async def test_psychologist_cannot_create_event_for_another_user(
        self,
        client: AsyncClient,
        authenticated_user: dict,
        authenticated_psychologist: dict,
    ):
        admin_headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        psych_headers = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}
        other_username = f"psych_event_forbidden_{uuid4().hex[:8]}"

        other_resp = await client.post(
            "/users",
            json={
                "username": other_username,
                "password": "psych123",
                "role": "psychologist",
            },
            headers=admin_headers,
        )
        assert other_resp.status_code == 201

        resp = await client.post(
            "/events",
            json={
                "date": "2026-05-05",
                "activity_type": "aid",
                "content": "Чужий захід",
                "status": "planned",
                "psychologist_id": other_resp.json()["id"],
            },
            headers=psych_headers,
        )

        assert resp.status_code == 403

    async def test_can_link_existing_event_to_task(
        self,
        client: AsyncClient,
        authenticated_user: dict,
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}

        task_resp = await client.post(
            "/tasks",
            json={"title": "Event link target"},
            headers=headers,
        )
        assert task_resp.status_code == 201
        task_id = task_resp.json()["id"]

        event_resp = await client.post(
            "/events",
            json={
                "date": "2026-05-01",
                "activity_type": "aid",
                "content": "Event to link",
                "status": "planned",
            },
            headers=headers,
        )
        assert event_resp.status_code == 201
        event_id = event_resp.json()["id"]

        link_resp = await client.patch(
            f"/events/{event_id}",
            json={"task_id": task_id},
            headers=headers,
        )

        assert link_resp.status_code == 200
        assert link_resp.json()["task_id"] == task_id

    async def test_can_complete_postponed_event(
        self,
        client: AsyncClient,
        authenticated_user: dict,
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}

        event_resp = await client.post(
            "/events",
            json={
                "date": "2026-05-02",
                "activity_type": "aid",
                "content": "Postponed event",
                "status": "planned",
            },
            headers=headers,
        )
        assert event_resp.status_code == 201
        event_id = event_resp.json()["id"]

        postpone_resp = await client.post(
            f"/events/{event_id}/postpone",
            json={"reason": "Schedule changed", "new_date": "2026-05-03"},
            headers=headers,
        )
        assert postpone_resp.status_code == 200
        assert postpone_resp.json()["status"] == "postponed"

        complete_resp = await client.post(
            f"/events/{event_id}/complete",
            json={"result": "Done", "actual_count": 1},
            headers=headers,
        )

        assert complete_resp.status_code == 200
        assert complete_resp.json()["status"] == "completed"
        assert complete_resp.json()["result"] == "Done"
        assert complete_resp.json()["actual_count"] == 1
