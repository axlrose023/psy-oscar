from uuid import UUID

import bcrypt
from fastapi import HTTPException, status
from sqlalchemy import select

from app.api.common.utils import build_filters
from app.api.modules.auth.manager import AuthService
from app.api.modules.users.enums import UserRole
from app.api.modules.users.models import (
    User,
    UserCourse,
    UserDiscipline,
    UserDocument,
    UserEducation,
    UserFamilyMember,
)
from app.api.modules.users.schema import (
    ChangePasswordRequest,
    CreateUserRequest,
    UpdateUserProfileRequest,
    UsersPaginationParams,
    UsersPaginationResponse,
)
from app.database.uow import UnitOfWork

# Mapping: related entity name → model class
_RELATED_MODELS = {
    "family_members": UserFamilyMember,
    "education": UserEducation,
    "courses": UserCourse,
    "disciplines": UserDiscipline,
    "documents": UserDocument,
}


class UserService:
    def __init__(self, uow: UnitOfWork, auth_service: AuthService):
        self.uow = uow
        self.auth_service = auth_service

    # --- Helpers ---

    async def _get_user_or_404(self, user_id: UUID) -> User:
        user = await self.uow.users.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return user

    async def _get_detail_or_404(self, user_id: UUID) -> User:
        user = await self.uow.users.get_detail_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return user

    def _ensure_can_edit(self, target_id: UUID, current_user: User) -> None:
        if current_user.role != UserRole.admin and current_user.id != target_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own profile",
            )

    async def _get_related_or_404(
        self, entity_name: str, entity_id: UUID, user_id: UUID
    ):
        model = _RELATED_MODELS[entity_name]
        result = await self.uow.session.execute(
            select(model).where(model.id == entity_id, model.user_id == user_id)
        )
        entity = result.scalar_one_or_none()
        if not entity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{entity_name} entry not found",
            )
        return entity

    # --- Users CRUD ---

    async def get_users(
        self,
        params: UsersPaginationParams,
    ) -> UsersPaginationResponse:
        pagination_data = params.model_dump(exclude_unset=True)
        pagination_data.pop("page_size", None)
        pagination_data.pop("page", None)

        filters = build_filters(User, pagination_data)

        users = await self.uow.users.get_all(
            limit=params.page_size,
            offset=params.offset,
            filters=filters,
        )
        total = await self.uow.users.get_total_count(filters)
        return UsersPaginationResponse(
            total=total,
            items=users,
            page=params.page,
            page_size=params.page_size,
        )

    async def get_user_by_id(self, user_id: UUID) -> User:
        return await self._get_detail_or_404(user_id)

    async def create_user(self, request: CreateUserRequest) -> User:
        hashed_password = self.auth_service.hash_password(request.password)
        user = User(
            username=request.username,
            password=hashed_password,
            role=request.role,
            is_active=True,
        )
        await self.uow.users.create(user)
        await self.uow.commit()
        return user

    # --- Profile ---

    async def update_profile(
        self, user_id: UUID, request: UpdateUserProfileRequest, current_user: User
    ) -> User:
        self._ensure_can_edit(user_id, current_user)
        user = await self._get_user_or_404(user_id)
        data = request.model_dump(exclude_unset=True)
        if not data:
            return await self._get_detail_or_404(user_id)
        await self.uow.users.update(user, data)
        await self.uow.commit()
        return await self._get_detail_or_404(user_id)

    async def change_password(
        self, current_user: User, request: ChangePasswordRequest
    ) -> None:
        user = await self._get_user_or_404(current_user.id)
        if not bcrypt.checkpw(
            request.old_password.encode("utf-8"), user.password.encode("utf-8")
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Old password is incorrect",
            )
        hashed = self.auth_service.hash_password(request.new_password)
        await self.uow.users.update(user, {"password": hashed})
        await self.uow.commit()

    # --- Related entities CRUD ---

    async def add_related(
        self, entity_name: str, user_id: UUID, data: dict, current_user: User
    ):
        self._ensure_can_edit(user_id, current_user)
        await self._get_user_or_404(user_id)
        model = _RELATED_MODELS[entity_name]
        entity = model(user_id=user_id, **data)
        self.uow.session.add(entity)
        await self.uow.commit()
        await self.uow.refresh(entity)
        return entity

    async def get_related_list(self, entity_name: str, user_id: UUID):
        await self._get_user_or_404(user_id)
        model = _RELATED_MODELS[entity_name]
        result = await self.uow.session.execute(
            select(model).where(model.user_id == user_id)
        )
        return result.scalars().all()

    async def update_related(
        self,
        entity_name: str,
        user_id: UUID,
        entity_id: UUID,
        data: dict,
        current_user: User,
    ):
        self._ensure_can_edit(user_id, current_user)
        entity = await self._get_related_or_404(entity_name, entity_id, user_id)
        for key, value in data.items():
            setattr(entity, key, value)
        await self.uow.commit()
        await self.uow.refresh(entity)
        return entity

    async def delete_related(
        self, entity_name: str, user_id: UUID, entity_id: UUID, current_user: User
    ) -> None:
        self._ensure_can_edit(user_id, current_user)
        entity = await self._get_related_or_404(entity_name, entity_id, user_id)
        await self.uow.session.delete(entity)
        await self.uow.commit()
