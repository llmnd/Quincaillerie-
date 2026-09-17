"""add configurable taxes and sales invoices"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260917_0008"
down_revision: Union[str, None] = "20260917_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "taxes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(30), nullable=False, unique=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("rate", sa.Float(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.execute(sa.text("INSERT INTO taxes (code, name, rate, is_active) VALUES ('TVA18', 'TVA standard Sénégal', 18, true)"))
    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("number", sa.String(40), nullable=False, unique=True),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id"), nullable=False, unique=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id")),
        sa.Column("tax_id", sa.Integer(), sa.ForeignKey("taxes.id")),
        sa.Column("status", sa.String(20), nullable=False, server_default="issued"),
        sa.Column("issue_date", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("currency", sa.String(3), nullable=False, server_default="XOF"),
        sa.Column("subtotal", sa.Float(), nullable=False),
        sa.Column("tax_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Float(), nullable=False),
    )
    op.create_table(
        "invoice_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("line_total", sa.Float(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("invoice_lines")
    op.drop_table("invoices")
    op.drop_table("taxes")