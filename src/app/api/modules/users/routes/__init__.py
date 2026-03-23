from .admin.routes import router as admin_router
from .common.routes import router as common_router

__all__ = ["admin_router", "common_router"]
