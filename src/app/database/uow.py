from typing import Self

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.modules.tasks.gateway import (
    TaskCommentGateway,
    TaskGateway,
    TaskHistoryGateway,
)
from app.api.modules.users.gateway import UserGateway


class UnitOfWork:
    users: UserGateway
    tasks: TaskGateway
    task_history: TaskHistoryGateway
    task_comments: TaskCommentGateway

    def __init__(self, session: AsyncSession):
        self.session = session
        self.users = UserGateway(session)
        self.tasks = TaskGateway(session)
        self.task_history = TaskHistoryGateway(session)
        self.task_comments = TaskCommentGateway(session)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            await self.rollback()
        await self.session.close()

    async def commit(self: Self):
        await self.session.commit()

    async def flush(self: Self):
        await self.session.flush()

    async def refresh(self: Self, instance: object):
        await self.session.refresh(instance)

    async def rollback(self: Self):
        await self.session.rollback()

    async def close(self: Self):
        await self.session.close()
