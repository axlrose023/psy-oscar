from fastapi import APIRouter


def register_routers(router: APIRouter) -> None:
    from app.api.modules.auth.routes import router as auth_router
    from app.api.modules.events.routes import router as events_router
    from app.api.modules.notifications.routes import router as notifications_router
    from app.api.modules.tasks.routes import (
        admin_router as tasks_admin_router,
        common_router as tasks_common_router,
        psychologist_router as tasks_psychologist_router,
    )
    from app.api.modules.users.routes import (
        admin_router as users_admin_router,
        common_router as users_common_router,
    )

    router.include_router(auth_router, prefix="/auth", tags=["Auth"])
    router.include_router(users_common_router, prefix="/users", tags=["Users"])
    router.include_router(users_admin_router, prefix="/users", tags=["Users - Admin"])
    router.include_router(tasks_admin_router, prefix="/tasks", tags=["Tasks - Admin"])
    router.include_router(tasks_psychologist_router, prefix="/tasks", tags=["Tasks - Psychologist"])
    router.include_router(tasks_common_router, prefix="/tasks", tags=["Tasks - Common"])
    router.include_router(events_router, prefix="/events", tags=["Events"])
    router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
