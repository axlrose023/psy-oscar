from uuid import UUID

from app.api.modules.tasks.manager import TaskManager
from app.api.modules.tasks.models import TaskHistory
from app.api.modules.users.models import User


class HistoryService(TaskManager):
    async def get_task_history(
        self, task_id: UUID, current_user: User
    ) -> list[TaskHistory]:
        task = await self._get_task_or_404(task_id)
        self._ensure_has_access(task, current_user)
        return list(await self.uow.task_history.get_by_task_id(task_id))
