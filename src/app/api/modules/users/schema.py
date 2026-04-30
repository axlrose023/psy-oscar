import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.api.common.schema import Pagination, PaginationParams
from app.api.modules.users.enums import UserRole


# --- Base Response (list/short) ---


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    username: str
    role: UserRole
    is_active: bool
    is_archived: bool


# --- Related entity schemas ---


class UserFamilyMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    relation_type: str
    last_name: str
    first_name: str
    patronymic: str | None = None
    birth_date: datetime.date | None = None
    address: str | None = None


class UserFamilyMemberCreate(BaseModel):
    relation_type: str = Field(..., min_length=1, max_length=20)
    last_name: str = Field(..., min_length=1, max_length=30)
    first_name: str = Field(..., min_length=1, max_length=20)
    patronymic: str | None = Field(None, max_length=20)
    birth_date: datetime.date | None = None
    address: str | None = Field(None, max_length=200)
    model_config = ConfigDict(extra="forbid")


class UserFamilyMemberUpdate(BaseModel):
    relation_type: str | None = Field(None, min_length=1, max_length=20)
    last_name: str | None = Field(None, min_length=1, max_length=30)
    first_name: str | None = Field(None, min_length=1, max_length=20)
    patronymic: str | None = Field(None, max_length=20)
    birth_date: datetime.date | None = None
    address: str | None = Field(None, max_length=200)
    model_config = ConfigDict(extra="forbid")


class UserEducationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    institution: str
    graduation_date: datetime.date | None = None
    education_level: str | None = None
    speciality: str | None = None


class UserEducationCreate(BaseModel):
    institution: str = Field(..., min_length=1, max_length=100)
    graduation_date: datetime.date | None = None
    education_level: str | None = Field(None, max_length=50)
    speciality: str | None = Field(None, max_length=100)
    model_config = ConfigDict(extra="forbid")


class UserEducationUpdate(BaseModel):
    institution: str | None = Field(None, min_length=1, max_length=100)
    graduation_date: datetime.date | None = None
    education_level: str | None = Field(None, max_length=50)
    speciality: str | None = Field(None, max_length=100)
    model_config = ConfigDict(extra="forbid")


class UserCourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    institution: str
    completion_date: datetime.date | None = None
    topic: str | None = None
    ect_hours: int | None = None


class UserCourseCreate(BaseModel):
    institution: str = Field(..., min_length=1, max_length=100)
    completion_date: datetime.date | None = None
    topic: str | None = Field(None, max_length=100)
    ect_hours: int | None = None
    model_config = ConfigDict(extra="forbid")


class UserCourseUpdate(BaseModel):
    institution: str | None = Field(None, min_length=1, max_length=100)
    completion_date: datetime.date | None = None
    topic: str | None = Field(None, max_length=100)
    ect_hours: int | None = None
    model_config = ConfigDict(extra="forbid")


class UserDisciplineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    type: str
    date: datetime.date | None = None
    authority: str | None = None


class UserDisciplineCreate(BaseModel):
    type: str = Field(..., min_length=1, max_length=50)
    date: datetime.date | None = None
    authority: str | None = Field(None, max_length=50)
    model_config = ConfigDict(extra="forbid")


class UserDisciplineUpdate(BaseModel):
    type: str | None = Field(None, min_length=1, max_length=50)
    date: datetime.date | None = None
    authority: str | None = Field(None, max_length=50)
    model_config = ConfigDict(extra="forbid")


class UserDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    title: str
    file_path: str
    description: str | None = None


class UserDocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=50)
    file_path: str = Field(..., min_length=1)
    description: str | None = None
    model_config = ConfigDict(extra="forbid")


class UserDocumentUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=50)
    file_path: str | None = Field(None, min_length=1)
    description: str | None = None
    model_config = ConfigDict(extra="forbid")


# --- Detail Response (profile + related) ---


class UserDetailResponse(UserResponse):
    tax_number: str | None = None
    last_name: str | None = None
    first_name: str | None = None
    patronymic: str | None = None
    photo: str | None = None
    birth_date: datetime.date | None = None
    phone: str | None = None
    email: str | None = None
    military_rank: str | None = None
    position: str | None = None
    address: str | None = None
    marital_status: str | None = None
    social_accounts: str | None = None
    combat_participation: bool | None = None
    reserve_status: bool | None = None
    housing: str | None = None
    rating: str | None = None
    contract_end_date: datetime.date | None = None
    pz_direction: str | None = None
    is_active: bool
    is_archived: bool

    family_members: list[UserFamilyMemberResponse] = []
    education: list[UserEducationResponse] = []
    courses: list[UserCourseResponse] = []
    disciplines: list[UserDisciplineResponse] = []
    documents: list[UserDocumentResponse] = []


# --- Profile update ---


class UpdateUserProfileRequest(BaseModel):
    tax_number: str | None = Field(None, max_length=10)
    last_name: str | None = Field(None, max_length=30)
    first_name: str | None = Field(None, max_length=20)
    patronymic: str | None = Field(None, max_length=20)
    photo: str | None = None
    birth_date: datetime.date | None = None
    phone: str | None = Field(None, max_length=30)
    email: str | None = Field(None, max_length=50)
    military_rank: str | None = Field(None, max_length=50)
    position: str | None = Field(None, max_length=200)
    address: str | None = Field(None, max_length=200)
    marital_status: str | None = Field(None, max_length=100)
    social_accounts: str | None = Field(None, max_length=200)
    combat_participation: bool | None = None
    reserve_status: bool | None = None
    housing: str | None = Field(None, max_length=50)
    rating: str | None = Field(None, max_length=5)
    contract_end_date: datetime.date | None = None
    pz_direction: str | None = Field(None, max_length=50)

    model_config = ConfigDict(extra="forbid")


# --- Password change ---


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=20)

    model_config = ConfigDict(extra="forbid")


# --- Birthdays ---


class BirthdayEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    username: str
    last_name: str | None = None
    first_name: str | None = None
    patronymic: str | None = None
    military_rank: str | None = None
    birth_date: datetime.date
    days_until: int


# --- Pagination (existing) ---


class UsersPaginationResponse(Pagination[UserResponse]):
    model_config = ConfigDict(from_attributes=True)
    pass


class UsersPaginationParams(PaginationParams):
    id: UUID | None = None
    username: str | None = None
    username__search: str | None = None
    role: UserRole | None = None


# --- Create (existing, unchanged) ---


class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    role: UserRole = UserRole.respondent

    model_config = ConfigDict(extra="forbid")
