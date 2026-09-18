from typing import Any

from sqlalchemy.orm import Session

from app.models.cash import AuditLog


def record_audit(
    db: Session,
    *,
    organization_id: int | None,
    user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    amount: float | None = None,
    before_data: str | None = None,
    after_data: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        amount=amount,
        before_data=before_data,
        after_data=after_data,
    )
    db.add(entry)
    db.flush()
    return entry
