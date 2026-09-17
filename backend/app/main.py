from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings

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
async def enforce_csrf_origin(request, call_next):
    if settings.app_env.lower() == "production" and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("origin")
        import re

        if origin not in settings.cors_origins and not re.fullmatch(settings.cors_origin_regex, origin or ""):
            from fastapi.responses import JSONResponse

            return JSONResponse(status_code=403, content={"detail": "Invalid request origin"})
    return await call_next(request)

app.include_router(api_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "app": settings.app_name}


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "ERP Platform API"}
