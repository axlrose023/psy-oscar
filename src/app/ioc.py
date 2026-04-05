from collections.abc import AsyncIterator

from dishka import AsyncContainer, Provider, Scope, make_async_container, provide
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.modules.auth.manager import AuthService
from app.api.modules.auth.services import JwtService
from app.api.modules.events.services.event import EventService
from app.api.modules.events.services.history import EventHistoryService
from app.api.modules.notifications.service import NotificationService
from app.api.modules.tasks.services.comment import CommentService
from app.api.modules.tasks.services.history import HistoryService
from app.api.modules.tasks.services.task import TaskService
from app.api.modules.users.manager import UserService
from app.clients.providers import HttpClientsProvider
from app.database.engine import SessionFactory
from app.database.uow import UnitOfWork
from app.settings import Config, get_config


class AppProvider(Provider):
    """Application provider for dependency injection."""

    @provide(scope=Scope.APP)
    def get_config(self) -> Config:
        return get_config()

    @provide(scope=Scope.REQUEST)
    async def get_session(self) -> AsyncIterator[AsyncSession]:
        async with SessionFactory() as session:
            yield session

    @provide(scope=Scope.REQUEST)
    async def get_uow(self, session: AsyncSession) -> AsyncIterator[UnitOfWork]:
        async with UnitOfWork(session) as uow:
            yield uow


class ServicesProvider(Provider):
    """Services provider for dependency injection."""

    @provide(scope=Scope.APP)
    def get_jwt_service(self, config: Config) -> JwtService:
        return JwtService(config)

    @provide(scope=Scope.REQUEST)
    async def get_auth_service(
        self, uow: UnitOfWork, jwt_service: JwtService
    ) -> AuthService:
        return AuthService(uow, jwt_service)

    @provide(scope=Scope.REQUEST)
    async def get_user_service(
        self, uow: UnitOfWork, auth_service: AuthService
    ) -> UserService:
        return UserService(uow, auth_service)

    @provide(scope=Scope.REQUEST)
    async def get_task_service(self, uow: UnitOfWork, notification_service: NotificationService) -> TaskService:
        return TaskService(uow, notification_service)

    @provide(scope=Scope.REQUEST)
    async def get_history_service(self, uow: UnitOfWork) -> HistoryService:
        return HistoryService(uow)

    @provide(scope=Scope.REQUEST)
    async def get_comment_service(self, uow: UnitOfWork) -> CommentService:
        return CommentService(uow)

    @provide(scope=Scope.REQUEST)
    async def get_event_service(self, uow: UnitOfWork) -> EventService:
        return EventService(uow)

    @provide(scope=Scope.REQUEST)
    async def get_event_history_service(self, uow: UnitOfWork) -> EventHistoryService:
        return EventHistoryService(uow)

    @provide(scope=Scope.REQUEST)
    async def get_notification_service(self, uow: UnitOfWork) -> NotificationService:
        return NotificationService(uow)


def get_async_container() -> AsyncContainer:
    return make_async_container(
        AppProvider(),
        ServicesProvider(),
        HttpClientsProvider(),
    )
