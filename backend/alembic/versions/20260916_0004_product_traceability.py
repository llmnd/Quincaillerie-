"""add product stock traceability fields

Revision ID: 20260916_0004
Revises: 20260916_0003
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260916_0004"
down_revision: Union[str, None] = "20260916_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("initial_stock_quantity", sa.Integer(), nullable=False, server_default="0"))
    op.execute(sa.text("UPDATE products p SET initial_stock_quantity = p.stock_quantity + COALESCE((SELECT SUM(quantity) FROM sale_items si WHERE si.product_id = p.id), 0)"))
    op.alter_column("products", "initial_stock_quantity", server_default=None)


def downgrade() -> None:
    op.drop_column("products", "initial_stock_quantity")