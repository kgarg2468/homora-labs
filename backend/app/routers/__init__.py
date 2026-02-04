from app.routers.projects import router as projects_router
from app.routers.documents import router as documents_router
from app.routers.chat import router as chat_router
from app.routers.search import router as search_router
from app.routers.reports import router as reports_router
from app.routers.settings import router as settings_router

__all__ = [
    "projects_router",
    "documents_router",
    "chat_router",
    "search_router",
    "reports_router",
    "settings_router",
]
