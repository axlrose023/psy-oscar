from uuid import UUID

from dishka import FromDishka
from dishka.integrations.fastapi import DishkaRoute
from fastapi import APIRouter, Depends, Path
from fastapi.params import Query

from app.api.modules.auth.services.auth import (
    AuthenticatePsychologist,
    AuthenticateRespondent,
)
from app.api.modules.users.manager import UserService
from app.api.modules.users.models import User
from app.api.modules.users.schema import (
    ChangePasswordRequest,
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
    UsersPaginationParams,
    UsersPaginationResponse,
)

router = APIRouter(route_class=DishkaRoute)


# --- List / Detail (psychologist+) ---


@router.get("", response_model=UsersPaginationResponse)
async def get_users(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticatePsychologist()),
    params: UsersPaginationParams = Query(),
) -> UsersPaginationResponse:
    return await service.get_users(params=params)


@router.get("/me", response_model=UserDetailResponse)
async def get_me(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
) -> UserDetailResponse:
    return await service.get_user_by_id(current_user.id)


@router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user_by_id(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticatePsychologist()),
    user_id: UUID = Path(...),
) -> UserDetailResponse:
    return await service.get_user_by_id(user_id)


# --- Profile (any authenticated) ---


@router.patch("/me", response_model=UserDetailResponse)
async def update_my_profile(
    request: UpdateUserProfileRequest,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
) -> UserDetailResponse:
    return await service.update_profile(current_user.id, request, current_user)


@router.put("/me/password", status_code=204)
async def change_my_password(
    request: ChangePasswordRequest,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
) -> None:
    await service.change_password(current_user, request)


# --- My family members ---


@router.get("/me/family-members", response_model=list[UserFamilyMemberResponse])
async def get_my_family_members(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
) -> list[UserFamilyMemberResponse]:
    return await service.get_related_list("family_members", current_user.id)


@router.post(
    "/me/family-members",
    response_model=UserFamilyMemberResponse,
    status_code=201,
)
async def add_my_family_member(
    request: UserFamilyMemberCreate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
) -> UserFamilyMemberResponse:
    return await service.add_related(
        "family_members", current_user.id, request.model_dump(), current_user
    )


@router.patch("/me/family-members/{entry_id}", response_model=UserFamilyMemberResponse)
async def update_my_family_member(
    request: UserFamilyMemberUpdate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
    entry_id: UUID = Path(...),
) -> UserFamilyMemberResponse:
    return await service.update_related(
        "family_members", current_user.id, entry_id, request.model_dump(exclude_unset=True), current_user
    )


@router.delete("/me/family-members/{entry_id}", status_code=204)
async def delete_my_family_member(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
    entry_id: UUID = Path(...),
) -> None:
    await service.delete_related("family_members", current_user.id, entry_id, current_user)


# --- My education ---


@router.get("/me/education", response_model=list[UserEducationResponse])
async def get_my_education(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
) -> list[UserEducationResponse]:
    return await service.get_related_list("education", current_user.id)


@router.post("/me/education", response_model=UserEducationResponse, status_code=201)
async def add_my_education(
    request: UserEducationCreate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
) -> UserEducationResponse:
    return await service.add_related(
        "education", current_user.id, request.model_dump(), current_user
    )


@router.patch("/me/education/{entry_id}", response_model=UserEducationResponse)
async def update_my_education(
    request: UserEducationUpdate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
    entry_id: UUID = Path(...),
) -> UserEducationResponse:
    return await service.update_related(
        "education", current_user.id, entry_id, request.model_dump(exclude_unset=True), current_user
    )


@router.delete("/me/education/{entry_id}", status_code=204)
async def delete_my_education(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
    entry_id: UUID = Path(...),
) -> None:
    await service.delete_related("education", current_user.id, entry_id, current_user)


# --- My courses ---


@router.get("/me/courses", response_model=list[UserCourseResponse])
async def get_my_courses(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
) -> list[UserCourseResponse]:
    return await service.get_related_list("courses", current_user.id)


@router.post("/me/courses", response_model=UserCourseResponse, status_code=201)
async def add_my_course(
    request: UserCourseCreate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
) -> UserCourseResponse:
    return await service.add_related(
        "courses", current_user.id, request.model_dump(), current_user
    )


@router.patch("/me/courses/{entry_id}", response_model=UserCourseResponse)
async def update_my_course(
    request: UserCourseUpdate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
    entry_id: UUID = Path(...),
) -> UserCourseResponse:
    return await service.update_related(
        "courses", current_user.id, entry_id, request.model_dump(exclude_unset=True), current_user
    )


@router.delete("/me/courses/{entry_id}", status_code=204)
async def delete_my_course(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
    entry_id: UUID = Path(...),
) -> None:
    await service.delete_related("courses", current_user.id, entry_id, current_user)


# --- My disciplines ---


@router.get("/me/disciplines", response_model=list[UserDisciplineResponse])
async def get_my_disciplines(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
) -> list[UserDisciplineResponse]:
    return await service.get_related_list("disciplines", current_user.id)


@router.post("/me/disciplines", response_model=UserDisciplineResponse, status_code=201)
async def add_my_discipline(
    request: UserDisciplineCreate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
) -> UserDisciplineResponse:
    return await service.add_related(
        "disciplines", current_user.id, request.model_dump(), current_user
    )


@router.patch("/me/disciplines/{entry_id}", response_model=UserDisciplineResponse)
async def update_my_discipline(
    request: UserDisciplineUpdate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
    entry_id: UUID = Path(...),
) -> UserDisciplineResponse:
    return await service.update_related(
        "disciplines", current_user.id, entry_id, request.model_dump(exclude_unset=True), current_user
    )


@router.delete("/me/disciplines/{entry_id}", status_code=204)
async def delete_my_discipline(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
    entry_id: UUID = Path(...),
) -> None:
    await service.delete_related("disciplines", current_user.id, entry_id, current_user)


# --- My documents ---


@router.get("/me/documents", response_model=list[UserDocumentResponse])
async def get_my_documents(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
) -> list[UserDocumentResponse]:
    return await service.get_related_list("documents", current_user.id)


@router.post("/me/documents", response_model=UserDocumentResponse, status_code=201)
async def add_my_document(
    request: UserDocumentCreate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
) -> UserDocumentResponse:
    return await service.add_related(
        "documents", current_user.id, request.model_dump(), current_user
    )


@router.patch("/me/documents/{entry_id}", response_model=UserDocumentResponse)
async def update_my_document(
    request: UserDocumentUpdate,
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
    entry_id: UUID = Path(...),
) -> UserDocumentResponse:
    return await service.update_related(
        "documents", current_user.id, entry_id, request.model_dump(exclude_unset=True), current_user
    )


@router.delete("/me/documents/{entry_id}", status_code=204)
async def delete_my_document(
    service: FromDishka[UserService],
    current_user: User = Depends(AuthenticateRespondent()),
    entry_id: UUID = Path(...),
) -> None:
    await service.delete_related("documents", current_user.id, entry_id, current_user)
