import time
from collections.abc import MutableMapping

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.accounting import Account
from app.core.audit import record_audit
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import BootstrapAdminRequest, LoginRequest, PasswordChangeRequest, UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])

_LOGIN_FAILURES: MutableMapping[str, dict[str, float | int]] = {}
_LOGIN_MAX_ATTEMPTS = 5
_LOGIN_LOCKOUT_SECONDS = 300


def _login_attempt_key(request: Request, email: str) -> str:
    client_ip = request.client.host if request.client else "unknown"
    return f"{client_ip}:{email.lower().strip()}"


def _is_login_locked(request: Request, email: str) -> bool:
    key = _login_attempt_key(request, email)
    data = _LOGIN_FAILURES.get(key)
    if not data:
        return False

    now = time.monotonic()
    window_started = float(data["window_started"])
    attempts = int(data["attempts"])
    if now - window_started < _LOGIN_LOCKOUT_SECONDS:
        return attempts >= _LOGIN_MAX_ATTEMPTS

    _LOGIN_FAILURES.pop(key, None)
    return False


def _record_failed_login(request: Request, email: str) -> None:
    key = _login_attempt_key(request, email)
    now = time.monotonic()
    data = _LOGIN_FAILURES.get(key)
    if data is None or now - float(data["window_started"]) >= _LOGIN_LOCKOUT_SECONDS:
        _LOGIN_FAILURES[key] = {"window_started": now, "attempts": 1}
        return

    data["attempts"] = int(data["attempts"]) + 1


def _clear_failed_logins(request: Request, email: str) -> None:
    _LOGIN_FAILURES.pop(_login_attempt_key(request, email), None)


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.app_env.lower() == "production",
        samesite="none" if settings.app_env.lower() == "production" else "lax",
        path="/",
    )


@router.post("/login", response_model=UserRead)
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> UserRead:
    if _is_login_locked(request, payload.email):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many failed login attempts. Please try again later.")

    user = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower()))
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        _record_failed_login(request, payload.email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect")

    _clear_failed_logins(request, payload.email)
    access_token = create_access_token(user.id, user.role)
    set_auth_cookie(response, access_token)
    record_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="auth.login",
        entity_type="user",
        entity_id=user.id,
        after_data=f"role={user.role}",
    )
    db.commit()
    user_data = UserRead.model_validate(user).model_dump()
    user_data["access_token"] = access_token
    return user_data


@router.post("/bootstrap", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def bootstrap_admin(payload: BootstrapAdminRequest, db: Session = Depends(get_db)) -> User:
    if db.scalar(select(User.id).limit(1)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An initial user already exists")

    email = payload.email.lower().strip()
    organization = Organization(name=payload.organization_name.strip(), slug=(payload.organization_name.strip().lower().replace(" ", "-") or "organization"), settings={"logo": payload.organization_logo} if payload.organization_logo else {})
    if db.scalar(select(Organization.id).where(Organization.slug == organization.slug)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization name already exists")

    db.add(organization)
    db.flush()

    admin = User(
        email=email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role="admin",
        organization_id=organization.id,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    record_audit(
        db,
        organization_id=organization.id,
        user_id=admin.id,
        action="auth.register",
        entity_type="user",
        entity_id=admin.id,
        after_data=f"email={email};organization_id={organization.id}",
    )
    db.commit()
    return admin


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_organization(payload: BootstrapAdminRequest, response: Response, db: Session = Depends(get_db)) -> User:
    email = payload.email.lower().strip()
    if db.scalar(select(User).where(func.lower(User.email) == email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    organization = Organization(
        name=payload.organization_name.strip(),
        slug=(payload.organization_name.strip().lower().replace(" ", "-") or "organization"),
        settings={"logo": payload.organization_logo} if payload.organization_logo else {},
    )
    if db.scalar(select(Organization.id).where(Organization.slug == organization.slug)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization name already exists")

    db.add(organization)
    db.flush()

    admin = User(
        email=email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role="admin",
        organization_id=organization.id,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    default_accounts = [
        {"code": "411", "name": "Clients", "account_class": "4"},
        {"code": "4431", "name": "TVA facturée", "account_class": "4"},
        {"code": "571", "name": "Caisse", "account_class": "5"},
        {"code": "701", "name": "Ventes de marchandises", "account_class": "7"},
    ]
    for account_spec in default_accounts:
        existing = db.scalar(select(Account.id).where(Account.organization_id == organization.id, Account.code == account_spec["code"]))
        if existing is None:
            db.add(Account(organization_id=organization.id, **account_spec, is_active=True))
    db.commit()

    record_audit(
        db,
        organization_id=organization.id,
        user_id=admin.id,
        action="auth.register",
        entity_type="user",
        entity_id=admin.id,
        after_data=f"email={email};organization_id={organization.id}",
    )
    db.commit()
    set_auth_cookie(response, create_access_token(admin.id, admin.role))
    return admin


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie("access_token", path="/")


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_my_password(payload: PasswordChangeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> None:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()


@router.get("/users", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> list[User]:
    return db.scalars(select(User).where(User.organization_id == current_user.organization_id).order_by(User.id)).all()


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> User:
    email = payload.email.lower()
    if db.scalar(select(User).where(func.lower(User.email) == email, User.organization_id == current_user.organization_id)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    user = User(
        email=email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        permissions=payload.permissions,
        organization_id=current_user.organization_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> User:
    user = db.scalar(select(User).where(User.id == user_id, User.organization_id == current_user.organization_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.full_name is not None:
        user.full_name = payload.full_name

    if payload.email is not None:
        email = payload.email.lower().strip()
        existing = db.scalar(select(User).where(func.lower(User.email) == email, User.organization_id == current_user.organization_id, User.id != user_id))
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
        user.email = email

    if payload.role is not None:
        if user.id == current_user.id and payload.role != current_user.role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot change your own role")
        user.role = payload.role

    if payload.password is not None:
        user.password_hash = hash_password(payload.password)

    if payload.permissions is not None:
        user.permissions = payload.permissions

    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/active", response_model=UserRead)
def set_user_active(
    user_id: int,
    active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> User:
    user = db.scalar(select(User).where(User.id == user_id, User.organization_id == current_user.organization_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == current_user.id and not active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate yourself")

    user.is_active = active
    db.commit()
    db.refresh(user)
    return user