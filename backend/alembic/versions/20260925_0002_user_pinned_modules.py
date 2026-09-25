"""add per-user pinned modules

Revision ID: 20260925_0002
Revises: 20260920_0017
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260925_0002"
down_revision: Union[str, None] = "20260920_0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("pinned_modules", sa.JSON(), nullable=False, server_default=sa.text("'[]'")))


def downgrade() -> None:
    op.drop_column("users", "pinned_modules")