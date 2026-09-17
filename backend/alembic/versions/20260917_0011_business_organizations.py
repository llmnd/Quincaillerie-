"""scope business data by organization

Revision ID: 20260917_0011
Revises: 20260917_0010
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260917_0011"
down_revision: Union[str, None] = "20260917_0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TENANT_TABLES = {
    "products": "organizations.id",
    "customers": "organizations.id",
    "suppliers": "organizations.id",
    "stock_movements": "organizations.id",
    "sales": "organizations.id",
    "sale_items": "organizations.id",
    "taxes": "organizations.id",
    "invoices": "organizations.id",
    "invoice_lines": "organizations.id",
    "accounts": "organizations.id",
    "journal_entries": "organizations.id",
    "journal_lines": "organizations.id",
    "cash_registers": "organizations.id",
    "cash_sessions": "organizations.id",
    "cash_handoffs": "organizations.id",
    "cash_operations": "organizations.id",
    "audit_logs": "organizations.id",
}


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    existing_tables = set(inspector.get_table_names())

    for table_name in TENANT_TABLES:
        if table_name not in existing_tables:
            continue
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        if "organization_id" not in columns:
            op.add_column(
                table_name,
                sa.Column(
                    "organization_id",
                    sa.Integer(),
                    sa.ForeignKey("organizations.id"),
                    nullable=True,
                ),
            )
            op.create_index(
                f"ix_{table_name}_organization_id",
                table_name,
                ["organization_id"],
                unique=False,
            )

        if table_name != "audit_logs":
            op.execute(
                sa.text(
                    f"UPDATE {table_name} SET organization_id = "
                    "(SELECT id FROM organizations ORDER BY id LIMIT 1) "
                    "WHERE organization_id IS NULL"
                )
            )
            op.alter_column(table_name, "organization_id", nullable=False)


def downgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    existing_tables = set(inspector.get_table_names())

    for table_name in reversed(list(TENANT_TABLES)):
        if table_name not in existing_tables:
            continue
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        if "organization_id" not in columns:
            continue
        op.drop_index(f"ix_{table_name}_organization_id", table_name=table_name)
        op.drop_column(table_name, "organization_id")