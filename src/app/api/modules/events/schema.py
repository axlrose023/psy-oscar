import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.api.common.schema import Pagination, PaginationParams
from app.api.modules.events.enums import ActivityType, EventStatus, PersonnelCategory


# --- Nested ---


class EventUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    username: str


class EventAssigneeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user: EventUserResponse


# --- Requests ---


class CreateEventRequest(BaseModel):
    date: datetime.date
    start_time: datetime.time | None = None
    end_time: datetime.time | None = None
    activity_type: ActivityType
    content: str | None = None
    target_unit: str | None = Field(None, max_length=200)
    respondent_id: UUID | None = None
    respondent_name: str | None = Field(None, max_length=100)
    personnel_category: PersonnelCategory | None = None
    planned_count: int | None = Field(None, ge=0)
    actual_count: int | None = Field(None, ge=0)
    is_controlled: bool = False
    control_source: str | None = Field(None, max_length=200)
    execution_deadline: datetime.datetime | None = None
    status: EventStatus = EventStatus.DRAFT
    result: str | None = None
    psychologist_id: UUID | None = None
    psychologist_ids: list[UUID] | None = None
    task_id: UUID | None = None

    model_config = ConfigDict(extra="forbid")


class UpdateEventRequest(BaseModel):
    date: datetime.date | None = None
    start_time: datetime.time | None = None
    end_time: datetime.time | None = None
    activity_type: ActivityType | None = None
    content: str | None = None
    target_unit: str | None = Field(None, max_length=200)
    respondent_id: UUID | None = None
    respondent_name: str | None = Field(None, max_length=100)
    personnel_category: PersonnelCategory | None = None
    planned_count: int | None = Field(None, ge=0)
    actual_count: int | None = Field(None, ge=0)
    is_controlled: bool | None = None
    control_source: str | None = Field(None, max_length=200)
    execution_deadline: datetime.datetime | None = None
    result: str | None = None
    psychologist_id: UUID | None = None
    psychologist_ids: list[UUID] | None = None
    task_id: UUID | None = None

    model_config = ConfigDict(extra="forbid")


class CompleteEventRequest(BaseModel):
    result: str | None = None
    actual_count: int | None = Field(None, ge=0)

    model_config = ConfigDict(extra="forbid")


class PostponeEventRequest(BaseModel):
    reason: str = Field(..., min_length=1)
    new_date: datetime.date | None = None

    model_config = ConfigDict(extra="forbid")


class CancelEventRequest(BaseModel):
    reason: str = Field(..., min_length=1)

    model_config = ConfigDict(extra="forbid")


# --- Responses ---


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    date: datetime.date
    start_time: datetime.time | None
    end_time: datetime.time | None
    activity_type: ActivityType
    content: str | None
    target_unit: str | None
    respondent_id: UUID | None
    respondent_name: str | None
    personnel_category: PersonnelCategory | None
    planned_count: int | None
    actual_count: int | None
    is_controlled: bool
    control_source: str | None
    execution_deadline: datetime.datetime | None
    status: EventStatus
    result: str | None
    status_reason: str | None
    psychologist: EventUserResponse
    assignees: list[EventAssigneeResponse] = []
    created_by: EventUserResponse
    task_id: UUID | None
    is_archived: bool
    archived_at: datetime.datetime | None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class EventHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: str
    description: str | None
    created_at: datetime.datetime
    changed_by: EventUserResponse | None


# --- Pagination ---


class EventsPaginationParams(PaginationParams):
    date__gte: datetime.date | None = None
    date__lte: datetime.date | None = None
    activity_type: ActivityType | None = None
    status: EventStatus | None = None
    psychologist_id: UUID | None = None
    respondent_id: UUID | None = None
    task_id: UUID | None = None
    is_archived: bool = False


class EventsPaginationResponse(Pagination[EventResponse]):
    model_config = ConfigDict(from_attributes=True)
