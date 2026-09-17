"""add configurable chart of accounts and journal entries"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260917_0009"
down_revision: Union[str, None] = "20260917_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("accounts", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("code", sa.String(20), nullable=False, unique=True), sa.Column("name", sa.String(160), nullable=False), sa.Column("account_class", sa.String(2), nullable=False), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.create_table("journal_entries", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("reference", sa.String(80), nullable=False, unique=True), sa.Column("entry_date", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")), sa.Column("journal", sa.String(30), nullable=False), sa.Column("description", sa.String(255), nullable=False), sa.Column("source_type", sa.String(30)), sa.Column("source_id", sa.Integer()))
    op.create_table("journal_lines", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("entry_id", sa.Integer(), sa.ForeignKey("journal_entries.id"), nullable=False), sa.Column("account_id", sa.Integer(), sa.ForeignKey("accounts.id"), nullable=False), sa.Column("label", sa.String(255), nullable=False), sa.Column("debit", sa.Float(), nullable=False, server_default="0"), sa.Column("credit", sa.Float(), nullable=False, server_default="0"))
    accounts = [("411", "Clients", "4"), ("4431", "TVA facturée", "4"), ("571", "Caisse", "5"), ("701", "Ventes de marchandises", "7")]
    for code, name, account_class in accounts:
        op.execute(sa.text(f"INSERT INTO accounts (code, name, account_class, is_active) VALUES ('{code}', '{name}', '{account_class}', true)"))


def downgrade() -> None:
    op.drop_table("journal_lines")
    op.drop_table("journal_entries")
    op.drop_table("accounts")
