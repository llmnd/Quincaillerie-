"""add generic farming foundation

Revision ID: 20260917_0012
Revises: 20260917_0011
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260917_0012"
down_revision: Union[str, None] = "20260917_0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "farming_sites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("location", sa.String(255)),
        sa.Column("notes", sa.Text()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_farming_sites_id", "farming_sites", ["id"])
    op.create_index("ix_farming_sites_organization_id", "farming_sites", ["organization_id"])

    op.create_table(
        "farming_buildings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("site_id", sa.Integer(), sa.ForeignKey("farming_sites.id"), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("capacity", sa.Integer()),
        sa.Column("notes", sa.Text()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_farming_buildings_id", "farming_buildings", ["id"])
    op.create_index("ix_farming_buildings_organization_id", "farming_buildings", ["organization_id"])
    op.create_index("ix_farming_buildings_site_id", "farming_buildings", ["site_id"])

    op.create_table(
        "farming_batches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("building_id", sa.Integer(), sa.ForeignKey("farming_buildings.id")),
        sa.Column("reference", sa.String(80), nullable=False),
        sa.Column("species", sa.String(80), nullable=False, server_default="chicken"),
        sa.Column("production_type", sa.String(40), nullable=False),
        sa.Column("breed", sa.String(120)),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("initial_count", sa.Integer(), nullable=False),
        sa.Column("current_count", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="active"),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_farming_batches_id", "farming_batches", ["id"])
    op.create_index("ix_farming_batches_organization_id", "farming_batches", ["organization_id"])
    op.create_index("ix_farming_batches_building_id", "farming_batches", ["building_id"])
    op.create_index("ix_farming_batches_reference", "farming_batches", ["reference"])

    op.create_table(
        "farming_health_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("batch_id", sa.Integer(), sa.ForeignKey("farming_batches.id"), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("event_type", sa.String(40), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("diagnosis", sa.String(255)),
        sa.Column("treatment", sa.String(255)),
        sa.Column("affected_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mortality_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("veterinarian", sa.String(160)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_farming_health_events_id", "farming_health_events", ["id"])
    op.create_index("ix_farming_health_events_organization_id", "farming_health_events", ["organization_id"])
    op.create_index("ix_farming_health_events_batch_id", "farming_health_events", ["batch_id"])


def downgrade() -> None:
    op.drop_table("farming_health_events")
    op.drop_table("farming_batches")
    op.drop_table("farming_buildings")
    op.drop_table("farming_sites")
