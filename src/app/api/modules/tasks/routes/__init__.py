from .admin.routes import router as admin_router
from .common.routes import router as common_router
from .psychologist.routes import router as psychologist_router

__all__ = ["admin_router", "common_router", "psychologist_router"]
