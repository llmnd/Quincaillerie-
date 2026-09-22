"""website builder

Revision ID: 20260922_0001
Revises: 20260921_0018
Create Date: 2026-09-22 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260922_0001"
down_revision: Union[str, None] = "20260921_0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "websites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("logo", sa.String(length=2000), nullable=True),
        sa.Column("favicon", sa.String(length=2000), nullable=True),
        sa.Column("template", sa.String(length=100), nullable=True),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("theme", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("settings", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_websites_id"), "websites", ["id"], unique=False)
    op.create_index(op.f("ix_websites_organization_id"), "websites", ["organization_id"], unique=False)
    op.create_index(op.f("ix_websites_slug"), "websites", ["slug"], unique=True)

    op.create_table(
        "website_pages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("website_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("meta_title", sa.String(length=255), nullable=True),
        sa.Column("meta_description", sa.String(length=500), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["website_id"], ["websites.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("website_id", "slug", name="uq_website_pages_website_slug"),
    )
    op.create_index(op.f("ix_website_pages_id"), "website_pages", ["id"], unique=False)

    op.create_table(
        "website_sections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("page_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=100), nullable=False, server_default="text"),
        sa.Column("position", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("content", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("settings", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("visible", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["page_id"], ["website_pages.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_website_sections_id"), "website_sections", ["id"], unique=False)

    op.create_table(
        "website_domains",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("website_id", sa.Integer(), nullable=False),
        sa.Column("domain", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False, server_default="subdomain"),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["website_id"], ["websites.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("domain", name="uq_website_domains_domain"),
    )
    op.create_index(op.f("ix_website_domains_id"), "website_domains", ["id"], unique=False)
    op.create_index(op.f("ix_website_domains_domain"), "website_domains", ["domain"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_website_domains_domain"), table_name="website_domains")
    op.drop_index(op.f("ix_website_domains_id"), table_name="website_domains")
    op.drop_table("website_domains")
    op.drop_index(op.f("ix_website_sections_id"), table_name="website_sections")
    op.drop_table("website_sections")
    op.drop_index(op.f("ix_website_pages_id"), table_name="website_pages")
    op.drop_table("website_pages")
    op.drop_index(op.f("ix_websites_slug"), table_name="websites")
    op.drop_index(op.f("ix_websites_organization_id"), table_name="websites")
    op.drop_index(op.f("ix_websites_id"), table_name="websites")
    op.drop_table("websites")
