"""clean duplicate accounts per organization and enforce uniqueness"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260921_0018_fix_account_duplicates"
down_revision: Union[str, None] = "20260920_0017"

branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "accounts" not in inspector.get_table_names():
        return

    rows = bind.execute(sa.text(
        "SELECT id, organization_id, code FROM accounts ORDER BY organization_id ASC, code ASC, id ASC"
    )).fetchall()

    seen: set[tuple[int, str]] = set()
    keep_by_key: dict[tuple[int, str], int] = {}
    duplicate_ids: list[int] = []

    for account_id, organization_id, code in rows:
        key = (organization_id, code)
        if key in seen:
            duplicate_ids.append(account_id)
            continue
        seen.add(key)
        keep_by_key[key] = account_id

    for duplicate_id in duplicate_ids:
        duplicate = bind.execute(sa.text("SELECT organization_id, code FROM accounts WHERE id = :id"), {"id": duplicate_id}).fetchone()
        if duplicate is None:
            continue
        organization_id, code = duplicate
        keep_id = keep_by_key.get((organization_id, code))
        if keep_id is None or keep_id == duplicate_id:
            continue
        bind.execute(sa.text("UPDATE journal_lines SET account_id = :keep_id WHERE account_id = :duplicate_id"), {"keep_id": keep_id, "duplicate_id": duplicate_id})
        bind.execute(sa.text("DELETE FROM accounts WHERE id = :duplicate_id"), {"duplicate_id": duplicate_id})

    with op.batch_alter_table("accounts") as batch_op:
        batch_op.create_unique_constraint("uq_accounts_organization_code", ["organization_id", "code"])


def downgrade() -> None:
    with op.batch_alter_table("accounts") as batch_op:
        batch_op.drop_constraint("uq_accounts_organization_code", type_="unique")
