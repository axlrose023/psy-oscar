from uuid import UUID

from dishka import FromDishka
from dishka.integrations.fastapi import DishkaRoute
from fastapi import APIRouter, Depends, Path

from app.api.modules.auth.services.auth import AuthenticateAdmin
from app.api.modules.users.manager import UserService
from app.api.modules.users.models import User
from app.api.modules.users.schema import (
    CreateUserRequest,
    UpdateUserProfileRequest,
    UserCourseCreate,
    UserCourseResponse,
    UserCourseUpdate,
    UserDetailResponse,
    UserDisciplineCreate,
    UserDisciplineResponse,
    UserDisciplineUpdate,
    UserDocumentCreate,
    UserDocumentResponse,
    UserDocumentUpdate,
    UserEducationCreate,
    UserEducationResponse,
    UserEducationUpdate,
    UserFamilyMemberCreate,
    UserFamilyMemberResponse,
    UserFamilyMemberUpdate,
    UserResponse,
)

router = APIRouter(route_class=DishkaRoute)


# --- User CRUD ---


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    request: CreateUserRequest,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
) -> UserResponse:
    return await service.create_user(request)


@router.patch("/{user_id}", response_model=UserDetailResponse)
async def update_user_profile(
    request: UpdateUserProfileRequest,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
) -> UserDetailResponse:
    return await service.update_profile(user_id, request, current_user)


# --- Family members ---


@router.post(
    "/{user_id}/family-members",
    response_model=UserFamilyMemberResponse,
    status_code=201,
)
async def add_family_member(
    request: UserFamilyMemberCreate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
) -> UserFamilyMemberResponse:
    return await service.add_related(
        "family_members", user_id, request.model_dump(), current_user
    )


@router.patch(
    "/{user_id}/family-members/{entry_id}",
    response_model=UserFamilyMemberResponse,
)
async def update_family_member(
    request: UserFamilyMemberUpdate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
    entry_id: UUID = Path(...),
) -> UserFamilyMemberResponse:
    return await service.update_related(
        "family_members", user_id, entry_id, request.model_dump(exclude_unset=True), current_user
    )


@router.delete("/{user_id}/family-members/{entry_id}", status_code=204)
async def delete_family_member(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
    entry_id: UUID = Path(...),
) -> None:
    await service.delete_related("family_members", user_id, entry_id, current_user)


# --- Education ---


@router.post(
    "/{user_id}/education",
    response_model=UserEducationResponse,
    status_code=201,
)
async def add_education(
    request: UserEducationCreate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
) -> UserEducationResponse:
    return await service.add_related(
        "education", user_id, request.model_dump(), current_user
    )


@router.patch(
    "/{user_id}/education/{entry_id}",
    response_model=UserEducationResponse,
)
async def update_education(
    request: UserEducationUpdate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
    entry_id: UUID = Path(...),
) -> UserEducationResponse:
    return await service.update_related(
        "education", user_id, entry_id, request.model_dump(exclude_unset=True), current_user
    )


@router.delete("/{user_id}/education/{entry_id}", status_code=204)
async def delete_education(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
    entry_id: UUID = Path(...),
) -> None:
    await service.delete_related("education", user_id, entry_id, current_user)


# --- Courses ---


@router.post(
    "/{user_id}/courses",
    response_model=UserCourseResponse,
    status_code=201,
)
async def add_course(
    request: UserCourseCreate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
) -> UserCourseResponse:
    return await service.add_related(
        "courses", user_id, request.model_dump(), current_user
    )


@router.patch(
    "/{user_id}/courses/{entry_id}",
    response_model=UserCourseResponse,
)
async def update_course(
    request: UserCourseUpdate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
    entry_id: UUID = Path(...),
) -> UserCourseResponse:
    return await service.update_related(
        "courses", user_id, entry_id, request.model_dump(exclude_unset=True), current_user
    )


@router.delete("/{user_id}/courses/{entry_id}", status_code=204)
async def delete_course(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
    entry_id: UUID = Path(...),
) -> None:
    await service.delete_related("courses", user_id, entry_id, current_user)


# --- Disciplines ---


@router.post(
    "/{user_id}/disciplines",
    response_model=UserDisciplineResponse,
    status_code=201,
)
async def add_discipline(
    request: UserDisciplineCreate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
) -> UserDisciplineResponse:
    return await service.add_related(
        "disciplines", user_id, request.model_dump(), current_user
    )


@router.patch(
    "/{user_id}/disciplines/{entry_id}",
    response_model=UserDisciplineResponse,
)
async def update_discipline(
    request: UserDisciplineUpdate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
    entry_id: UUID = Path(...),
) -> UserDisciplineResponse:
    return await service.update_related(
        "disciplines", user_id, entry_id, request.model_dump(exclude_unset=True), current_user
    )


@router.delete("/{user_id}/disciplines/{entry_id}", status_code=204)
async def delete_discipline(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
    entry_id: UUID = Path(...),
) -> None:
    await service.delete_related("disciplines", user_id, entry_id, current_user)


# --- Documents ---


@router.post(
    "/{user_id}/documents",
    response_model=UserDocumentResponse,
    status_code=201,
)
async def add_document(
    request: UserDocumentCreate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
) -> UserDocumentResponse:
    return await service.add_related(
        "documents", user_id, request.model_dump(), current_user
    )


@router.patch(
    "/{user_id}/documents/{entry_id}",
    response_model=UserDocumentResponse,
)
async def update_document(
    request: UserDocumentUpdate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
    entry_id: UUID = Path(...),
) -> UserDocumentResponse:
    return await service.update_related(
        "documents", user_id, entry_id, request.model_dump(exclude_unset=True), current_user
    )


@router.delete("/{user_id}/documents/{entry_id}", status_code=204)
async def delete_document(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateAdmin()),
    user_id: UUID = Path(...),
    entry_id: UUID = Path(...),
) -> None:
    await service.delete_related("documents", user_id, entry_id, current_user)
