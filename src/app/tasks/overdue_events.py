import logging
from datetime import UTC, datetime

from dishka import FromDishka
from sqlalchemy import and_, update

from app.api.modules.events.enums import EventStatus
from app.api.modules.events.models import Event, EventHistory
from app.database.uow import UnitOfWork
from app.tiq import broker

logger = logging.getLogger(__name__)


@broker.task(schedule=[{"cron": "*/5 * * * *"}])  # Every 5 minutes
async def check_overdue_events(uow: FromDishka[UnitOfWork]):
    now = datetime.now(UTC)

    stmt = (
        update(Event)
        .where(
            and_(
                Event.status.in_([EventStatus.DRAFT, EventStatus.PLANNED]),
                Event.execution_deadline.isnot(None),
                Event.execution_deadline < now,
                Event.is_archived.is_(False),
            )
        )
        .values(status=EventStatus.OVERDUE)
        .returning(Event.id)
    )
    result = await uow.session.execute(stmt)
    overdue_ids = result.scalars().all()

    for event_id in overdue_ids:
        history = EventHistory(
            event_id=event_id,
            changed_by_id=None,
            event_type="overdue",
            description="Automatically marked as overdue",
        )
        uow.session.add(history)

    await uow.commit()

    if overdue_ids:
        logger.info("Marked %d events as overdue", len(overdue_ids))
