"""add per-user permissions

Revision ID: 20260920_0017
Revises: 20260919_0016
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260920_0017"
down_revision: Union[str, None] = "20260919_0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("permissions", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))


def downgrade() -> None:
    op.drop_column("users", "permissions")