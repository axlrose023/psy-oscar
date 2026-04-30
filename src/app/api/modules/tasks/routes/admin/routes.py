from uuid import UUID

from dishka import FromDishka
from dishka.integrations.fastapi import DishkaRoute
from fastapi import APIRouter, Depends, Path

from app.api.modules.auth.services.auth import AuthenticateAdmin
from app.api.modules.tasks.schema import (
    AssignTaskRequest,
    RevisionRequestBody,
    TaskResponse,
    UnassignTaskRequest,
)
from app.api.modules.tasks.services.task import TaskService
from app.api.modules.users.models import User

router = APIRouter(route_class=DishkaRoute)


@router.post("/{task_id}/assign", response_model=TaskResponse)
async def assign_task(
    request: AssignTaskRequest,
    service: FromDishka[TaskService],
    current_user: User = Depends(AuthenticateAdmin()),
    task_id: UUID = Path(...),
) -> TaskResponse:
    return await service.assign_task(task_id, request, current_user)


@router.post("/{task_id}/unassign", response_model=TaskResponse)
async def unassign_task(
    request: UnassignTaskRequest,
    service: FromDishka[TaskService],
    current_user: User = Depends(AuthenticateAdmin()),
    task_id: UUID = Path(...),
) -> TaskResponse:
    return await service.unassign_task(task_id, request, current_user)


@router.post("/{task_id}/request-revision", response_model=TaskResponse)
async def request_revision(
    body: RevisionRequestBody,
    service: FromDishka[TaskService],
    current_user: User = Depends(AuthenticateAdmin()),
    task_id: UUID = Path(...),
) -> TaskResponse:
    return await service.request_revision(task_id, body, current_user)


@router.post("/{task_id}/approve", response_model=TaskResponse)
async def approve_task(
    service: FromDishka[TaskService],
    current_user: User = Depends(AuthenticateAdmin()),
    task_id: UUID = Path(...),
) -> TaskResponse:
    return await service.approve_task(task_id, current_user)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    service: FromDishka[TaskService],
    current_user: User = Depends(AuthenticateAdmin()),
    task_id: UUID = Path(...),
) -> None:
    await service.delete_task(task_id, current_user)
