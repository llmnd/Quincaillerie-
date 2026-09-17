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
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    batch_columns = {column["name"] for column in inspector.get_columns("farming_batches")}
    if "image_url" not in batch_columns:
        op.add_column("farming_batches", sa.Column("image_url", sa.String(1000), nullable=True))

    if not sa.inspect(connection).has_table("farming_egg_productions"):
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

    egg_indexes = {index["name"] for index in sa.inspect(connection).get_indexes("farming_egg_productions")}
    for index_name, columns in {
        "ix_farming_egg_productions_id": ["id"],
        "ix_farming_egg_productions_organization_id": ["organization_id"],
        "ix_farming_egg_productions_batch_id": ["batch_id"],
    }.items():
        if index_name not in egg_indexes:
            op.create_index(index_name, "farming_egg_productions", columns)


def downgrade() -> None:
    op.drop_table("farming_egg_productions")
    op.drop_column("farming_batches", "image_url")
