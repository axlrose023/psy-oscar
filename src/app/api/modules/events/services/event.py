from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status

from app.api.common.utils import build_filters
from app.api.modules.events.enums import EventStatus
from app.api.modules.events.manager import EventManager
from app.api.modules.events.models import Event
from app.api.modules.events.schema import (
    CancelEventRequest,
    CompleteEventRequest,
    CreateEventRequest,
    EventsPaginationParams,
    EventsPaginationResponse,
    PostponeEventRequest,
    UpdateEventRequest,
)
from app.api.modules.users.models import User


class EventService(EventManager):

    async def create_event(self, request: CreateEventRequest, current_user: User) -> Event:
        if request.start_time and request.end_time:
            overlap = await self.uow.events.check_overlap(
                psychologist_id=request.psychologist_id,
                date=request.date,
                start_time=request.start_time,
                end_time=request.end_time,
            )
            if overlap:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Time overlap with another event for this psychologist",
                )

        if request.task_id:
            task = await self.uow.tasks.get_by_id(request.task_id)
            if task is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Task not found",
                )

        event = Event(
            date=request.date,
            start_time=request.start_time,
            end_time=request.end_time,
            activity_type=request.activity_type,
            content=request.content,
            target_unit=request.target_unit,
            respondent_id=request.respondent_id,
            respondent_name=request.respondent_name,
            personnel_category=request.personnel_category,
            planned_count=request.planned_count,
            actual_count=request.actual_count,
            is_controlled=request.is_controlled,
            control_source=request.control_source,
            execution_deadline=request.execution_deadline,
            status=request.status,
            result=request.result,
            psychologist_id=request.psychologist_id,
            created_by_id=current_user.id,
            task_id=request.task_id,
        )
        await self.uow.events.create(event)
        await self._record_history(event.id, current_user.id, "created", "Event created")
        await self.uow.commit()
        return await self.uow.events.get_by_id(event.id)

    async def get_events(
        self, params: EventsPaginationParams, current_user: User
    ) -> EventsPaginationResponse:
        filter_data = params.model_dump(exclude_unset=True)
        filter_data.pop("page_size", None)
        filter_data.pop("page", None)

        # Handle custom range filters
        date_gte = filter_data.pop("date__gte", None)
        date_lte = filter_data.pop("date__lte", None)

        filters = build_filters(Event, filter_data)

        if date_gte:
            filters.append(Event.date >= date_gte)
        if date_lte:
            filters.append(Event.date <= date_lte)

        events = await self.uow.events.get_all(
            limit=params.page_size, offset=params.offset, filters=filters
        )

        # Read-time overdue check
        for event in events:
            self._check_overdue(event)

        total = await self.uow.events.get_total_count(filters)
        return EventsPaginationResponse(
            total=total, items=events, page=params.page, page_size=params.page_size
        )

    async def get_event(self, event_id: UUID, current_user: User) -> Event:
        event = await self._get_event_or_404(event_id)
        self._check_overdue(event)
        return event

    async def update_event(
        self, event_id: UUID, request: UpdateEventRequest, current_user: User
    ) -> Event:
        event = await self._get_event_or_404(event_id)
        self._ensure_can_modify(event, current_user)
        self._ensure_modifiable(event)

        data = request.model_dump(exclude_unset=True)

        # Check overlap if time/date changed
        new_date = data.get("date", event.date)
        new_start = data.get("start_time", event.start_time)
        new_end = data.get("end_time", event.end_time)
        if new_start and new_end:
            overlap = await self.uow.events.check_overlap(
                psychologist_id=event.psychologist_id,
                date=new_date,
                start_time=new_start,
                end_time=new_end,
                exclude_id=event.id,
            )
            if overlap:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Time overlap with another event for this psychologist",
                )

        for key, value in data.items():
            setattr(event, key, value)

        await self._record_history(event.id, current_user.id, "updated", "Event updated")
        await self.uow.commit()
        return await self.uow.events.get_by_id(event.id)

    async def complete_event(
        self, event_id: UUID, request: CompleteEventRequest, current_user: User
    ) -> Event:
        event = await self._get_event_or_404(event_id)
        self._ensure_can_modify(event, current_user)
        self._ensure_modifiable(event)
        if event.status not in (EventStatus.DRAFT, EventStatus.PLANNED, EventStatus.OVERDUE):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only complete draft, planned, or overdue events",
            )

        event.status = EventStatus.COMPLETED
        if request.result is not None:
            event.result = request.result
        if request.actual_count is not None:
            event.actual_count = request.actual_count

        await self._record_history(event.id, current_user.id, "completed", "Event completed")
        await self.uow.commit()
        return await self.uow.events.get_by_id(event.id)

    async def postpone_event(
        self, event_id: UUID, request: PostponeEventRequest, current_user: User
    ) -> Event:
        event = await self._get_event_or_404(event_id)
        self._ensure_can_modify(event, current_user)
        self._ensure_modifiable(event)
        if event.status in (EventStatus.COMPLETED, EventStatus.CANCELLED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot postpone completed or cancelled events",
            )

        event.status = EventStatus.POSTPONED
        event.status_reason = request.reason
        if request.new_date:
            event.date = request.new_date

        await self._record_history(
            event.id, current_user.id, "postponed", f"Postponed: {request.reason}"
        )
        await self.uow.commit()
        return await self.uow.events.get_by_id(event.id)

    async def cancel_event(
        self, event_id: UUID, request: CancelEventRequest, current_user: User
    ) -> Event:
        event = await self._get_event_or_404(event_id)
        self._ensure_can_modify(event, current_user)
        self._ensure_modifiable(event)
        if event.status in (EventStatus.COMPLETED, EventStatus.CANCELLED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel completed or already cancelled events",
            )

        event.status = EventStatus.CANCELLED
        event.status_reason = request.reason

        await self._record_history(
            event.id, current_user.id, "cancelled", f"Cancelled: {request.reason}"
        )
        await self.uow.commit()
        return await self.uow.events.get_by_id(event.id)

    async def archive_event(self, event_id: UUID, current_user: User) -> Event:
        event = await self._get_event_or_404(event_id)
        self._ensure_can_modify(event, current_user)
        if event.status == EventStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot archive draft events, delete them instead",
            )

        event.is_archived = True
        event.archived_at = datetime.now(UTC)

        await self._record_history(event.id, current_user.id, "archived", "Event archived")
        await self.uow.commit()
        return await self.uow.events.get_by_id(event.id)

    async def delete_event(self, event_id: UUID, current_user: User) -> None:
        event = await self._get_event_or_404(event_id)
        self._ensure_can_modify(event, current_user)
        if event.status != EventStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only delete draft events, use archive for others",
            )
        if event.is_controlled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete controlled events",
            )

        await self.uow.events.delete(event)
        await self.uow.commit()

    # --- Private helpers ---

    def _ensure_modifiable(self, event: Event) -> None:
        if event.status in (EventStatus.COMPLETED, EventStatus.CANCELLED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify completed or cancelled events",
            )
        if event.is_archived:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify archived events",
            )
