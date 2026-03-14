import bcrypt
import pytest_asyncio

from app.api.common.utils import build_filters
from app.api.modules.users.enums import UserRole
from app.api.modules.users.models import User
from app.database.uow import UnitOfWork


async def _create_user(uow: UnitOfWork, username: str, password: str, role: UserRole) -> User:
    filters = build_filters(User, {"username": username})
    users = await uow.users.get_all(limit=1, offset=0, filters=filters)
    if users:
        return users[0]

    hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()
    user = User(username=username, password=hashed_password, role=role, is_active=True)
    await uow.users.create(user)
    await uow.commit()
    return user


@pytest_asyncio.fixture
async def user(uow: UnitOfWork) -> User:
    return await _create_user(uow, "admin", "admin123", UserRole.admin)


@pytest_asyncio.fixture
async def psychologist_user(uow: UnitOfWork) -> User:
    return await _create_user(uow, "psychologist", "psych123", UserRole.psychologist)


@pytest_asyncio.fixture
async def respondent_user(uow: UnitOfWork) -> User:
    return await _create_user(uow, "respondent", "resp123", UserRole.respondent)
