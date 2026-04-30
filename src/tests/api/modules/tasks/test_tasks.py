import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestCreateTask:
    endpoint = "/tasks"

    async def test_create_task_success(
        self, client: AsyncClient, authenticated_user: dict
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        payload = {"title": "Test task", "description": "Do something"}

        resp = await client.post(self.endpoint, json=payload, headers=headers)

        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Test task"
        assert data["status"] == "created"
        assert data["assignees"] == []

    async def test_create_task_with_assignees(
        self, client: AsyncClient, authenticated_user: dict, psychologist_user
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        payload = {
            "title": "Assigned task",
            "assigned_to_ids": [str(psychologist_user.id)],
        }

        resp = await client.post(self.endpoint, json=payload, headers=headers)

        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "assigned"
        assert len(data["assignees"]) == 1
        assert data["assignees"][0]["user"]["id"] == str(psychologist_user.id)

    async def test_create_task_with_multiple_assignees(
        self, client: AsyncClient, authenticated_user: dict, psychologist_user
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        # create second psychologist
        resp = await client.post(
            "/users",
            json={"username": "psych_multi", "password": "pass123", "role": "psychologist"},
            headers=headers,
        )
        psych2_id = resp.json()["id"]

        payload = {
            "title": "Multi-assign",
            "assigned_to_ids": [str(psychologist_user.id), psych2_id],
        }

        resp = await client.post(self.endpoint, json=payload, headers=headers)

        assert resp.status_code == 201
        data = resp.json()
        assert len(data["assignees"]) == 2

    async def test_psychologist_can_create_own_task(
        self, client: AsyncClient, authenticated_psychologist: dict, psychologist_user
    ):
        headers = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}
        resp = await client.post(self.endpoint, json={"title": "Own task"}, headers=headers)

        assert resp.status_code == 201
        data = resp.json()
        assert data["created_by"]["id"] == str(psychologist_user.id)
        assert data["assignees"][0]["user"]["id"] == str(psychologist_user.id)

    async def test_create_task_unauthorized(self, client: AsyncClient):
        resp = await client.post(self.endpoint, json={"title": "No auth"})
        assert resp.status_code == 401


@pytest.mark.asyncio
class TestTaskAssignment:
    endpoint = "/tasks"

    async def test_assign_task(
        self, client: AsyncClient, authenticated_user: dict, psychologist_user
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        resp = await client.post(
            self.endpoint, json={"title": "Assign test"}, headers=headers
        )
        task_id = resp.json()["id"]

        resp = await client.post(
            f"{self.endpoint}/{task_id}/assign",
            json={"assigned_to_ids": [str(psychologist_user.id)]},
            headers=headers,
        )

        assert resp.status_code == 200
        assert resp.json()["status"] == "assigned"
        assert len(resp.json()["assignees"]) == 1

    async def test_unassign_task(
        self, client: AsyncClient, authenticated_user: dict, psychologist_user
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        resp = await client.post(
            self.endpoint,
            json={"title": "Unassign test", "assigned_to_ids": [str(psychologist_user.id)]},
            headers=headers,
        )
        task_id = resp.json()["id"]

        resp = await client.post(
            f"{self.endpoint}/{task_id}/unassign",
            json={"user_ids": [str(psychologist_user.id)]},
            headers=headers,
        )

        assert resp.status_code == 200
        assert resp.json()["status"] == "created"
        assert resp.json()["assignees"] == []

    async def test_assign_admin_to_task(
        self, client: AsyncClient, authenticated_user: dict, user
    ):
        """Admin can assign another admin to a task (delegation)."""
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        # create second admin
        resp = await client.post(
            "/users",
            json={"username": "admin2", "password": "admin2pass", "role": "admin"},
            headers=headers,
        )
        admin2_id = resp.json()["id"]

        resp = await client.post(
            self.endpoint,
            json={"title": "Delegation test", "assigned_to_ids": [admin2_id]},
            headers=headers,
        )

        assert resp.status_code == 201
        assert len(resp.json()["assignees"]) == 1
        assert resp.json()["assignees"][0]["user"]["id"] == admin2_id

    async def test_cannot_assign_respondent(
        self, client: AsyncClient, authenticated_user: dict, respondent_user
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        resp = await client.post(
            self.endpoint,
            json={"title": "Bad assign", "assigned_to_ids": [str(respondent_user.id)]},
            headers=headers,
        )
        assert resp.status_code == 400


@pytest.mark.asyncio
class TestTaskWorkflow:
    endpoint = "/tasks"

    async def test_full_workflow(
        self, client: AsyncClient, authenticated_user: dict, authenticated_psychologist: dict, psychologist_user
    ):
        admin_h = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        psych_h = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}

        # 1. Create + assign
        resp = await client.post(
            self.endpoint,
            json={"title": "Workflow", "assigned_to_ids": [str(psychologist_user.id)]},
            headers=admin_h,
        )
        assert resp.status_code == 201
        task_id = resp.json()["id"]

        # 2. Start
        resp = await client.post(f"{self.endpoint}/{task_id}/start", headers=psych_h)
        assert resp.json()["status"] == "in_progress"

        # 3. Submit
        resp = await client.post(f"{self.endpoint}/{task_id}/submit", headers=psych_h)
        assert resp.json()["status"] == "under_review"

        # 4. Approve
        resp = await client.post(f"{self.endpoint}/{task_id}/approve", headers=admin_h)
        assert resp.json()["status"] == "completed"
        assert resp.json()["completed_at"] is not None

    async def test_revision_workflow(
        self, client: AsyncClient, authenticated_user: dict, authenticated_psychologist: dict, psychologist_user
    ):
        admin_h = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        psych_h = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}

        resp = await client.post(
            self.endpoint,
            json={"title": "Revision", "assigned_to_ids": [str(psychologist_user.id)]},
            headers=admin_h,
        )
        task_id = resp.json()["id"]

        await client.post(f"{self.endpoint}/{task_id}/start", headers=psych_h)
        await client.post(f"{self.endpoint}/{task_id}/submit", headers=psych_h)

        # Request revision
        resp = await client.post(
            f"{self.endpoint}/{task_id}/request-revision",
            json={"comment": "Fix formatting"},
            headers=admin_h,
        )
        assert resp.json()["status"] == "revision_requested"

        # Restart → submit → approve
        await client.post(f"{self.endpoint}/{task_id}/start", headers=psych_h)
        await client.post(f"{self.endpoint}/{task_id}/submit", headers=psych_h)
        resp = await client.post(f"{self.endpoint}/{task_id}/approve", headers=admin_h)
        assert resp.json()["status"] == "completed"

    async def test_assignee_can_return_under_review_task_to_work_or_assigned(
        self, client: AsyncClient, authenticated_user: dict, authenticated_psychologist: dict, psychologist_user
    ):
        admin_h = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        psych_h = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}

        resp = await client.post(
            self.endpoint,
            json={"title": "Return from review", "assigned_to_ids": [str(psychologist_user.id)]},
            headers=admin_h,
        )
        task_id = resp.json()["id"]

        await client.post(f"{self.endpoint}/{task_id}/start", headers=psych_h)

        resp = await client.patch(
            f"{self.endpoint}/{task_id}",
            json={"status": "assigned"},
            headers=psych_h,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "assigned"

        await client.post(f"{self.endpoint}/{task_id}/start", headers=psych_h)
        await client.post(f"{self.endpoint}/{task_id}/submit", headers=psych_h)

        resp = await client.patch(
            f"{self.endpoint}/{task_id}",
            json={"status": "completed"},
            headers=psych_h,
        )
        assert resp.status_code == 403

        resp = await client.patch(
            f"{self.endpoint}/{task_id}",
            json={"status": "assigned"},
            headers=psych_h,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "assigned"

        await client.post(f"{self.endpoint}/{task_id}/start", headers=psych_h)
        await client.post(f"{self.endpoint}/{task_id}/submit", headers=psych_h)

        resp = await client.post(f"{self.endpoint}/{task_id}/start", headers=psych_h)
        assert resp.status_code == 200
        assert resp.json()["status"] == "in_progress"


@pytest.mark.asyncio
class TestTaskVisibility:
    endpoint = "/tasks"

    async def test_psychologist_sees_only_own_tasks(
        self, client: AsyncClient, authenticated_user: dict, authenticated_psychologist: dict, psychologist_user
    ):
        admin_h = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        psych_h = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}

        await client.post(
            self.endpoint,
            json={"title": "Psych task", "assigned_to_ids": [str(psychologist_user.id)]},
            headers=admin_h,
        )
        await client.post(
            self.endpoint, json={"title": "Unassigned"}, headers=admin_h
        )

        resp = await client.get(self.endpoint, headers=psych_h)
        assert resp.status_code == 200
        for item in resp.json()["items"]:
            assignee_ids = [a["user"]["id"] for a in item["assignees"]]
            assert str(psychologist_user.id) in assignee_ids

    async def test_psychologist_cannot_view_other_task(
        self, client: AsyncClient, authenticated_user: dict, authenticated_psychologist: dict
    ):
        admin_h = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        psych_h = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}

        resp = await client.post(
            self.endpoint, json={"title": "Other"}, headers=admin_h
        )
        task_id = resp.json()["id"]

        resp = await client.get(f"{self.endpoint}/{task_id}", headers=psych_h)
        assert resp.status_code == 403

    async def test_respondent_forbidden(
        self, client: AsyncClient, authenticated_respondent: dict
    ):
        headers = {"Authorization": f"Bearer {authenticated_respondent['access_token']}"}
        resp = await client.get(self.endpoint, headers=headers)
        assert resp.status_code == 403


@pytest.mark.asyncio
class TestComments:
    endpoint = "/tasks"

    async def test_psychologist_can_comment(
        self, client: AsyncClient, authenticated_user: dict, authenticated_psychologist: dict, psychologist_user
    ):
        admin_h = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        psych_h = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}

        resp = await client.post(
            self.endpoint,
            json={"title": "Comment task", "assigned_to_ids": [str(psychologist_user.id)]},
            headers=admin_h,
        )
        task_id = resp.json()["id"]

        # Psychologist adds comment
        resp = await client.post(
            f"{self.endpoint}/{task_id}/comments",
            json={"text": "Working on it"},
            headers=psych_h,
        )
        assert resp.status_code == 201
        assert resp.json()["text"] == "Working on it"
        assert resp.json()["author"]["username"] == "psychologist"

        # Admin adds comment
        resp = await client.post(
            f"{self.endpoint}/{task_id}/comments",
            json={"text": "Good, keep going"},
            headers=admin_h,
        )
        assert resp.status_code == 201

        # Get comments
        resp = await client.get(f"{self.endpoint}/{task_id}/comments", headers=psych_h)
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    async def test_psychologist_cannot_comment_on_unassigned_task(
        self, client: AsyncClient, authenticated_user: dict, authenticated_psychologist: dict
    ):
        admin_h = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        psych_h = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}

        resp = await client.post(
            self.endpoint, json={"title": "No access"}, headers=admin_h
        )
        task_id = resp.json()["id"]

        resp = await client.post(
            f"{self.endpoint}/{task_id}/comments",
            json={"text": "Can't do this"},
            headers=psych_h,
        )
        assert resp.status_code == 403


