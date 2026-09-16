from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CashRegister(Base):
    __tablename__ = "cash_registers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class CashSession(Base):
    __tablename__ = "cash_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    register_id: Mapped[int] = mapped_column(ForeignKey("cash_registers.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    opened_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expected_opening_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    actual_opening_amount: Mapped[float] = mapped_column(Float, nullable=False)
    opening_difference: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    expected_closing_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    actual_closing_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    closing_difference: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")
    opening_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    closing_note: Mapped[str | None] = mapped_column(String(500), nullable=True)


class CashOperation(Base):
    __tablename__ = "cash_operations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    register_id: Mapped[int] = mapped_column(ForeignKey("cash_registers.id"), nullable=False)
    session_id: Mapped[int] = mapped_column(ForeignKey("cash_sessions.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    operation_type: Mapped[str] = mapped_column(String(30), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(30), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    register_id: Mapped[int | None] = mapped_column(ForeignKey("cash_registers.id"), nullable=True)
    session_id: Mapped[int | None] = mapped_column(ForeignKey("cash_sessions.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    before_data: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    after_data: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)