from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import BootstrapAdminRequest, LoginRequest, UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


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
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> UserRead:
    user = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower()))
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect")
    access_token = create_access_token(user.id, user.role)
    set_auth_cookie(response, access_token)
    user_data = UserRead.model_validate(user).model_dump()
    user_data["access_token"] = access_token
    return user_data


@router.post("/bootstrap", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def bootstrap_admin(payload: BootstrapAdminRequest, db: Session = Depends(get_db)) -> User:
    if db.scalar(select(User.id).limit(1)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An initial user already exists")

    organization = Organization(name=payload.organization_name.strip(), slug=(payload.organization_name.strip().lower().replace(" ", "-") or "organization"))
    if db.scalar(select(Organization.id).where(Organization.slug == organization.slug)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization name already exists")

    db.add(organization)
    db.flush()

    admin = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role="admin",
        organization_id=organization.id,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_organization(payload: BootstrapAdminRequest, response: Response, db: Session = Depends(get_db)) -> User:
    email = payload.email.lower().strip()
    if db.scalar(select(User).where(func.lower(User.email) == email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    organization = Organization(
        name=payload.organization_name.strip(),
        slug=(payload.organization_name.strip().lower().replace(" ", "-") or "organization"),
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
    set_auth_cookie(response, create_access_token(admin.id, admin.role))
    return admin


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie("access_token", path="/")


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


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
        organization_id=current_user.organization_id,
    )
    db.add(user)
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