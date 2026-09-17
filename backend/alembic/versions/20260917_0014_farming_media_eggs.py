"""add farming batch media and egg production

Revision ID: 20260917_0014
Revises: 20260917_0013
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260917_0014"
down_revision: Union[str, None] = "20260917_0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("farming_batches", sa.Column("image_url", sa.String(1000), nullable=True))
    op.create_table(
        "farming_egg_productions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("batch_id", sa.Integer(), sa.ForeignKey("farming_batches.id"), nullable=False),
        sa.Column("production_date", sa.Date(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("damaged_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.String(255)),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_farming_egg_productions_id", "farming_egg_productions", ["id"])
    op.create_index("ix_farming_egg_productions_organization_id", "farming_egg_productions", ["organization_id"])
    op.create_index("ix_farming_egg_productions_batch_id", "farming_egg_productions", ["batch_id"])


def downgrade() -> None:
    op.drop_table("farming_egg_productions")
    op.drop_column("farming_batches", "image_url")
