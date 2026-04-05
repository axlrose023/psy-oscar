from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.modules.notifications.models import Notification


class NotificationGateway:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, notification: Notification) -> Notification:
        self.session.add(notification)
        await self.session.flush()
        return notification

    async def get_by_user(
        self, user_id: UUID, limit: int = 30, unread_only: bool = False
    ) -> Sequence[Notification]:
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        if unread_only:
            stmt = stmt.where(Notification.is_read.is_(False))
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_id(self, notification_id: int, user_id: UUID) -> Notification | None:
        stmt = select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def count_unread(self, user_id: UUID) -> int:
        from sqlalchemy import func
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def mark_read(self, notification_id: int, user_id: UUID) -> Notification | None:
        n = await self.get_by_id(notification_id, user_id)
        if n:
            n.is_read = True
            await self.session.flush()
        return n

    async def mark_all_read(self, user_id: UUID) -> None:
        from sqlalchemy import update
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
            .values(is_read=True)
        )
        await self.session.execute(stmt)
        await self.session.flush()
