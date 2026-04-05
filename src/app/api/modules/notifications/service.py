import json
import uuid
from collections.abc import Sequence

import redis.asyncio as aioredis

from app.api.modules.notifications.models import Notification
from app.api.modules.notifications.schema import NotificationResponse
from app.database.uow import UnitOfWork
from app.settings import get_config

_config = get_config()


def _get_redis() -> aioredis.Redis:
    return aioredis.from_url(_config.redis_url, decode_responses=True)


def _channel(user_id: uuid.UUID) -> str:
    return f"notifications:{user_id}"


class NotificationService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create(
        self,
        *,
        user_id: uuid.UUID,
        type: str,
        title: str,
        body: str | None = None,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        await self.uow.notifications.create(notification)
        # Publish to Redis so SSE stream picks it up immediately
        await self._publish(user_id, notification)
        return notification

    async def _publish(self, user_id: uuid.UUID, notification: Notification) -> None:
        try:
            r = _get_redis()
            payload = NotificationResponse.model_validate(notification).model_dump_json()
            await r.publish(_channel(user_id), payload)
            await r.aclose()
        except Exception:
            pass  # Non-critical — notification is already in DB

    async def list_for_user(
        self, user_id: uuid.UUID, limit: int = 30
    ) -> tuple[Sequence[Notification], int]:
        items = await self.uow.notifications.get_by_user(user_id, limit=limit)
        unread = await self.uow.notifications.count_unread(user_id)
        return items, unread

    async def mark_read(self, notification_id: int, user_id: uuid.UUID) -> Notification | None:
        n = await self.uow.notifications.mark_read(notification_id, user_id)
        await self.uow.commit()
        return n

    async def mark_all_read(self, user_id: uuid.UUID) -> None:
        await self.uow.notifications.mark_all_read(user_id)
        await self.uow.commit()
