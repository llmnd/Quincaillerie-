from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.accounting import Account, JournalEntry, JournalLine


DEFAULT_ACCOUNTS = (
    ("401", "Fournisseurs", "4"),
    ("411", "Clients", "4"),
    ("4431", "TVA facturée", "4"),
    ("4456", "TVA déductible", "4"),
    ("521", "Banque", "5"),
    ("571", "Caisse", "5"),
    ("601", "Achats de marchandises", "6"),
    ("602", "Consommation d'aliments", "6"),
    ("32", "Stock d'aliments et approvisionnements", "3"),
    ("701", "Ventes de marchandises", "7"),
)

MANUAL_PAYMENT_METHODS = {"cash", "card", "wave", "orange_money", "other"}


def payment_account_code(payment_method: str) -> str:
    return "571" if payment_method == "cash" else "521"


def cleanup_duplicate_accounts(db: Session) -> None:
    records = db.execute(
        select(Account.id, Account.organization_id, Account.code).order_by(Account.organization_id, Account.code, Account.id)
    ).all()
    seen: set[tuple[int, str]] = set()
    keep_ids: dict[tuple[int, str], int] = {}

    for account_id, organization_id, code in records:
        key = (organization_id, code)
        if key in seen:
            keep_id = keep_ids[key]
            db.execute(
                "UPDATE journal_lines SET account_id = :keep_id WHERE account_id = :account_id",
                {"keep_id": keep_id, "account_id": account_id},
            )
            db.execute(
                "DELETE FROM accounts WHERE id = :account_id AND organization_id = :organization_id AND code = :code",
                {"account_id": account_id, "organization_id": organization_id, "code": code},
            )
            continue

        seen.add(key)
        keep_ids[key] = account_id

    db.flush()


def get_or_create_default_accounts(db: Session, organization_id: int) -> dict[str, Account]:
    cleanup_duplicate_accounts(db)
    accounts = {
        account.code: account
        for account in db.scalars(select(Account).where(Account.organization_id == organization_id)).all()
    }
    for code, name, account_class in DEFAULT_ACCOUNTS:
        if code in accounts:
            continue

        existing = db.scalar(
            select(Account).where(Account.organization_id == organization_id, Account.code == code)
        )
        if existing is not None:
            accounts[code] = existing
            continue

        account = Account(organization_id=organization_id, code=code, name=name, account_class=account_class, is_active=True)
        db.add(account)
        db.flush()
        accounts[code] = account
    return accounts


def create_sale_journal(
    db: Session,
    organization_id: int,
    sale_id: int,
    amount: float,
    payment_method: str,
    tax_amount: float = 0.0,
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
    debit_code = payment_account_code(payment_method)
    debit_label = "Encaissement vente"
    subtotal = round(amount - tax_amount, 2)
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
    db.add(JournalLine(organization_id=organization_id, entry_id=entry.id, account_id=accounts["701"].id, label=f"Chiffre d'affaires vente #{sale_id}", debit=0, credit=subtotal))
    if tax_amount:
        db.add(JournalLine(organization_id=organization_id, entry_id=entry.id, account_id=accounts["4431"].id, label=f"TVA vente #{sale_id}", debit=0, credit=tax_amount))
    return entry


def create_farming_consumption_journal(
    db: Session,
    organization_id: int,
    consumption_id: int,
    batch_reference: str,
    amount: float,
) -> JournalEntry:
    existing = db.scalar(
        select(JournalEntry).where(
            JournalEntry.organization_id == organization_id,
            JournalEntry.source_type == "farming_consumption",
            JournalEntry.source_id == consumption_id,
        )
    )
    if existing is not None:
        return existing

    accounts = get_or_create_default_accounts(db, organization_id)
    value = round(amount, 2)
    entry = JournalEntry(
        organization_id=organization_id,
        reference=f"ALIM-{consumption_id}",
        journal="ELEVAGE",
        description=f"Consommation d'aliments - {batch_reference}",
        source_type="farming_consumption",
        source_id=consumption_id,
    )
    db.add(entry)
    db.flush()
    db.add(JournalLine(organization_id=organization_id, entry_id=entry.id, account_id=accounts["602"].id, label=f"Aliments consommés - {batch_reference}", debit=value, credit=0))
    db.add(JournalLine(organization_id=organization_id, entry_id=entry.id, account_id=accounts["32"].id, label=f"Sortie du stock d'aliments - {batch_reference}", debit=0, credit=value))
    return entry