"""allow sales without a customer

Revision ID: 20260916_0003
Revises: 20260916_0002
"""

from typing import Sequence, Union

from alembic import op


revision: str = "20260916_0003"
down_revision: Union[str, None] = "20260916_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("sales", "customer_id", nullable=True)


def downgrade() -> None:
    op.alter_column("sales", "customer_id", nullable=False)