from collections.abc import Generator

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.modules import enabled_module_keys
from app.core.security import decode_access_token, hash_password
from app.models.organization import Organization
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def set_request_organization_context(db: Session, organization_id: int | None) -> None:
    if organization_id is None or settings.database_url.startswith("sqlite"):
        return

    try:
        db.execute(text("SET LOCAL app.current_organization_id = :organization_id"), {"organization_id": organization_id})
    except Exception:
        pass


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    access_token = credentials.credentials if credentials is not None else request.cookies.get("access_token")
    if access_token is None:
        if settings.app_env.lower() in {"development", "test"}:
            organization = db.scalar(select(Organization).order_by(Organization.id))
            if organization is None:
                organization = Organization(name="Default Organization", slug="default-organization")
                db.add(organization)
                db.flush()

            user = db.scalar(select(User).order_by(User.id))
            if user is None:
                user = User(
                    email="admin@local.test",
                    full_name="System Admin",
                    password_hash=hash_password("admin12345"),
                    role="admin",
                    organization_id=organization.id,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            return user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    try:
        payload = decode_access_token(access_token)
        user_id = int(payload.get("sub", 0))
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token") from None

    user = db.scalar(select(User).where(User.id == user_id))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive or unknown")
    set_request_organization_context(db, user.organization_id)
    return user


def get_current_organization(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Organization:
    organization = db.scalar(select(Organization).where(Organization.id == current_user.organization_id))
    if organization is None or not organization.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization not available")
    return organization


def require_roles(*roles: str):
    def dependency(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        set_request_organization_context(db, current_user.organization_id)
        organization = db.scalar(select(Organization).where(Organization.id == current_user.organization_id, Organization.is_active.is_(True)))
        if organization is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization not available")
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return dependency


def require_module(module_key: str):
    def dependency(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        set_request_organization_context(db, current_user.organization_id)
        organization = db.scalar(select(Organization).where(Organization.id == current_user.organization_id, Organization.is_active.is_(True)))
        if organization is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization not available")
        if module_key not in enabled_module_keys(db, organization.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Module '{module_key}' is not enabled for this organization")
        return current_user

    return dependency
