from uuid import UUID

from dishka import FromDishka
from dishka.integrations.fastapi import DishkaRoute
from fastapi import APIRouter, Depends, Path

from app.api.modules.auth.services.auth import AuthenticatePsychologist
from app.api.modules.tasks.schema import TaskResponse
from app.api.modules.tasks.services.task import TaskService
from app.api.modules.users.models import User

router = APIRouter(route_class=DishkaRoute)


@router.post("/{task_id}/start", response_model=TaskResponse)
async def start_task(
    service: FromDishka[TaskService],
    current_user: User = Depends(AuthenticatePsychologist()),
    task_id: UUID = Path(...),
) -> TaskResponse:
    return await service.start_task(task_id, current_user)


@router.post("/{task_id}/submit", response_model=TaskResponse)
async def submit_for_review(
    service: FromDishka[TaskService],
    current_user: User = Depends(AuthenticatePsychologist()),
    task_id: UUID = Path(...),
) -> TaskResponse:
    return await service.submit_for_review(task_id, current_user)
