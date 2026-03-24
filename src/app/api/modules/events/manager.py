from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status

from app.api.modules.events.enums import EventStatus
from app.api.modules.events.models import Event, EventHistory
from app.api.modules.users.enums import UserRole
from app.api.modules.users.models import User
from app.database.uow import UnitOfWork


class EventManager:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def _get_event_or_404(self, event_id: UUID) -> Event:
        event = await self.uow.events.get_by_id(event_id)
        if event is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
            )
        return event

    def _ensure_can_modify(self, event: Event, user: User) -> None:
        if user.role == UserRole.admin:
            return
        if event.psychologist_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only modify your own events",
            )

    async def _record_history(
        self, event_id: UUID, changed_by_id: UUID, event_type: str, description: str
    ) -> None:
        history = EventHistory(
            event_id=event_id,
            changed_by_id=changed_by_id,
            event_type=event_type,
            description=description,
        )
        await self.uow.event_history.create(history)

    def _check_overdue(self, event: Event) -> Event:
        if (
            event.status in (EventStatus.DRAFT, EventStatus.PLANNED)
            and event.execution_deadline
        ):
            now = datetime.now(UTC)
            deadline = event.execution_deadline
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=UTC)
            if deadline < now:
                event.status = EventStatus.OVERDUE
        return event
