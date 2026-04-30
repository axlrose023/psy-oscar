import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.api.common.schema import Pagination, PaginationParams
from app.api.modules.tasks.enums import TaskPriority, TaskStatus

# --- Nested ---


class TaskUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    username: str


class TaskAssigneeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user: TaskUserResponse
    assigned_at: datetime.datetime


# --- Request ---


class CreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    priority: TaskPriority = TaskPriority.MEDIUM
    deadline: datetime.datetime | None = None
    assigned_to_ids: list[UUID] | None = None
    parent_task_id: UUID | None = None

    model_config = ConfigDict(extra="forbid")


class UpdateTaskRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    priority: TaskPriority | None = None
    deadline: datetime.datetime | None = None
    status: TaskStatus | None = None

    model_config = ConfigDict(extra="forbid")


class AssignTaskRequest(BaseModel):
    assigned_to_ids: list[UUID] = Field(..., min_length=1)

    model_config = ConfigDict(extra="forbid")


class UnassignTaskRequest(BaseModel):
    user_ids: list[UUID] = Field(..., min_length=1)

    model_config = ConfigDict(extra="forbid")


class RevisionRequestBody(BaseModel):
    comment: str = Field(..., min_length=1)

    model_config = ConfigDict(extra="forbid")


class CommentRequest(BaseModel):
    text: str = Field(..., min_length=1)

    model_config = ConfigDict(extra="forbid")


# --- Response ---


class SubtaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    status: TaskStatus
    priority: TaskPriority


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    deadline: datetime.datetime | None
    completed_at: datetime.datetime | None
    created_by: TaskUserResponse
    assignees: list[TaskAssigneeResponse]
    parent_task_id: UUID | None
    subtasks: list[SubtaskResponse]
    created_at: datetime.datetime
    updated_at: datetime.datetime


class TaskCommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    created_at: datetime.datetime
    author: TaskUserResponse


class TaskHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event: str
    description: str | None
    created_at: datetime.datetime
    changed_by: TaskUserResponse


# --- Pagination ---


class TasksPaginationParams(PaginationParams):
    status: TaskStatus | None = None
    status__in: list[TaskStatus] | None = None
    priority: TaskPriority | None = None
    title__search: str | None = None


class TasksPaginationResponse(Pagination[TaskResponse]):
    model_config = ConfigDict(from_attributes=True)
