import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from api.routes import health, pipelines
from api.routes import auth, projects, canvas, validation, deployments, activity, settings
from core.config import settings as app_settings

app = FastAPI(
    title=app_settings.app_name,
    version=app_settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)


async def _catch_unhandled(request: Request, call_next):
    """
    Return unhandled exceptions as a JSON 500 from *inside* the CORS layer.

    Starlette's default ServerErrorMiddleware sits OUTSIDE the CORS middleware,
    so a raw 500 it generates carries no Access-Control-Allow-Origin header. The
    browser then reports the request as a CORS failure ("No 'Access-Control-
    Allow-Origin' header is present") and hides the real error. Catching the
    exception here means the 500 response flows back out through CORSMiddleware
    and keeps its CORS headers, so every endpoint returns proper CORS headers
    even on error.
    """
    try:
        return await call_next(request)
    except Exception:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# Middleware ordering: the LAST middleware added is the OUTERMOST. Add the
# catch-all first and CORS last, so CORS wraps everything (including the 500s
# produced above) and decorates every response with CORS headers. Registered
# before any routes so it applies app-wide.
app.add_middleware(BaseHTTPMiddleware, dispatch=_catch_unhandled)
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.cors_origins,           # http://localhost:3000, http://127.0.0.1:3000
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Legacy routes
app.include_router(health.router)
app.include_router(pipelines.router)

# Full API routes
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(canvas.router)
app.include_router(validation.router)
app.include_router(deployments.router)
app.include_router(activity.router)
app.include_router(settings.router)
