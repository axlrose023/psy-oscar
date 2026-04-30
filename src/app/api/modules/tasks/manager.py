from uuid import UUID

from fastapi import HTTPException, status

from app.api.modules.tasks.models import Task, TaskHistory
from app.api.modules.users.enums import UserRole
from app.api.modules.users.models import User
from app.database.uow import UnitOfWork


class TaskManager:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def _get_task_or_404(self, task_id: UUID) -> Task:
        task = await self.uow.tasks.get_by_id(task_id)
        if task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
            )
        return task

    def _ensure_has_access(self, task: Task, user: User) -> None:
        if (
            user.role == UserRole.psychologist
            and not task.is_assigned_to(user.id)
            and task.created_by_id != user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this task",
            )

    async def _record_history(
        self, task_id: UUID, changed_by_id: UUID, event: str, description: str
    ) -> None:
        history = TaskHistory(
            task_id=task_id,
            changed_by_id=changed_by_id,
            event=event,
            description=description,
        )
        await self.uow.task_history.create(history)
