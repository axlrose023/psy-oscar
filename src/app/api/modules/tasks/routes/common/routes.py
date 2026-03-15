from uuid import UUID

from dishka import FromDishka
from dishka.integrations.fastapi import DishkaRoute
from fastapi import APIRouter, Depends, Path
from fastapi.params import Query

from app.api.modules.auth.services.auth import AuthenticatePsychologist
from app.api.modules.tasks.schema import (
    CommentRequest,
    TaskCommentResponse,
    TaskHistoryResponse,
    TaskResponse,
    TasksPaginationParams,
    TasksPaginationResponse,
)
from app.api.modules.tasks.services.comment import CommentService
from app.api.modules.tasks.services.history import HistoryService
from app.api.modules.tasks.services.task import TaskService
from app.api.modules.users.models import User

router = APIRouter(route_class=DishkaRoute)


@router.get("", response_model=TasksPaginationResponse)
async def get_tasks(
    service: FromDishka[TaskService],
    current_user: User = Depends(AuthenticatePsychologist()),
    params: TasksPaginationParams = Query(),
) -> TasksPaginationResponse:
    return await service.get_tasks(params, current_user)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    service: FromDishka[TaskService],
    current_user: User = Depends(AuthenticatePsychologist()),
    task_id: UUID = Path(...),
) -> TaskResponse:
    return await service.get_task(task_id, current_user)


@router.get("/{task_id}/history", response_model=list[TaskHistoryResponse])
async def get_task_history(
    service: FromDishka[HistoryService],
    current_user: User = Depends(AuthenticatePsychologist()),
    task_id: UUID = Path(...),
) -> list[TaskHistoryResponse]:
    return await service.get_task_history(task_id, current_user)


@router.post("/{task_id}/comments", response_model=TaskCommentResponse, status_code=201)
async def add_comment(
    request: CommentRequest,
    service: FromDishka[CommentService],
    current_user: User = Depends(AuthenticatePsychologist()),
    task_id: UUID = Path(...),
) -> TaskCommentResponse:
    return await service.add_comment(task_id, request, current_user)


@router.get("/{task_id}/comments", response_model=list[TaskCommentResponse])
async def get_comments(
    service: FromDishka[CommentService],
    current_user: User = Depends(AuthenticatePsychologist()),
    task_id: UUID = Path(...),
) -> list[TaskCommentResponse]:
    return await service.get_comments(task_id, current_user)
