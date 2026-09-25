"""add farming production stock transfers

Revision ID: 20260925_0003
Revises: 20260925_0002
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260925_0003"
down_revision: Union[str, None] = "20260925_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    stock_columns = {column["name"] for column in inspector.get_columns("stock_movements")}
    if "source_type" not in stock_columns:
        op.add_column("stock_movements", sa.Column("source_type", sa.String(50), nullable=True))
    if "source_id" not in stock_columns:
        op.add_column("stock_movements", sa.Column("source_id", sa.Integer(), nullable=True))

    if not inspector.has_table("farming_stock_transfers"):
        op.create_table(
            "farming_stock_transfers",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
            sa.Column("batch_id", sa.Integer(), sa.ForeignKey("farming_batches.id"), nullable=False),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
            sa.Column("egg_production_id", sa.Integer(), sa.ForeignKey("farming_egg_productions.id"), nullable=True),
            sa.Column("transfer_type", sa.String(30), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("unit_cost", sa.Float(), nullable=False, server_default="0"),
            sa.Column("transfer_date", sa.Date(), nullable=False),
            sa.Column("notes", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        for index_name, columns in {
            "ix_farming_stock_transfers_id": ["id"],
            "ix_farming_stock_transfers_organization_id": ["organization_id"],
            "ix_farming_stock_transfers_batch_id": ["batch_id"],
            "ix_farming_stock_transfers_product_id": ["product_id"],
            "ix_farming_stock_transfers_egg_production_id": ["egg_production_id"],
        }.items():
            op.create_index(index_name, "farming_stock_transfers", columns)


def downgrade() -> None:
    op.drop_table("farming_stock_transfers")
    op.drop_column("stock_movements", "source_id")
    op.drop_column("stock_movements", "source_type")