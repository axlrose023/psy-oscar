from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import BinaryExpression, and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.modules.tasks.models import Task, TaskAssignee, TaskComment, TaskHistory


class TaskGateway:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, task: Task) -> Task:
        self.session.add(task)
        await self.session.flush()
        return task

    async def get_by_id(self, task_id: UUID) -> Task | None:
        stmt = (
            select(Task)
            .options(
                joinedload(Task.created_by),
                joinedload(Task.assignees).joinedload(TaskAssignee.user),
                joinedload(Task.subtasks),
            )
            .where(Task.id == task_id)
        )
        result = await self.session.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def get_all(
        self,
        limit: int,
        offset: int,
        filters: list[BinaryExpression],
    ) -> Sequence[Task]:
        stmt = (
            select(Task)
            .options(
                joinedload(Task.created_by),
                joinedload(Task.assignees).joinedload(TaskAssignee.user),
                joinedload(Task.subtasks),
            )
            .where(Task.parent_task_id.is_(None))
            .filter(*filters)
            .order_by(Task.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.unique().scalars().all()

    async def get_all_for_assignee(
        self,
        user_id: UUID,
        limit: int,
        offset: int,
        extra_filters: list[BinaryExpression],
    ) -> Sequence[Task]:
        stmt = (
            select(Task)
            .join(TaskAssignee, TaskAssignee.task_id == Task.id)
            .options(
                joinedload(Task.created_by),
                joinedload(Task.assignees).joinedload(TaskAssignee.user),
                joinedload(Task.subtasks),
            )
            .where(and_(TaskAssignee.user_id == user_id, Task.parent_task_id.is_(None), *extra_filters))
            .order_by(Task.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.unique().scalars().all()

    async def count_for_assignee(
        self, user_id: UUID, extra_filters: list[BinaryExpression]
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Task)
            .join(TaskAssignee, TaskAssignee.task_id == Task.id)
            .where(and_(TaskAssignee.user_id == user_id, Task.parent_task_id.is_(None), *extra_filters))
        )
        result = await self.session.execute(stmt)
        return result.scalar()

    async def get_total_count(self, filters: list[BinaryExpression]) -> int:
        stmt = (
            select(func.count())
            .select_from(Task)
            .where(Task.parent_task_id.is_(None), *filters)
        )
        result = await self.session.execute(stmt)
        return result.scalar()


class TaskHistoryGateway:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, history: TaskHistory) -> TaskHistory:
        self.session.add(history)
        await self.session.flush()
        return history

    async def get_by_task_id(self, task_id: UUID) -> Sequence[TaskHistory]:
        stmt = (
            select(TaskHistory)
            .options(joinedload(TaskHistory.changed_by))
            .where(TaskHistory.task_id == task_id)
            .order_by(TaskHistory.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.unique().scalars().all()


class TaskCommentGateway:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, comment: TaskComment) -> TaskComment:
        self.session.add(comment)
        await self.session.flush()
        return comment

    async def get_by_task_id(self, task_id: UUID) -> Sequence[TaskComment]:
        stmt = (
            select(TaskComment)
            .options(joinedload(TaskComment.author))
            .where(TaskComment.task_id == task_id)
            .order_by(TaskComment.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return result.unique().scalars().all()