@pytest.mark.asyncio
class TestTaskHistory:
    endpoint = "/tasks"

    async def test_task_history(
        self, client: AsyncClient, authenticated_user: dict, authenticated_psychologist: dict, psychologist_user
    ):
        admin_h = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        psych_h = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}

        resp = await client.post(
            self.endpoint,
            json={"title": "History test", "assigned_to_ids": [str(psychologist_user.id)]},
            headers=admin_h,
        )
        task_id = resp.json()["id"]

        await client.post(f"{self.endpoint}/{task_id}/start", headers=psych_h)
        await client.post(f"{self.endpoint}/{task_id}/submit", headers=psych_h)

        resp = await client.get(f"{self.endpoint}/{task_id}/history", headers=admin_h)
        assert resp.status_code == 200
        events = [e["event"] for e in resp.json()]
        assert "created" in events
        assert "assigned" in events
        assert "in_progress" in events
        assert "under_review" in events


@pytest.mark.asyncio
class TestDeleteTask:
    endpoint = "/tasks"

    async def test_delete_task(self, client: AsyncClient, authenticated_user: dict):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        resp = await client.post(
            self.endpoint, json={"title": "Delete me"}, headers=headers
        )
        task_id = resp.json()["id"]

        resp = await client.delete(f"{self.endpoint}/{task_id}", headers=headers)
        assert resp.status_code == 204

        resp = await client.get(f"{self.endpoint}/{task_id}", headers=headers)
        assert resp.status_code == 404

    async def test_cannot_delete_completed_task(
        self, client: AsyncClient, authenticated_user: dict, authenticated_psychologist: dict, psychologist_user
    ):
        admin_h = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        psych_h = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}

        resp = await client.post(
            self.endpoint,
            json={"title": "Complete then delete", "assigned_to_ids": [str(psychologist_user.id)]},
            headers=admin_h,
        )
        task_id = resp.json()["id"]
        await client.post(f"{self.endpoint}/{task_id}/start", headers=psych_h)
        await client.post(f"{self.endpoint}/{task_id}/submit", headers=psych_h)
        await client.post(f"{self.endpoint}/{task_id}/approve", headers=admin_h)

        resp = await client.delete(f"{self.endpoint}/{task_id}", headers=admin_h)
        assert resp.status_code == 400


