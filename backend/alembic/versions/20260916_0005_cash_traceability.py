"""add cash sessions and sale audit fields

Revision ID: 20260916_0005
Revises: 20260916_0004
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260916_0005"
down_revision: Union[str, None] = "20260916_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("cash_registers", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(100), nullable=False), sa.Column("code", sa.String(50), nullable=False, unique=True), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.execute(sa.text("INSERT INTO cash_registers (name, code, is_active) VALUES ('Caisse principale', 'CAISSE-1', true)"))
    op.create_table("cash_sessions", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("register_id", sa.Integer(), sa.ForeignKey("cash_registers.id"), nullable=False), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("opened_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")), sa.Column("closed_at", sa.DateTime()), sa.Column("expected_opening_amount", sa.Float(), nullable=False, server_default="0"), sa.Column("actual_opening_amount", sa.Float(), nullable=False), sa.Column("opening_difference", sa.Float(), nullable=False, server_default="0"), sa.Column("expected_closing_amount", sa.Float()), sa.Column("actual_closing_amount", sa.Float()), sa.Column("closing_difference", sa.Float()), sa.Column("status", sa.String(20), nullable=False, server_default="open"), sa.Column("opening_note", sa.String(500)), sa.Column("closing_note", sa.String(500)))
    op.create_table("cash_operations", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("register_id", sa.Integer(), sa.ForeignKey("cash_registers.id"), nullable=False), sa.Column("session_id", sa.Integer(), sa.ForeignKey("cash_sessions.id"), nullable=False), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("operation_type", sa.String(30), nullable=False), sa.Column("amount", sa.Float(), nullable=False), sa.Column("payment_method", sa.String(30)), sa.Column("reason", sa.String(500)), sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))
    op.create_table("audit_logs", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id")), sa.Column("register_id", sa.Integer(), sa.ForeignKey("cash_registers.id")), sa.Column("session_id", sa.Integer(), sa.ForeignKey("cash_sessions.id")), sa.Column("action", sa.String(80), nullable=False), sa.Column("entity_type", sa.String(80), nullable=False), sa.Column("entity_id", sa.Integer()), sa.Column("amount", sa.Float()), sa.Column("before_data", sa.String(4000)), sa.Column("after_data", sa.String(4000)), sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))
    op.add_column("sales", sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id")))
    op.add_column("sales", sa.Column("session_id", sa.Integer(), sa.ForeignKey("cash_sessions.id")))
    op.add_column("sales", sa.Column("discount_amount", sa.Float(), nullable=False, server_default="0"))
    op.add_column("sales", sa.Column("payment_method", sa.String(30), nullable=False, server_default="cash"))


def downgrade() -> None:
    for column in ("payment_method", "discount_amount", "session_id", "user_id"):
        op.drop_column("sales", column)
    op.drop_table("audit_logs")
    op.drop_table("cash_operations")
    op.drop_table("cash_sessions")
    op.drop_table("cash_registers")