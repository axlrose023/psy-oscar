from uuid import UUID

from dishka import FromDishka
from dishka.integrations.fastapi import DishkaRoute
from fastapi import APIRouter, Depends, Path
from fastapi.params import Query

from app.api.modules.auth.services.auth import AuthenticatePsychologist
from app.api.modules.events.schema import (
    CancelEventRequest,
    CompleteEventRequest,
    CreateEventRequest,
    EventHistoryResponse,
    EventResponse,
    EventsPaginationParams,
    EventsPaginationResponse,
    PostponeEventRequest,
    UpdateEventRequest,
)
from app.api.modules.events.services.event import EventService
from app.api.modules.events.services.history import EventHistoryService
from app.api.modules.users.models import User

router = APIRouter(route_class=DishkaRoute)


@router.post("", response_model=EventResponse, status_code=201)
async def create_event(
    request: CreateEventRequest,
    service: FromDishka[EventService],
    current_user: User = Depends(AuthenticatePsychologist()),
) -> EventResponse:
    return await service.create_event(request, current_user)


@router.get("", response_model=EventsPaginationResponse)
async def get_events(
    service: FromDishka[EventService],
    current_user: User = Depends(AuthenticatePsychologist()),
    params: EventsPaginationParams = Query(),
) -> EventsPaginationResponse:
    return await service.get_events(params, current_user)


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    service: FromDishka[EventService],
    current_user: User = Depends(AuthenticatePsychologist()),
    event_id: UUID = Path(...),
) -> EventResponse:
    return await service.get_event(event_id, current_user)


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(
    request: UpdateEventRequest,
    service: FromDishka[EventService],
    current_user: User = Depends(AuthenticatePsychologist()),
    event_id: UUID = Path(...),
) -> EventResponse:
    return await service.update_event(event_id, request, current_user)


@router.post("/{event_id}/complete", response_model=EventResponse)
async def complete_event(
    request: CompleteEventRequest,
    service: FromDishka[EventService],
    current_user: User = Depends(AuthenticatePsychologist()),
    event_id: UUID = Path(...),
) -> EventResponse:
    return await service.complete_event(event_id, request, current_user)


@router.post("/{event_id}/postpone", response_model=EventResponse)
async def postpone_event(
    request: PostponeEventRequest,
    service: FromDishka[EventService],
    current_user: User = Depends(AuthenticatePsychologist()),
    event_id: UUID = Path(...),
) -> EventResponse:
    return await service.postpone_event(event_id, request, current_user)


@router.post("/{event_id}/cancel", response_model=EventResponse)
async def cancel_event(
    request: CancelEventRequest,
    service: FromDishka[EventService],
    current_user: User = Depends(AuthenticatePsychologist()),
    event_id: UUID = Path(...),
) -> EventResponse:
    return await service.cancel_event(event_id, request, current_user)


@router.post("/{event_id}/archive", response_model=EventResponse)
async def archive_event(
    service: FromDishka[EventService],
    current_user: User = Depends(AuthenticatePsychologist()),
    event_id: UUID = Path(...),
) -> EventResponse:
    return await service.archive_event(event_id, current_user)


@router.delete("/{event_id}", status_code=204)
async def delete_event(
    service: FromDishka[EventService],
    current_user: User = Depends(AuthenticatePsychologist()),
    event_id: UUID = Path(...),
) -> None:
    await service.delete_event(event_id, current_user)


@router.get("/{event_id}/history", response_model=list[EventHistoryResponse])
async def get_event_history(
    service: FromDishka[EventHistoryService],
    current_user: User = Depends(AuthenticatePsychologist()),
    event_id: UUID = Path(...),
) -> list[EventHistoryResponse]:
    return await service.get_event_history(event_id, current_user)
