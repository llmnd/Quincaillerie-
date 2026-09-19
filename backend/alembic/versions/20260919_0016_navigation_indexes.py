"""add organization-scoped list indexes

Revision ID: 20260919_0016
Revises: 20260917_0015
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260919_0016"
down_revision: Union[str, None] = "20260917_0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


INDEXES = (
    ("ix_customers_org_id_id", "customers", ["organization_id", "id"]),
    ("ix_products_org_active_id", "products", ["organization_id", "is_active", "id"]),
    ("ix_sales_org_date_id", "sales", ["organization_id", "sale_date", "id"]),
    ("ix_sale_items_org_product", "sale_items", ["organization_id", "product_id"]),
)


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    for index_name, table_name, columns in INDEXES:
        existing = {index["name"] for index in inspector.get_indexes(table_name)}
        if index_name not in existing:
            op.create_index(index_name, table_name, columns)


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    for index_name, table_name, _ in reversed(INDEXES):
        existing = {index["name"] for index in inspector.get_indexes(table_name)}
        if index_name in existing:
            op.drop_index(index_name, table_name=table_name)
