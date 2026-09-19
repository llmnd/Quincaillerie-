from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.accounting import Account, JournalEntry, JournalLine


DEFAULT_ACCOUNTS = (
    ("411", "Clients", "4"),
    ("4431", "TVA facturée", "4"),
    ("571", "Caisse", "5"),
    ("701", "Ventes de marchandises", "7"),
)


def get_or_create_default_accounts(db: Session, organization_id: int) -> dict[str, Account]:
    accounts = {
        account.code: account
        for account in db.scalars(select(Account).where(Account.organization_id == organization_id)).all()
    }
    for code, name, account_class in DEFAULT_ACCOUNTS:
        if code not in accounts:
            account = Account(organization_id=organization_id, code=code, name=name, account_class=account_class, is_active=True)
            db.add(account)
            accounts[code] = account
    db.flush()
    return accounts


def create_sale_journal(
    db: Session,
    organization_id: int,
    sale_id: int,
    amount: float,
    payment_method: str,
    customer_id: int | None,
) -> JournalEntry:
    existing = db.scalar(
        select(JournalEntry).where(
            JournalEntry.organization_id == organization_id,
            JournalEntry.source_type == "sale",
            JournalEntry.source_id == sale_id,
        )
    )
    if existing is not None:
        return existing

    accounts = get_or_create_default_accounts(db, organization_id)
    debit_code = "411" if payment_method == "other" and customer_id is not None else "571"
    debit_label = "Client à recouvrer" if debit_code == "411" else "Encaissement vente"
    entry = JournalEntry(
        organization_id=organization_id,
        reference=f"VE-{sale_id}",
        journal="VENTES",
        description=f"Vente #{sale_id}",
        source_type="sale",
        source_id=sale_id,
    )
    db.add(entry)
    db.flush()
    db.add(JournalLine(organization_id=organization_id, entry_id=entry.id, account_id=accounts[debit_code].id, label=debit_label, debit=amount, credit=0))
    db.add(JournalLine(organization_id=organization_id, entry_id=entry.id, account_id=accounts["701"].id, label=f"Chiffre d'affaires vente #{sale_id}", debit=0, credit=amount))
    return entry