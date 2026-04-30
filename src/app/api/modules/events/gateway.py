import datetime
from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import BinaryExpression, and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.modules.events.models import Event, EventAssignee, EventHistory


class EventGateway:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, event: Event) -> Event:
        self.session.add(event)
        await self.session.flush()
        return event

    async def get_by_id(self, event_id: UUID) -> Event | None:
        stmt = (
            select(Event)
            .options(
                joinedload(Event.psychologist),
                joinedload(Event.created_by),
                joinedload(Event.assignees).joinedload(EventAssignee.user),
            )
            .where(Event.id == event_id)
        )
        result = await self.session.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def get_all(
        self,
        limit: int,
        offset: int,
        filters: list[BinaryExpression],
    ) -> Sequence[Event]:
        stmt = (
            select(Event)
            .options(
                joinedload(Event.psychologist),
                joinedload(Event.created_by),
                joinedload(Event.assignees).joinedload(EventAssignee.user),
            )
            .filter(*filters)
            .order_by(Event.date.desc(), Event.start_time.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.unique().scalars().all()

    async def get_total_count(self, filters: list[BinaryExpression]) -> int:
        stmt = select(func.count()).select_from(Event).where(*filters)
        result = await self.session.execute(stmt)
        return result.scalar()

    async def check_overlap(
        self,
        psychologist_id: UUID,
        date: datetime.date,
        start_time: datetime.time | None,
        end_time: datetime.time | None,
        exclude_id: UUID | None = None,
    ) -> bool:
        if not start_time or not end_time:
            return False

        conditions = [
            Event.assignees.any(EventAssignee.user_id == psychologist_id),
            Event.date == date,
            Event.start_time.isnot(None),
            Event.end_time.isnot(None),
            Event.start_time < end_time,
            Event.end_time > start_time,
            Event.is_archived.is_(False),
            Event.status.notin_(["cancelled"]),
        ]
        if exclude_id:
            conditions.append(Event.id != exclude_id)

        stmt = select(func.count()).select_from(Event).where(and_(*conditions))
        result = await self.session.execute(stmt)
        return result.scalar() > 0

    async def delete(self, event: Event) -> None:
        await self.session.delete(event)
        await self.session.flush()


class EventHistoryGateway:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, history: EventHistory) -> EventHistory:
        self.session.add(history)
        await self.session.flush()
        return history

    async def get_by_event_id(self, event_id: UUID) -> Sequence[EventHistory]:
        stmt = (
            select(EventHistory)
            .options(joinedload(EventHistory.changed_by))
            .where(EventHistory.event_id == event_id)
            .order_by(EventHistory.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.unique().scalars().all()
