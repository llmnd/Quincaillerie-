"""add organizations and organization modules

Revision ID: 20260917_0010
Revises: 20260917_0009
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260917_0010"
down_revision: Union[str, None] = "20260917_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    tables = set(inspector.get_table_names())

    if "organizations" not in tables:
        op.create_table(
            "organizations",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("slug", sa.String(length=255), nullable=False),
            sa.Column("settings", sa.JSON(), nullable=False, server_default=sa.text("('{}')")),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("slug"),
        )
        op.create_index(op.f("ix_organizations_id"), "organizations", ["id"], unique=False)
        op.create_index(op.f("ix_organizations_slug"), "organizations", ["slug"], unique=True)

    if "organization_modules" not in tables:
        op.create_table(
            "organization_modules",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=False),
            sa.Column("module_key", sa.String(length=100), nullable=False),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("settings", sa.JSON(), nullable=False, server_default=sa.text("('{}')")),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("organization_id", "module_key", name="uq_organization_module"),
        )
        op.create_index(op.f("ix_organization_modules_id"), "organization_modules", ["id"], unique=False)
        op.create_index(op.f("ix_organization_modules_organization_id"), "organization_modules", ["organization_id"], unique=False)

    if connection.execute(sa.text("SELECT 1 FROM organizations WHERE slug = 'organisation-principale' LIMIT 1")).scalar() is None:
        op.execute(sa.text("INSERT INTO organizations (name, slug, settings, is_active, created_at) VALUES ('Organisation principale', 'organisation-principale', '{}', true, CURRENT_TIMESTAMP)"))

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "organization_id" not in user_columns:
        op.add_column("users", sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=True))
        op.create_index(op.f("ix_users_organization_id"), "users", ["organization_id"], unique=False)
    op.execute(sa.text("UPDATE users SET organization_id = (SELECT id FROM organizations WHERE slug = 'organisation-principale') WHERE organization_id IS NULL"))
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("organization_id", nullable=False)


def downgrade() -> None:
    op.drop_constraint("fk_users_organization_id", "users", type_="foreignkey")
    op.drop_index(op.f("ix_users_organization_id"), table_name="users")
    op.drop_column("users", "organization_id")
    op.drop_index(op.f("ix_organization_modules_organization_id"), table_name="organization_modules")
    op.drop_index(op.f("ix_organization_modules_id"), table_name="organization_modules")
    op.drop_table("organization_modules")
    op.drop_index(op.f("ix_organizations_slug"), table_name="organizations")
    op.drop_index(op.f("ix_organizations_id"), table_name="organizations")
    op.drop_table("organizations")