"""allow full data URLs for farming batch images

Revision ID: 20260917_0015
Revises: 20260917_0014
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260917_0015"
down_revision: Union[str, None] = "20260917_0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("farming_batches")}
    if "image_url" not in columns:
        return

    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("farming_batches") as batch_op:
            batch_op.alter_column("image_url", existing_type=sa.String(length=1000), type_=sa.Text())
    else:
        op.alter_column("farming_batches", "image_url", existing_type=sa.String(length=1000), type_=sa.Text())


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("farming_batches")}
    if "image_url" not in columns:
        return

    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("farming_batches") as batch_op:
            batch_op.alter_column("image_url", existing_type=sa.Text(), type_=sa.String(length=1000))
    else:
        op.alter_column("farming_batches", "image_url", existing_type=sa.Text(), type_=sa.String(length=1000))
