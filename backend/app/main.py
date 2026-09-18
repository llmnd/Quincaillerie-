import logging
import time
from datetime import UTC, datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.router import api_router
from app.core.config import settings
from app.core.database import engine

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO), format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("quincaillerie")

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="ERP SaaS multi-entreprises, core modulaire et multi-tenant",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def enforce_csrf_origin(request: Request, call_next):
    if settings.app_env.lower() == "production" and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("origin")
        import re

        if origin not in settings.cors_origins and not re.fullmatch(settings.cors_origin_regex, origin or ""):
            from fastapi.responses import JSONResponse

            return JSONResponse(status_code=403, content={"detail": "Invalid request origin"})

    start_time = time.perf_counter()
    response = await call_next(request)
    process_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
    logger.info(
        "http_request path=%s method=%s status=%s duration_ms=%s",
        request.url.path,
        request.method,
        response.status_code,
        process_time_ms,
    )
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return response

app.include_router(api_router)


@app.get("/health")
def health_check() -> dict[str, object]:
    try:
        with engine.begin() as connection:
            connection.execute(text("SELECT 1"))
        database_status = "ok"
    except Exception:
        database_status = "degraded"

    return {
        "status": "ok" if database_status == "ok" else "degraded",
        "app": settings.app_name,
        "database": database_status,
        "timestamp": datetime.now(UTC).isoformat(),
        "version": "0.1.0",
    }


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "ERP Platform API"}
