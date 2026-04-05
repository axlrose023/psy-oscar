from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status

from app.api.common.utils import build_filters
from app.api.modules.notifications.service import NotificationService
from app.api.modules.tasks.enums import TaskStatus
from app.api.modules.tasks.manager import TaskManager
from app.api.modules.tasks.models import Task, TaskAssignee
from app.api.modules.tasks.schema import (
    AssignTaskRequest,
    CreateTaskRequest,
    RevisionRequestBody,
    TasksPaginationParams,
    TasksPaginationResponse,
    UnassignTaskRequest,
    UpdateTaskRequest,
)
from app.api.modules.users.enums import UserRole
from app.api.modules.users.models import User


class TaskService(TaskManager):

    def __init__(self, uow, notification_service: NotificationService | None = None):
        super().__init__(uow)
        self._notifications = notification_service

    async def _notify(self, **kwargs) -> None:
        if self._notifications:
            try:
                await self._notifications.create(**kwargs)
            except Exception:
                pass  # Notifications are non-critical

    # --- Admin endpoints ---

    async def create_task(self, request: CreateTaskRequest, current_user: User) -> Task:
        if request.parent_task_id:
            await self._get_task_or_404(request.parent_task_id)

        assignees = []
        if request.assigned_to_ids:
            assignees = await self._build_assignees(request.assigned_to_ids)

        task = Task(
            title=request.title,
            description=request.description,
            priority=request.priority,
            deadline=request.deadline,
            status=TaskStatus.ASSIGNED if assignees else TaskStatus.CREATED,
            created_by_id=current_user.id,
            parent_task_id=request.parent_task_id,
            assignees=assignees,
        )
        await self.uow.tasks.create(task)
        await self._record_history(task.id, current_user.id, "created", "Task created")
        if assignees:
            await self._record_history(
                task.id, current_user.id, "assigned",
                f"Assigned: {', '.join(str(a.user_id) for a in assignees)}",
            )

        await self.uow.commit()
        return await self.uow.tasks.get_by_id(task.id)

    async def update_task(
        self, task_id: UUID, request: UpdateTaskRequest, current_user: User
    ) -> Task:
        task = await self._get_task_or_404(task_id)
        self._ensure_has_access(task, current_user)

        # Only block field edits on completed tasks; status changes are always allowed
        fields_changed = any([
            request.title is not None,
            request.description is not None,
            request.priority is not None,
            request.deadline is not None,
        ])
        if fields_changed:
            self._ensure_not_completed(task)
            if request.title is not None:
                task.title = request.title
            if request.description is not None:
                task.description = request.description
            if request.priority is not None:
                task.priority = request.priority
            if request.deadline is not None:
                task.deadline = request.deadline
            await self._record_history(task.id, current_user.id, "updated", "Task updated")

        if request.status is not None and request.status != task.status:
            old_status = task.status.value
            task.status = request.status
            if request.status == TaskStatus.COMPLETED and not task.completed_at:
                task.completed_at = datetime.now(UTC)
            elif request.status != TaskStatus.COMPLETED:
                task.completed_at = None
            await self._record_history(
                task.id, current_user.id, "status_changed",
                f"{old_status} → {request.status.value}",
            )

        await self.uow.commit()
        return await self.uow.tasks.get_by_id(task.id)

    async def assign_task(
        self, task_id: UUID, request: AssignTaskRequest, current_user: User
    ) -> Task:
        task = await self._get_task_or_404(task_id)
        self._ensure_not_completed(task)

        await self._add_assignees(task, request.assigned_to_ids, current_user)

        if task.status == TaskStatus.CREATED:
            task.status = TaskStatus.ASSIGNED

        tid = task.id
        title = task.title
        # Notify each new assignee
        for uid in request.assigned_to_ids:
            await self._notify(
                user_id=uid,
                type="task_assigned",
                title=f"Вас призначено виконавцем задачі",
                body=f'«{title}»',
                entity_type="task",
                entity_id=tid,
            )

        await self.uow.commit()
        self.uow.session.expunge(task)
        return await self.uow.tasks.get_by_id(tid)

    async def unassign_task(
        self, task_id: UUID, request: UnassignTaskRequest, current_user: User
    ) -> Task:
        task = await self._get_task_or_404(task_id)
        self._ensure_not_completed(task)

        removed = []
        for uid in request.user_ids:
            assignee = next((a for a in task.assignees if a.user_id == uid), None)
            if assignee:
                task.assignees.remove(assignee)
                removed.append(str(uid))

        if not removed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="None of the specified users are assigned to this task",
            )

        await self._record_history(
            task.id, current_user.id, "unassigned",
            f"Removed assignees: {', '.join(removed)}",
        )

        if not task.assignees and task.status == TaskStatus.ASSIGNED:
            task.status = TaskStatus.CREATED

        tid = task.id
        await self.uow.commit()
        self.uow.session.expunge(task)
        return await self.uow.tasks.get_by_id(tid)

    async def request_revision(
        self, task_id: UUID, body: RevisionRequestBody, current_user: User
    ) -> Task:
        task = await self._get_task_or_404(task_id)
        if task.status != TaskStatus.UNDER_REVIEW:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only request revision for tasks under review",
            )
        task.status = TaskStatus.REVISION_REQUESTED
        await self._record_history(
            task.id, current_user.id, "revision_requested", body.comment
        )
        # Notify all assignees
        for a in task.assignees:
            await self._notify(
                user_id=a.user_id,
                type="task_revision",
                title="Задача повернута на доопрацювання",
                body=f'«{task.title}»' + (f': {body.comment}' if body.comment else ''),
                entity_type="task",
                entity_id=task.id,
            )
        await self.uow.commit()
        return await self.uow.tasks.get_by_id(task.id)

    async def approve_task(self, task_id: UUID, current_user: User) -> Task:
        task = await self._get_task_or_404(task_id)
        if task.status != TaskStatus.UNDER_REVIEW:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only approve tasks under review",
            )
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.now(UTC)
        await self._record_history(task.id, current_user.id, "completed", "Task approved")
        # Notify all assignees
        for a in task.assignees:
            await self._notify(
                user_id=a.user_id,
                type="task_approved",
                title="Задача схвалена та завершена",
                body=f'«{task.title}»',
                entity_type="task",
                entity_id=task.id,
            )
        await self.uow.commit()
        return await self.uow.tasks.get_by_id(task.id)

    async def delete_task(self, task_id: UUID, current_user: User) -> None:
        task = await self._get_task_or_404(task_id)
        self._ensure_not_completed(task)
        await self._record_history(task.id, current_user.id, "deleted", "Task deleted")
        await self.uow.session.delete(task)
        await self.uow.commit()

    # --- Psychologist endpoints ---

    async def start_task(self, task_id: UUID, current_user: User) -> Task:
        task = await self._get_task_or_404(task_id)
        self._ensure_is_assignee(task, current_user)
        if task.status not in (TaskStatus.ASSIGNED, TaskStatus.REVISION_REQUESTED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only start assigned or revision-requested tasks",
            )
        task.status = TaskStatus.IN_PROGRESS
        await self._record_history(task.id, current_user.id, "in_progress", "Task started")
        await self.uow.commit()
        return await self.uow.tasks.get_by_id(task.id)

    async def submit_for_review(self, task_id: UUID, current_user: User) -> Task:
        task = await self._get_task_or_404(task_id)
        self._ensure_is_assignee(task, current_user)
        if task.status != TaskStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only submit in-progress tasks for review",
            )
        task.status = TaskStatus.UNDER_REVIEW
        await self._record_history(
            task.id, current_user.id, "under_review", "Task submitted for review"
        )
        await self.uow.commit()
        return await self.uow.tasks.get_by_id(task.id)

    # --- Shared ---

    async def get_tasks(
        self, params: TasksPaginationParams, current_user: User
    ) -> TasksPaginationResponse:
        filter_data = params.model_dump(exclude_unset=True)
        filter_data.pop("page_size", None)
        filter_data.pop("page", None)

        filters = build_filters(Task, filter_data)

        if current_user.role == UserRole.psychologist:
            tasks = await self.uow.tasks.get_all_for_assignee(
                user_id=current_user.id,
                limit=params.page_size,
                offset=params.offset,
                extra_filters=filters,
            )
            total = await self.uow.tasks.count_for_assignee(
                user_id=current_user.id, extra_filters=filters
            )
        else:
            tasks = await self.uow.tasks.get_all(
                limit=params.page_size, offset=params.offset, filters=filters
            )
            total = await self.uow.tasks.get_total_count(filters)

        return TasksPaginationResponse(
            total=total, items=tasks, page=params.page, page_size=params.page_size
        )

    async def get_task(self, task_id: UUID, current_user: User) -> Task:
        task = await self._get_task_or_404(task_id)
        self._ensure_has_access(task, current_user)
        return task

    # --- Private helpers ---

    async def _build_assignees(self, user_ids: list[UUID]) -> list[TaskAssignee]:
        result = []
        for uid in user_ids:
            user = await self.uow.users.get_by_id(uid)
            if user is None or not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User {uid} not found or inactive",
                )
            if user.role not in (UserRole.admin, UserRole.psychologist):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User {uid} cannot be assigned tasks (must be admin or psychologist)",
                )
            result.append(TaskAssignee(user_id=uid))
        return result

    async def _add_assignees(
        self, task: Task, user_ids: list[UUID], current_user: User
    ) -> None:
        existing_ids = {a.user_id for a in task.assignees}
        new_ids = [uid for uid in user_ids if uid not in existing_ids]
        if not new_ids:
            return

        new_assignees = await self._build_assignees(new_ids)
        for assignee in new_assignees:
            assignee.task_id = task.id
            task.assignees.append(assignee)

        await self._record_history(
            task.id, current_user.id, "assigned",
            f"Assigned: {', '.join(str(uid) for uid in new_ids)}",
        )

    def _ensure_not_completed(self, task: Task) -> None:
        if task.status == TaskStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify a completed task",
            )

    def _ensure_is_assignee(self, task: Task, user: User) -> None:
        if not task.is_assigned_to(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This task is not assigned to you",
            )
