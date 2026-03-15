from uuid import UUID

from app.api.modules.tasks.manager import TaskManager
from app.api.modules.tasks.models import TaskComment
from app.api.modules.tasks.schema import CommentRequest
from app.api.modules.users.models import User


class CommentService(TaskManager):
    async def add_comment(
        self, task_id: UUID, request: CommentRequest, current_user: User
    ) -> TaskComment:
        task = await self._get_task_or_404(task_id)
        self._ensure_has_access(task, current_user)

        comment = TaskComment(
            task_id=task.id,
            author_id=current_user.id,
            text=request.text,
        )
        await self.uow.task_comments.create(comment)
        await self.uow.commit()
        return comment

    async def get_comments(
        self, task_id: UUID, current_user: User
    ) -> list[TaskComment]:
        task = await self._get_task_or_404(task_id)
        self._ensure_has_access(task, current_user)
        return list(await self.uow.task_comments.get_by_task_id(task_id))
