from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.models.cash import AuditLog, CashHandoff, CashOperation, CashRegister, CashSession
from app.models.sale import Sale
from app.models.user import User
from app.schemas.cash import CashOperationCreate, CashOperationRead, CashRegisterCreate, CashRegisterRead, CashSessionClose, CashSessionOpen, CashSessionRead
from app.api.deps import get_db

router = APIRouter(prefix="/cash", tags=["cash"])


def calculate_expected_cash(session_id: int, db: Session) -> float:
    session = db.get(CashSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Cash session not found")

    cash_sales = db.scalar(
        select(func.coalesce(func.sum(Sale.total_amount), 0)).where(
            Sale.session_id == session.id,
            Sale.payment_method == "cash",
        )
    ) or 0
    operations = db.scalars(
        select(CashOperation).where(
            CashOperation.session_id == session.id,
            CashOperation.operation_type != "sale",
        )
    ).all()
    expected = session.actual_opening_amount + float(cash_sales)
    for operation in operations:
        expected += operation.amount if operation.operation_type in {"cash_in", "adjustment_in"} else -operation.amount
    return expected


def get_open_cash_session(db: Session) -> CashSession | None:
    return db.scalar(select(CashSession).where(CashSession.status == "open").order_by(CashSession.id.desc()))


def get_latest_handoff(session_id: int, db: Session) -> CashHandoff | None:
    return db.scalar(select(CashHandoff).where(CashHandoff.session_id == session_id).order_by(CashHandoff.created_at.desc(), CashHandoff.id.desc()))


def handoff_is_acknowledged(session_id: int, user_id: int, db: Session) -> bool:
    latest = get_latest_handoff(session_id, db)
    return latest is not None and latest.user_id == user_id


def build_handoff_summary(session: CashSession, current_user: User, db: Session) -> dict[str, object]:
    latest = get_latest_handoff(session.id, db)
    previous_user = db.get(User, latest.user_id) if latest else db.get(User, session.user_id)
    sales = db.scalars(select(Sale).where(Sale.session_id == session.id).order_by(Sale.sale_date)).all()
    operations = db.scalars(select(CashOperation).where(CashOperation.session_id == session.id).order_by(CashOperation.created_at, CashOperation.id)).all()
    cash_sales = sum(sale.total_amount for sale in sales if sale.payment_method == "cash")
    withdrawals = sum(operation.amount for operation in operations if operation.operation_type in {"cash_out", "refund", "adjustment_out"})
    last_operation = operations[-1] if operations else None
    return {
        "session_id": session.id,
        "register_id": session.register_id,
        "current_user": current_user.full_name,
        "previous_seller": previous_user.full_name if previous_user else None,
        "handoff_at": latest.created_at if latest else session.opened_at,
        "theoretical_balance": calculate_expected_cash(session.id, db),
        "sales_total": sum(sale.total_amount for sale in sales),
        "cash_collected": cash_sales,
        "withdrawals": withdrawals,
        "last_operation": {"type": last_operation.operation_type, "amount": last_operation.amount, "reason": last_operation.reason, "created_at": last_operation.created_at} if last_operation else None,
        "requires_acknowledgement": latest is None or latest.user_id != current_user.id,
    }


@router.get("/audit")
def list_audit_logs(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> list[dict[str, object]]:
    rows = db.execute(select(AuditLog).order_by(AuditLog.id.desc())).scalars().all()
    return [{
        "id": row.id,
        "user_id": row.user_id,
        "register_id": row.register_id,
        "session_id": row.session_id,
        "action": row.action,
        "entity_type": row.entity_type,
        "entity_id": row.entity_id,
        "amount": row.amount,
        "before_data": row.before_data,
        "after_data": row.after_data,
        "created_at": row.created_at,
    } for row in rows]


@router.get("/sessions/recap")
def list_session_recaps(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> list[dict[str, object]]:
    sessions = db.scalars(select(CashSession).order_by(CashSession.id.desc())).all()
    recaps = []
    for session in sessions:
        seller = db.get(User, session.user_id)
        register = db.get(CashRegister, session.register_id)
        operations = db.scalars(
            select(CashOperation).where(CashOperation.session_id == session.id).order_by(CashOperation.created_at)
        ).all()
        handoffs = db.scalars(select(CashHandoff).where(CashHandoff.session_id == session.id).order_by(CashHandoff.created_at)).all()
        recaps.append({
            "session_id": session.id,
            "status": session.status,
            "seller": seller.full_name if seller else f"Utilisateur #{session.user_id}",
            "register": register.name if register else f"Caisse #{session.register_id}",
            "register_code": register.code if register else None,
            "opened_at": session.opened_at,
            "closed_at": session.closed_at,
            "expected_opening_amount": session.expected_opening_amount,
            "actual_opening_amount": session.actual_opening_amount,
            "opening_difference": session.opening_difference,
            "expected_closing_amount": session.expected_closing_amount,
            "actual_closing_amount": session.actual_closing_amount,
            "closing_difference": session.closing_difference,
            "handoffs": [{
                "seller": db.get(User, handoff.user_id).full_name if db.get(User, handoff.user_id) else f"Utilisateur #{handoff.user_id}",
                "previous_seller": db.get(User, handoff.previous_user_id).full_name if handoff.previous_user_id and db.get(User, handoff.previous_user_id) else None,
                "acknowledged_at": handoff.acknowledged_at,
            } for handoff in handoffs],
            "operations": [{
                "id": operation.id,
                "operation_type": operation.operation_type,
                "amount": operation.amount,
                "payment_method": operation.payment_method,
                "reason": operation.reason,
                "created_at": operation.created_at,
            } for operation in operations],
        })
    return recaps


@router.get("/sessions/current/handoff")
def current_handoff(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> dict[str, object] | None:
    session = get_open_cash_session(db)
    return build_handoff_summary(session, current_user, db) if session else None


@router.post("/sessions/current/handoff/acknowledge")
def acknowledge_handoff(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> dict[str, object]:
    session = get_open_cash_session(db)
    if session is None:
        raise HTTPException(status_code=409, detail="No open cash session")
    latest = get_latest_handoff(session.id, db)
    if latest is None or latest.user_id != current_user.id:
        handoff = CashHandoff(session_id=session.id, user_id=current_user.id, previous_user_id=latest.user_id if latest else session.user_id)
        db.add(handoff)
        db.add(AuditLog(user_id=current_user.id, register_id=session.register_id, session_id=session.id, action="cash_handoff.acknowledged", entity_type="cash_handoff", after_data=f"previous_user_id={handoff.previous_user_id}"))
        db.commit()
    return build_handoff_summary(session, current_user, db)


@router.get("/registers", response_model=list[CashRegisterRead])
def list_registers(db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "seller"))) -> list[CashRegister]:
    return db.scalars(select(CashRegister).where(CashRegister.is_active.is_(True)).order_by(CashRegister.id)).all()


@router.post("/registers", response_model=CashRegisterRead, status_code=status.HTTP_201_CREATED)
def create_register(payload: CashRegisterCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> CashRegister:
    register = CashRegister(name=payload.name, code=payload.code)
    db.add(register)
    db.flush()
    db.add(AuditLog(user_id=current_user.id, register_id=register.id, action="cash_register.created", entity_type="cash_register", entity_id=register.id, after_data=payload.model_dump_json()))
    db.commit()
    db.refresh(register)
    return register


@router.post("/sessions/open", response_model=CashSessionRead, status_code=status.HTTP_201_CREATED)
def open_session(payload: CashSessionOpen, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> CashSession:
    register = db.get(CashRegister, payload.register_id)
    if register is None or not register.is_active:
        raise HTTPException(status_code=404, detail="Cash register not found")
    if db.scalar(select(CashSession.id).where(CashSession.register_id == register.id, CashSession.status == "open")) is not None:
        raise HTTPException(status_code=409, detail="This cash register already has an open session")
    previous = db.scalar(select(CashSession).where(CashSession.register_id == register.id, CashSession.status == "closed").order_by(CashSession.closed_at.desc()))
    expected = previous.actual_closing_amount if previous and previous.actual_closing_amount is not None else 0.0
    session = CashSession(register_id=register.id, user_id=current_user.id, expected_opening_amount=expected, actual_opening_amount=payload.actual_opening_amount, opening_difference=payload.actual_opening_amount - expected, opening_note=payload.opening_note)
    db.add(session)
    db.flush()
    db.add(CashHandoff(session_id=session.id, user_id=current_user.id))
    db.add(AuditLog(user_id=current_user.id, register_id=register.id, session_id=session.id, action="cash_session.opened", entity_type="cash_session", entity_id=session.id, amount=session.opening_difference, after_data=f"expected={expected};actual={payload.actual_opening_amount}"))
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=list[CashSessionRead])
def list_sessions(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> list[CashSession]:
    query = select(CashSession).order_by(CashSession.id.desc())
    return db.scalars(query).all()


@router.get("/sessions/{session_id}/balance")
def session_balance(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> dict[str, float | int | str]:
    session = db.get(CashSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Cash session not found")
    if current_user.role != "admin" and not handoff_is_acknowledged(session.id, current_user.id, db):
        raise HTTPException(status_code=403, detail="This is not your cash session")
    return {
        "session_id": session.id,
        "register_id": session.register_id,
        "status": session.status,
        "opening_amount": session.actual_opening_amount,
        "expected_cash_amount": calculate_expected_cash(session.id, db),
    }


@router.post("/sessions/{session_id}/close", response_model=CashSessionRead)
def close_session(session_id: int, payload: CashSessionClose, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> CashSession:
    session = db.get(CashSession, session_id)
    if session is None or session.status != "open":
        raise HTTPException(status_code=404, detail="Open cash session not found")
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only an administrator can close the cash session")
    if current_user.role != "admin" and not handoff_is_acknowledged(session.id, current_user.id, db):
        raise HTTPException(status_code=403, detail="Acknowledge the cash handoff before recording operations")
    expected = calculate_expected_cash(session.id, db)
    session.expected_closing_amount = expected
    session.actual_closing_amount = payload.actual_closing_amount
    session.closing_difference = payload.actual_closing_amount - expected
    session.closing_note = payload.closing_note
    session.status = "closed"
    session.closed_at = datetime.utcnow()
    db.add(AuditLog(user_id=current_user.id, register_id=session.register_id, session_id=session.id, action="cash_session.closed", entity_type="cash_session", entity_id=session.id, amount=session.closing_difference, after_data=f"expected={expected};actual={payload.actual_closing_amount}"))
    db.commit()
    db.refresh(session)
    return session


@router.post("/operations", response_model=CashOperationRead, status_code=status.HTTP_201_CREATED)
def create_operation(payload: CashOperationCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> CashOperation:
    session = db.get(CashSession, payload.session_id)
    if session is None or session.status != "open":
        raise HTTPException(status_code=409, detail="An open cash session is required")
    if current_user.role != "admin" and not handoff_is_acknowledged(session.id, current_user.id, db):
        raise HTTPException(status_code=403, detail="Acknowledge the cash handoff before recording operations")
    if payload.operation_type not in {"cash_in", "cash_out", "refund", "adjustment_in", "adjustment_out"}:
        raise HTTPException(status_code=400, detail="Unsupported cash operation")
    operation = CashOperation(register_id=session.register_id, session_id=session.id, user_id=current_user.id, operation_type=payload.operation_type, amount=payload.amount, payment_method=payload.payment_method, reason=payload.reason)
    db.add(operation)
    db.add(AuditLog(user_id=current_user.id, register_id=session.register_id, session_id=session.id, action=f"cash_operation.{payload.operation_type}", entity_type="cash_operation", amount=payload.amount, after_data=payload.reason))
    db.commit()
    db.refresh(operation)
    return operation