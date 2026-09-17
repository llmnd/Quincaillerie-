from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.core.modules import MODULES_BY_KEY, ensure_organization_modules
from app.models.organization import OrganizationModule
from app.models.user import User

router = APIRouter(prefix="/organization/modules", tags=["organization-modules"])


def serialize_module(module: OrganizationModule) -> dict[str, object]:
    definition = MODULES_BY_KEY[module.module_key]
    return {
        "key": module.module_key,
        "label": definition["label"],
        "description": definition["description"],
        "href": definition["href"],
        "required": definition["required"],
        "enabled": module.enabled,
    }


@router.get("")
def list_modules(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "seller")),
) -> list[dict[str, object]]:
    return [serialize_module(module) for module in ensure_organization_modules(db, current_user.organization_id)]


@router.patch("/{module_key}")
def set_module_enabled(
    module_key: str,
    enabled: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, object]:
    definition = MODULES_BY_KEY.get(module_key)
    if definition is None:
        raise HTTPException(status_code=404, detail="Module not found")
    if bool(definition["required"]) and not enabled:
        raise HTTPException(status_code=400, detail="This module is required and cannot be disabled")

    modules = ensure_organization_modules(db, current_user.organization_id)
    module = next(module for module in modules if module.module_key == module_key)
    module.enabled = enabled
    db.commit()
    db.refresh(module)
    return serialize_module(module)
