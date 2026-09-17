"""link farming to stock and sales

Revision ID: 20260917_0013
Revises: 20260917_0012
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260917_0013"
down_revision: Union[str, None] = "20260917_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sales", sa.Column("farming_batch_id", sa.Integer(), sa.ForeignKey("farming_batches.id"), nullable=True))
    op.create_index("ix_sales_farming_batch_id", "sales", ["farming_batch_id"], unique=False)
    op.create_table(
        "farming_consumptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("batch_id", sa.Integer(), sa.ForeignKey("farming_batches.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_cost", sa.Float(), nullable=False, server_default="0"),
        sa.Column("consumed_at", sa.Date(), nullable=False),
        sa.Column("reason", sa.String(255)),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_farming_consumptions_id", "farming_consumptions", ["id"])
    op.create_index("ix_farming_consumptions_organization_id", "farming_consumptions", ["organization_id"])
    op.create_index("ix_farming_consumptions_batch_id", "farming_consumptions", ["batch_id"])
    op.create_index("ix_farming_consumptions_product_id", "farming_consumptions", ["product_id"])


def downgrade() -> None:
    op.drop_table("farming_consumptions")
    op.drop_index("ix_sales_farming_batch_id", table_name="sales")
    op.drop_column("sales", "farming_batch_id")
