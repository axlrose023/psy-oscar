import asyncio

from dishka import FromDishka
from dishka.integrations.fastapi import DishkaRoute
from fastapi import APIRouter, Depends, Path
from fastapi.responses import StreamingResponse

from app.api.modules.auth.services.auth import AuthenticatePsychologist, AuthenticateSSE
from app.api.modules.notifications.schema import NotificationListResponse, NotificationResponse
from app.api.modules.notifications.service import NotificationService, _channel, _get_redis
from app.api.modules.users.models import User

router = APIRouter(route_class=DishkaRoute)


# ─── SSE stream ─────────────────────────────────────────────────────────────

@router.get("/stream", include_in_schema=True)
async def notifications_stream(
    current_user: User = Depends(AuthenticateSSE()),
) -> StreamingResponse:
    """
    Server-Sent Events stream for real-time notifications.
    Client connects once and receives events as they arrive.
    """
    user_id = current_user.id

    async def event_generator():
        r = _get_redis()
        pubsub = r.pubsub()
        await pubsub.subscribe(_channel(user_id))
        try:
            # Send a heartbeat immediately to confirm connection
            yield "event: connected\ndata: {}\n\n"
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=25.0)
                if message and message["type"] == "message":
                    data = message["data"]
                    yield f"event: notification\ndata: {data}\n\n"
                else:
                    # Heartbeat every ~25s to keep connection alive
                    yield ": heartbeat\n\n"
                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe(_channel(user_id))
            await pubsub.aclose()
            await r.aclose()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─── REST ────────────────────────────────────────────────────────────────────

@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    service: FromDishka[NotificationService],
    current_user: User = Depends(AuthenticatePsychologist()),
) -> NotificationListResponse:
    items, unread_count = await service.list_for_user(current_user.id)
    return NotificationListResponse(
        items=[NotificationResponse.model_validate(n) for n in items],
        unread_count=unread_count,
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    service: FromDishka[NotificationService],
    notification_id: int = Path(...),
    current_user: User = Depends(AuthenticatePsychologist()),
) -> NotificationResponse:
    n = await service.mark_read(notification_id, current_user.id)
    if n is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return NotificationResponse.model_validate(n)


@router.post("/read-all", status_code=204)
async def mark_all_read(
    service: FromDishka[NotificationService],
    current_user: User = Depends(AuthenticatePsychologist()),
) -> None:
    await service.mark_all_read(current_user.id)