@pytest.mark.asyncio
class TestUpdateTask:
    endpoint = "/tasks"

    async def test_update_task(self, client: AsyncClient, authenticated_user: dict):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        resp = await client.post(
            self.endpoint, json={"title": "Original"}, headers=headers
        )
        task_id = resp.json()["id"]

        resp = await client.patch(
            f"{self.endpoint}/{task_id}",
            json={"title": "Updated title"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated title"


@pytest.mark.asyncio
class TestDelegation:
    """Admin → Admin → Psychologist delegation flow."""
    endpoint = "/tasks"

    async def test_admin_delegates_to_admin_who_assigns_psychologist(
        self, client: AsyncClient, authenticated_user: dict, psychologist_user
    ):
        admin_h = {"Authorization": f"Bearer {authenticated_user['access_token']}"}

        # Create second admin
        resp = await client.post(
            "/users",
            json={"username": "head_admin", "password": "head123", "role": "admin"},
            headers=admin_h,
        )
        admin2_id = resp.json()["id"]

        # Head admin creates task, assigns to department admin
        resp = await client.post(
            self.endpoint,
            json={"title": "Delegation chain", "assigned_to_ids": [admin2_id]},
            headers=admin_h,
        )
        assert resp.status_code == 201
        task_id = resp.json()["id"]

        # Department admin also assigns psychologist
        resp = await client.post(
            f"{self.endpoint}/{task_id}/assign",
            json={"assigned_to_ids": [str(psychologist_user.id)]},
            headers=admin_h,
        )
        assert resp.status_code == 200
        assert len(resp.json()["assignees"]) == 2


@pytest.mark.asyncio
class TestTaskPriority:
    endpoint = "/tasks"

    async def test_create_task_with_priority(
        self, client: AsyncClient, authenticated_user: dict
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        payload = {"title": "Urgent task", "priority": "critical"}

        resp = await client.post(self.endpoint, json=payload, headers=headers)

        assert resp.status_code == 201
        assert resp.json()["priority"] == "critical"

    async def test_create_task_default_priority(
        self, client: AsyncClient, authenticated_user: dict
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        resp = await client.post(
            self.endpoint, json={"title": "Normal task"}, headers=headers
        )

        assert resp.status_code == 201
        assert resp.json()["priority"] == "medium"

    async def test_update_task_priority(
        self, client: AsyncClient, authenticated_user: dict
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        resp = await client.post(
            self.endpoint, json={"title": "Change priority"}, headers=headers
        )
        task_id = resp.json()["id"]

        resp = await client.patch(
            f"{self.endpoint}/{task_id}",
            json={"priority": "high"},
            headers=headers,
        )

        assert resp.status_code == 200
        assert resp.json()["priority"] == "high"

    async def test_filter_tasks_by_priority(
        self, client: AsyncClient, authenticated_user: dict
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        await client.post(
            self.endpoint,
            json={"title": "Low", "priority": "low"},
            headers=headers,
        )
        await client.post(
            self.endpoint,
            json={"title": "Critical", "priority": "critical"},
            headers=headers,
        )

        resp = await client.get(
            self.endpoint, params={"priority": "critical"}, headers=headers
        )

        assert resp.status_code == 200
        for item in resp.json()["items"]:
            assert item["priority"] == "critical"


@pytest.mark.asyncio
class TestSubtasks:
    endpoint = "/tasks"

    async def test_create_subtask(
        self, client: AsyncClient, authenticated_user: dict
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        resp = await client.post(
            self.endpoint, json={"title": "Parent task"}, headers=headers
        )
        parent_id = resp.json()["id"]

        resp = await client.post(
            self.endpoint,
            json={"title": "Subtask 1", "parent_task_id": parent_id},
            headers=headers,
        )

        assert resp.status_code == 201
        assert resp.json()["parent_task_id"] == parent_id

    async def test_parent_shows_subtasks(
        self, client: AsyncClient, authenticated_user: dict
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        resp = await client.post(
            self.endpoint, json={"title": "Parent"}, headers=headers
        )
        parent_id = resp.json()["id"]

        await client.post(
            self.endpoint,
            json={"title": "Sub A", "parent_task_id": parent_id},
            headers=headers,
        )
        await client.post(
            self.endpoint,
            json={"title": "Sub B", "parent_task_id": parent_id},
            headers=headers,
        )

        resp = await client.get(f"{self.endpoint}/{parent_id}", headers=headers)

        assert resp.status_code == 200
        assert len(resp.json()["subtasks"]) == 2
        subtask_titles = {s["title"] for s in resp.json()["subtasks"]}
        assert subtask_titles == {"Sub A", "Sub B"}

    async def test_subtasks_not_in_top_level_list(
        self, client: AsyncClient, authenticated_user: dict
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        resp = await client.post(
            self.endpoint, json={"title": "Top level"}, headers=headers
        )
        parent_id = resp.json()["id"]

        await client.post(
            self.endpoint,
            json={"title": "Hidden subtask", "parent_task_id": parent_id},
            headers=headers,
        )

        resp = await client.get(self.endpoint, headers=headers)
        titles = [item["title"] for item in resp.json()["items"]]
        assert "Hidden subtask" not in titles
        assert "Top level" in titles

    async def test_create_subtask_invalid_parent(
        self, client: AsyncClient, authenticated_user: dict
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        resp = await client.post(
            self.endpoint,
            json={
                "title": "Orphan",
                "parent_task_id": "00000000-0000-0000-0000-000000000000",
            },
            headers=headers,
        )
        assert resp.status_code == 404

    async def test_subtask_cannot_have_nested_subtask(
        self, client: AsyncClient, authenticated_user: dict
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        parent = await client.post(
            self.endpoint, json={"title": "Root parent"}, headers=headers
        )
        child = await client.post(
            self.endpoint,
            json={"title": "Child subtask", "parent_task_id": parent.json()["id"]},
            headers=headers,
        )

        resp = await client.post(
            self.endpoint,
            json={"title": "Nested subtask", "parent_task_id": child.json()["id"]},
            headers=headers,
        )

        assert resp.status_code == 400

    async def test_assignee_can_complete_subtask_directly(
        self,
        client: AsyncClient,
        authenticated_user: dict,
        authenticated_psychologist: dict,
        psychologist_user,
    ):
        admin_headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        psych_headers = {"Authorization": f"Bearer {authenticated_psychologist['access_token']}"}
        parent = await client.post(
            self.endpoint,
            json={
                "title": "Parent for direct subtask completion",
                "assigned_to_ids": [str(psychologist_user.id)],
            },
            headers=admin_headers,
        )
        subtask = await client.post(
            self.endpoint,
            json={
                "title": "Directly completed subtask",
                "parent_task_id": parent.json()["id"],
            },
            headers=psych_headers,
        )

        resp = await client.patch(
            f"{self.endpoint}/{subtask.json()['id']}",
            json={"status": "completed"},
            headers=psych_headers,
        )

        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"
        assert resp.json()["completed_at"] is not None

    async def test_delete_parent_cascades_subtasks(
        self, client: AsyncClient, authenticated_user: dict
    ):
        headers = {"Authorization": f"Bearer {authenticated_user['access_token']}"}
        resp = await client.post(
            self.endpoint, json={"title": "Parent to delete"}, headers=headers
        )
        parent_id = resp.json()["id"]

        resp = await client.post(
            self.endpoint,
            json={"title": "Child", "parent_task_id": parent_id},
            headers=headers,
        )
        child_id = resp.json()["id"]

        resp = await client.delete(f"{self.endpoint}/{parent_id}", headers=headers)
        assert resp.status_code == 204

        resp = await client.get(f"{self.endpoint}/{child_id}", headers=headers)
        assert resp.status_code == 404
