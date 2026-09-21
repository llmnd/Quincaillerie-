from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.cash_routes import get_open_cash_session, handoff_is_acknowledged
from app.core.accounting import get_or_create_default_accounts, payment_account_code
from app.api.deps import get_db, require_module, require_roles
from app.models.accounting import Account, Invoice, InvoiceLine, JournalEntry, JournalLine, Tax
from app.models.cash import CashRegister
from app.models.sale import Sale
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.accounting import AccountCreate, AccountRead, InvoiceRead, JournalEntryRead, TaxCreate, TaxRead

router = APIRouter(prefix="/accounting", tags=["accounting"], dependencies=[Depends(require_module("accounting"))])


def _validate_date_range(date_from: datetime | None, date_to: datetime | None) -> tuple[datetime | None, datetime | None]:
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(status_code=400, detail="date_from must be before or equal to date_to")
    return date_from, date_to


def ensure_organization_accounting_defaults(db: Session, organization_id: int) -> None:
    get_or_create_default_accounts(db, organization_id)
    db.commit()


@router.get("")
def accounting_overview(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> dict[str, int | str]:
    return {
        "module": "accounting",
        "currency": "XOF",
        "taxes": db.scalar(select(func.count(Tax.id)).where(Tax.organization_id == current_user.organization_id)) or 0,
        "invoices": db.scalar(select(func.count(Invoice.id)).where(Invoice.organization_id == current_user.organization_id)) or 0,
        "journal_entries": db.scalar(select(func.count(JournalEntry.id)).where(JournalEntry.organization_id == current_user.organization_id)) or 0,
    }


@router.get("/accounts", response_model=list[AccountRead])
def list_accounts(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> list[Account]:
    ensure_organization_accounting_defaults(db, current_user.organization_id)
    return db.scalars(select(Account).where(Account.organization_id == current_user.organization_id, Account.is_active.is_(True)).order_by(Account.code)).all()


@router.post("/accounts", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def create_account(payload: AccountCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> Account:
    if db.scalar(select(Account.id).where(Account.organization_id == current_user.organization_id, Account.code == payload.code)) is not None:
        raise HTTPException(status_code=409, detail="Account code already exists")
    account = Account(**payload.model_dump(), organization_id=current_user.organization_id)
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def _serialize_expense_entry(entry: JournalEntry, db: Session) -> dict[str, object]:
    expense_lines = [line for line in entry.lines if line.debit > 0]
    vat_line = next((line for line in entry.lines if line.account_id and db.get(Account, line.account_id) and db.get(Account, line.account_id).code.startswith("445")), None)
    expense_account = next((line for line in entry.lines if line.debit > 0 and line.account_id and db.get(Account, line.account_id) and db.get(Account, line.account_id).code.startswith("6")), None)
    credit_line = next((line for line in entry.lines if line.credit > 0), None)
    expense_code = db.get(Account, expense_account.account_id).code if expense_account and db.get(Account, expense_account.account_id) else "601"
    amount_ht = float(expense_account.debit) if expense_account else 0.0
    amount_tva = float(vat_line.debit) if vat_line else 0.0
    amount_ttc = float(credit_line.credit) if credit_line else amount_ht + amount_tva
    payment_method = "credit" if credit_line and db.get(Account, credit_line.account_id) and db.get(Account, credit_line.account_id).code == "401" else "cash" if credit_line and db.get(Account, credit_line.account_id) and db.get(Account, credit_line.account_id).code == "571" else "bank" if credit_line and db.get(Account, credit_line.account_id) and db.get(Account, credit_line.account_id).code == "521" else "unknown"
    return {
        "id": entry.id,
        "description": entry.description,
        "date": entry.entry_date,
        "amount": amount_ttc,
        "amount_ht": amount_ht,
        "amount_tva": amount_tva,
        "amount_ttc": amount_ttc,
        "account_code": expense_code,
        "payment_method": payment_method,
        "journal": entry.journal,
        "reference": entry.reference,
    }


@router.get("/expenses", response_model=list[dict[str, object]])
def list_expenses(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> list[dict[str, object]]:
    entries = db.scalars(
        select(JournalEntry)
        .where(JournalEntry.organization_id == current_user.organization_id, JournalEntry.source_type == "expense")
        .options(selectinload(JournalEntry.lines))
        .order_by(JournalEntry.entry_date.desc(), JournalEntry.id.desc())
    ).unique().all()
    return [_serialize_expense_entry(entry, db) for entry in entries]


@router.post("/expenses", response_model=dict[str, object], status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: dict[str, object],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, object]:
    description = str(payload.get("description", "")).strip()
    date_value = payload.get("date") or datetime.now(UTC)
    amount_ht = float(payload.get("amount_ht", payload.get("amount", 0) or 0))
    vat_rate = float(payload.get("vat_rate", 0) or 0)
    account_code = str(payload.get("account_code", "")).strip()
    payment_method = str(payload.get("payment_method", "cash")).strip().lower() or "cash"
    register_id = payload.get("register_id")
    supplier_id = payload.get("supplier_id")
    receipt_url = str(payload.get("receipt_url") or "").strip() or None

    if not description:
        raise HTTPException(status_code=400, detail="Expense description is required")
    if not (amount_ht > 0):
        raise HTTPException(status_code=400, detail="Expense amount HT must be positive")
    if not account_code:
        raise HTTPException(status_code=400, detail="Expense account code is required")
    if not account_code.startswith("6"):
        raise HTTPException(status_code=400, detail="Expense account code must be an expense account (6xx)")
    if payment_method not in {"cash", "bank", "credit"}:
        raise HTTPException(status_code=400, detail="Unsupported payment method")

    if payment_method == "cash":
        register = None
        if register_id not in (None, "", "undefined"):
            try:
                register = db.get(CashRegister, int(register_id))
            except (TypeError, ValueError):
                register = None
        if register is None or register.organization_id != current_user.organization_id:
            register = db.scalar(select(CashRegister).where(CashRegister.organization_id == current_user.organization_id).order_by(CashRegister.id.asc()))
            if register is None:
                register = CashRegister(organization_id=current_user.organization_id, name="Caisse par défaut", code="DEFAULT")
                db.add(register)
                db.flush()
    elif payment_method == "credit":
        supplier = None
        if supplier_id not in (None, "", "undefined"):
            try:
                supplier = db.get(Supplier, int(supplier_id))
            except (TypeError, ValueError):
                supplier = None
        if supplier is None or supplier.organization_id != current_user.organization_id:
            supplier = db.scalar(select(Supplier).where(Supplier.organization_id == current_user.organization_id).order_by(Supplier.id.asc()))
            if supplier is None:
                supplier = Supplier(organization_id=current_user.organization_id, name="Fournisseur par défaut", contact_name="Divers", email=None, phone=None, address=None, is_active=True)
                db.add(supplier)
                db.flush()

    accounts = get_or_create_default_accounts(db, current_user.organization_id)
    account = accounts.get(account_code) or db.scalar(select(Account).where(Account.organization_id == current_user.organization_id, Account.code == account_code))
    if account is None:
        account = Account(organization_id=current_user.organization_id, code=account_code, name=description[:160] or "Dépense", account_class=account_code[:1], is_active=True)
        db.add(account)
        db.flush()

    if "4456" not in accounts:
        vat_account = Account(organization_id=current_user.organization_id, code="4456", name="TVA déductible", account_class="4", is_active=True)
        db.add(vat_account)
        db.flush()
        accounts["4456"] = vat_account
    vat_account = accounts["4456"]

    payment_code = "401" if payment_method == "credit" else "571" if payment_method == "cash" else "521"
    payment_account = accounts.get(payment_code) or db.scalar(select(Account).where(Account.organization_id == current_user.organization_id, Account.code == payment_code))
    if payment_account is None:
        payment_account = Account(organization_id=current_user.organization_id, code=payment_code, name="Fournisseurs" if payment_code == "401" else "Caisse" if payment_code == "571" else "Banque", account_class=payment_code[:1], is_active=True)
        db.add(payment_account)
        db.flush()
        accounts[payment_code] = payment_account

    amount_tva = round(amount_ht * (vat_rate / 100), 2)
    amount_ttc = round(amount_ht + amount_tva, 2)

    entry = JournalEntry(
        organization_id=current_user.organization_id,
        reference=f"DEP-{datetime.now(UTC):%Y%m%d%H%M%S}",
        journal="ACHAT",
        description=description,
        source_type="expense",
        source_id=None,
        entry_date=date_value if isinstance(date_value, datetime) else datetime.fromisoformat(str(date_value)),
    )
    db.add(entry)
    db.flush()
    entry.source_id = entry.id

    db.add(JournalLine(organization_id=current_user.organization_id, entry_id=entry.id, account_id=account.id, label=description, debit=amount_ht, credit=0))
    db.add(JournalLine(organization_id=current_user.organization_id, entry_id=entry.id, account_id=vat_account.id, label=f"TVA {description}", debit=amount_tva, credit=0))
    db.add(JournalLine(organization_id=current_user.organization_id, entry_id=entry.id, account_id=payment_account.id, label=f"Paiement {description}", debit=0, credit=amount_ttc))
    db.commit()
    db.refresh(entry)
    return {
        "id": entry.id,
        "description": entry.description,
        "date": entry.entry_date,
        "amount": amount_ttc,
        "amount_ht": amount_ht,
        "amount_tva": amount_tva,
        "amount_ttc": amount_ttc,
        "account_code": account.code,
        "account_name": account.name,
        "payment_method": payment_method,
        "journal": entry.journal,
        "reference": entry.reference,
        "receipt_url": receipt_url,
    }


@router.get("/expenses/{expense_id}")
def get_expense(expense_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> dict[str, object]:
    entry = db.scalar(select(JournalEntry).where(JournalEntry.id == expense_id, JournalEntry.organization_id == current_user.organization_id, JournalEntry.source_type == "expense").options(selectinload(JournalEntry.lines)))
    if entry is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    return _serialize_expense_entry(entry, db)


@router.put("/expenses/{expense_id}")
def update_expense(expense_id: int, payload: dict[str, object], db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> dict[str, object]:
    entry = db.scalar(select(JournalEntry).where(JournalEntry.id == expense_id, JournalEntry.organization_id == current_user.organization_id, JournalEntry.source_type == "expense").options(selectinload(JournalEntry.lines)))
    if entry is None:
        raise HTTPException(status_code=404, detail="Expense not found")

    description = str(payload.get("description", entry.description)).strip() or entry.description
    amount_ht = float(payload.get("amount_ht", payload.get("amount", 0) or 0)) if payload.get("amount_ht") is not None or payload.get("amount") is not None else float(sum(line.debit for line in entry.lines if line.account_id and db.get(Account, line.account_id) and db.get(Account, line.account_id).code.startswith("6")))
    vat_rate = float(payload.get("vat_rate", 0) or 0)
    account_code = str(payload.get("account_code", "")).strip() or next((db.get(Account, line.account_id).code for line in entry.lines if line.debit > 0 and db.get(Account, line.account_id) and db.get(Account, line.account_id).code.startswith("6")), "601")
    payment_method = str(payload.get("payment_method", "cash")).strip().lower() or "cash"
    date_value = payload.get("date") or entry.entry_date

    if not description:
        raise HTTPException(status_code=400, detail="Expense description is required")
    if not (amount_ht > 0):
        raise HTTPException(status_code=400, detail="Expense amount HT must be positive")
    if payment_method not in {"cash", "bank", "credit"}:
        raise HTTPException(status_code=400, detail="Unsupported payment method")

    if payment_method == "cash":
        register_id = payload.get("register_id")
        register = None
        if register_id not in (None, "", "undefined"):
            try:
                register = db.get(CashRegister, int(register_id))
            except (TypeError, ValueError):
                register = None
        if register is None or register.organization_id != current_user.organization_id:
            register = db.scalar(select(CashRegister).where(CashRegister.organization_id == current_user.organization_id).order_by(CashRegister.id.asc()))
            if register is None:
                register = CashRegister(organization_id=current_user.organization_id, name="Caisse par défaut", code="DEFAULT")
                db.add(register)
                db.flush()
    elif payment_method == "credit":
        supplier_id = payload.get("supplier_id")
        supplier = None
        if supplier_id not in (None, "", "undefined"):
            try:
                supplier = db.get(Supplier, int(supplier_id))
            except (TypeError, ValueError):
                supplier = None
        if supplier is None or supplier.organization_id != current_user.organization_id:
            supplier = db.scalar(select(Supplier).where(Supplier.organization_id == current_user.organization_id).order_by(Supplier.id.asc()))
            if supplier is None:
                supplier = Supplier(organization_id=current_user.organization_id, name="Fournisseur par défaut", contact_name="Divers", email=None, phone=None, address=None, is_active=True)
                db.add(supplier)
                db.flush()

    accounts = get_or_create_default_accounts(db, current_user.organization_id)
    account = accounts.get(account_code) or db.scalar(select(Account).where(Account.organization_id == current_user.organization_id, Account.code == account_code))
    if account is None:
        account = Account(organization_id=current_user.organization_id, code=account_code, name=description[:160] or "Dépense", account_class=account_code[:1], is_active=True)
        db.add(account)
        db.flush()

    vat_account = accounts.get("4456") or db.scalar(select(Account).where(Account.organization_id == current_user.organization_id, Account.code == "4456"))
    if vat_account is None:
        vat_account = Account(organization_id=current_user.organization_id, code="4456", name="TVA déductible", account_class="4", is_active=True)
        db.add(vat_account)
        db.flush()

    payment_code = "401" if payment_method == "credit" else "571" if payment_method == "cash" else "521"
    payment_account = accounts.get(payment_code) or db.scalar(select(Account).where(Account.organization_id == current_user.organization_id, Account.code == payment_code))
    if payment_account is None:
        payment_account = Account(organization_id=current_user.organization_id, code=payment_code, name="Fournisseurs" if payment_code == "401" else "Caisse" if payment_code == "571" else "Banque", account_class=payment_code[:1], is_active=True)
        db.add(payment_account)
        db.flush()

    amount_tva = round(amount_ht * (vat_rate / 100), 2)
    amount_ttc = round(amount_ht + amount_tva, 2)

    entry.description = description
    entry.entry_date = date_value if isinstance(date_value, datetime) else datetime.fromisoformat(str(date_value))
    for line in list(entry.lines):
        db.delete(line)
    db.flush()
    db.add(JournalLine(organization_id=current_user.organization_id, entry_id=entry.id, account_id=account.id, label=description, debit=amount_ht, credit=0))
    db.add(JournalLine(organization_id=current_user.organization_id, entry_id=entry.id, account_id=vat_account.id, label=f"TVA {description}", debit=amount_tva, credit=0))
    db.add(JournalLine(organization_id=current_user.organization_id, entry_id=entry.id, account_id=payment_account.id, label=f"Paiement {description}", debit=0, credit=amount_ttc))
    db.commit()
    db.refresh(entry)
    return _serialize_expense_entry(entry, db)


@router.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> dict[str, object]:
    entry = db.scalar(select(JournalEntry).where(JournalEntry.id == expense_id, JournalEntry.organization_id == current_user.organization_id, JournalEntry.source_type == "expense").options(selectinload(JournalEntry.lines)))
    if entry is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(entry)
    db.commit()
    return {"message": "Expense deleted successfully"}


@router.get("/journal", response_model=list[JournalEntryRead])
def list_journal(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> list[JournalEntry]:
    return db.scalars(select(JournalEntry).where(JournalEntry.organization_id == current_user.organization_id).options(selectinload(JournalEntry.lines)).order_by(JournalEntry.entry_date.desc(), JournalEntry.id.desc())).unique().all()


@router.get("/trial-balance")
def trial_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "seller")),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
) -> list[dict[str, object]]:
    ensure_organization_accounting_defaults(db, current_user.organization_id)
    _validate_date_range(date_from, date_to)
    query = select(
        Account.id,
        Account.code,
        Account.name,
        func.coalesce(func.sum(JournalLine.debit), 0),
        func.coalesce(func.sum(JournalLine.credit), 0),
    ).where(Account.organization_id == current_user.organization_id).join(JournalLine, JournalLine.account_id == Account.id, isouter=True)

    if date_from is not None or date_to is not None:
        query = query.join(JournalEntry, JournalEntry.id == JournalLine.entry_id, isouter=True)
        if date_from is not None:
            query = query.where(JournalEntry.entry_date >= date_from)
        if date_to is not None:
            query = query.where(JournalEntry.entry_date <= date_to)

    rows = db.execute(query.group_by(Account.id).order_by(Account.code)).all()
    return [{"account_id": account_id, "code": code, "name": name, "debit": float(debit), "credit": float(credit), "balance": float(debit - credit)} for account_id, code, name, debit, credit in rows]


@router.get("/reports/balance-sheet")
def balance_sheet(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin", "seller")),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
) -> dict[str, object]:
    rows = trial_balance(db, _, date_from=date_from, date_to=date_to)
    assets = [row for row in rows if str(row["code"])[0] in {"2", "3", "4", "5"}]
    liabilities = [row for row in rows if str(row["code"])[0] == "1"]
    return {"assets": assets, "liabilities": liabilities, "total_assets": sum(max(float(row["balance"]), 0) for row in assets), "total_liabilities": sum(max(-float(row["balance"]), 0) for row in liabilities)}


@router.get("/reports/income-statement")
def income_statement(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin", "seller")),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
) -> dict[str, object]:
    rows = trial_balance(db, _, date_from=date_from, date_to=date_to)
    revenue = [row for row in rows if str(row["code"])[0] == "7"]
    expenses = [row for row in rows if str(row["code"])[0] == "6"]
    revenue_total = sum(-float(row["balance"]) for row in revenue)
    expense_total = sum(float(row["balance"]) for row in expenses)
    return {"revenue": revenue, "expenses": expenses, "revenue_total": revenue_total, "expense_total": expense_total, "net_result": revenue_total - expense_total}


@router.get("/reports/vat")
def vat_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "seller")),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
) -> dict[str, object]:
    _validate_date_range(date_from, date_to)
    query = select(Invoice).where(Invoice.organization_id == current_user.organization_id)
    if date_from is not None:
        query = query.where(Invoice.issue_date >= date_from)
    if date_to is not None:
        query = query.where(Invoice.issue_date <= date_to)
    invoices = db.scalars(query.order_by(Invoice.issue_date)).all()
    periods: dict[str, dict[str, float | str]] = {}
    for invoice in invoices:
        period = invoice.issue_date.strftime("%Y-%m")
        bucket = periods.setdefault(period, {"period": period, "taxable_base": 0.0, "tax_amount": 0.0, "total_amount": 0.0})
        bucket["taxable_base"] = float(bucket["taxable_base"]) + invoice.subtotal
        bucket["tax_amount"] = float(bucket["tax_amount"]) + invoice.tax_amount
        bucket["total_amount"] = float(bucket["total_amount"]) + invoice.total_amount
    return {"currency": "XOF", "periods": list(periods.values()), "taxable_base": sum(float(row["taxable_base"]) for row in periods.values()), "tax_amount": sum(float(row["tax_amount"]) for row in periods.values()), "total_amount": sum(float(row["total_amount"]) for row in periods.values())}


@router.get("/exports/journal.csv")
def export_journal_csv(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> Response:
    entries = db.scalars(select(JournalEntry).where(JournalEntry.organization_id == current_user.organization_id).options(selectinload(JournalEntry.lines)).order_by(JournalEntry.entry_date, JournalEntry.id)).unique().all()
    lines = ["date;reference;journal;compte;libelle;debit;credit"]
    for entry in entries:
        for line in entry.lines:
            account = db.get(Account, line.account_id)
            lines.append(f"{entry.entry_date:%Y-%m-%d};{entry.reference};{entry.journal};{account.code if account else line.account_id};{line.label};{line.debit:.2f};{line.credit:.2f}")
    return Response(content="\n".join(lines), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=journal-comptable.csv"})


@router.get("/taxes", response_model=list[TaxRead])
def list_taxes(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> list[Tax]:
    return db.scalars(select(Tax).where(Tax.organization_id == current_user.organization_id, Tax.is_active.is_(True)).order_by(Tax.rate.desc(), Tax.name)).all()


@router.post("/taxes", response_model=TaxRead, status_code=status.HTTP_201_CREATED)
def create_tax(payload: TaxCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> Tax:
    if db.scalar(select(Tax.id).where(Tax.organization_id == current_user.organization_id, Tax.code == payload.code)) is not None:
        raise HTTPException(status_code=409, detail="Tax code already exists")
    tax = Tax(**payload.model_dump(), organization_id=current_user.organization_id)
    db.add(tax)
    db.commit()
    db.refresh(tax)
    return tax


@router.get("/invoices", response_model=list[InvoiceRead])
def list_invoices(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "seller")),
) -> list[Invoice]:
    query = select(Invoice).where(Invoice.organization_id == current_user.organization_id).options(selectinload(Invoice.lines)).order_by(Invoice.issue_date.desc(), Invoice.id.desc())
    if current_user.role != "admin":
        query = query.join(Sale, Invoice.sale_id == Sale.id).where(Sale.user_id == current_user.id, Sale.organization_id == current_user.organization_id)
    if date_from is not None:
        query = query.where(Invoice.issue_date >= date_from)
    if date_to is not None:
        query = query.where(Invoice.issue_date <= date_to)
    return db.scalars(query).unique().all()


@router.post("/invoices/from-sale/{sale_id}", response_model=InvoiceRead, status_code=status.HTTP_201_CREATED)
def create_invoice_from_sale(
    sale_id: int,
    tax_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "seller")),
) -> Invoice:
    sale = db.scalar(select(Sale).options(selectinload(Sale.items)).where(Sale.id == sale_id, Sale.organization_id == current_user.organization_id))
    if sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")
    if current_user.role != "admin":
        session = get_open_cash_session(db, current_user)
        if session is None or sale.user_id != current_user.id or not handoff_is_acknowledged(session.id, current_user.id, db):
            raise HTTPException(status_code=403, detail="You cannot invoice this sale")
    if db.scalar(select(Invoice.id).where(Invoice.organization_id == current_user.organization_id, Invoice.sale_id == sale.id)) is not None:
        raise HTTPException(status_code=409, detail="An invoice already exists for this sale")

    tax = db.scalar(select(Tax).where(Tax.id == tax_id, Tax.organization_id == current_user.organization_id)) if tax_id is not None else None
    if tax_id is not None and (tax is None or not tax.is_active):
        raise HTTPException(status_code=404, detail="Tax not found")
    subtotal = float(sale.total_amount)
    tax_amount = round(subtotal * ((tax.rate if tax else 0.0) / 100), 2)
    sale.status = "completed"
    invoice_count = db.scalar(select(func.count(Invoice.id)).where(Invoice.organization_id == current_user.organization_id)) or 0
    invoice = Invoice(organization_id=current_user.organization_id, number=f"FAC-{datetime.utcnow():%Y}-{invoice_count + 1:06d}", sale_id=sale.id, customer_id=sale.customer_id, tax_id=tax.id if tax else None, status="paid", subtotal=subtotal, tax_amount=tax_amount, total_amount=subtotal + tax_amount)
    db.add(invoice)
    db.flush()
    for item in sale.items:
        db.add(InvoiceLine(organization_id=current_user.organization_id, invoice_id=invoice.id, product_id=item.product_id, description=f"Produit #{item.product_id}", quantity=item.quantity, unit_price=item.unit_price, line_total=item.line_total))
    account_codes = [payment_account_code(sale.payment_method), "4431", "701"]
    account_rows = db.scalars(select(Account).where(Account.organization_id == current_user.organization_id, Account.code.in_(account_codes))).all()
    accounts = {account.code: account for account in account_rows}
    if len(accounts) != len(set(account_codes)):
        raise HTTPException(status_code=500, detail="Default accounting accounts are missing")
    existing_sale_entry = db.scalar(select(JournalEntry).where(JournalEntry.organization_id == current_user.organization_id, JournalEntry.source_type == "sale", JournalEntry.source_id == sale.id))
    entry = existing_sale_entry
    if entry is None:
        entry = JournalEntry(organization_id=current_user.organization_id, reference=f"VE-{invoice.number}", journal="VENTES", description=f"Facture {invoice.number}", source_type="sale", source_id=sale.id)
        db.add(entry)
        db.flush()
    for line in list(entry.lines):
        db.delete(line)
    db.flush()
    db.add(JournalLine(organization_id=current_user.organization_id, entry_id=entry.id, account_id=accounts[payment_account_code(sale.payment_method)].id, label=f"Encaissement facture {invoice.number}", debit=invoice.total_amount, credit=0))
    db.add(JournalLine(organization_id=current_user.organization_id, entry_id=entry.id, account_id=accounts["701"].id, label=f"Vente facture {invoice.number}", debit=0, credit=invoice.subtotal))
    if invoice.tax_amount:
        db.add(JournalLine(organization_id=current_user.organization_id, entry_id=entry.id, account_id=accounts["4431"].id, label=f"TVA facture {invoice.number}", debit=0, credit=invoice.tax_amount))
    db.commit()
    return db.scalar(select(Invoice).options(selectinload(Invoice.lines)).where(Invoice.id == invoice.id, Invoice.organization_id == current_user.organization_id))


@router.put("/invoices/{invoice_id}", response_model=InvoiceRead)
def update_invoice(
    invoice_id: int,
    payload: dict[str, object],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "seller")),
) -> Invoice:
    invoice = db.scalar(
        select(Invoice)
        .where(Invoice.id == invoice_id, Invoice.organization_id == current_user.organization_id)
        .options(selectinload(Invoice.lines))
    )
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")

    sale_id = payload.get("sale_id")
    if sale_id in (None, "", "undefined"):
        sale_id = invoice.sale_id
    try:
        sale_id = int(sale_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Sale ID is invalid")

    sale = db.scalar(select(Sale).options(selectinload(Sale.items)).where(Sale.id == sale_id, Sale.organization_id == current_user.organization_id))
    if sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")

    if sale.id != invoice.sale_id and db.scalar(select(Invoice.id).where(Invoice.organization_id == current_user.organization_id, Invoice.sale_id == sale.id)) is not None:
        raise HTTPException(status_code=409, detail="An invoice already exists for this sale")

    tax_id = payload.get("tax_id")
    tax = None
    if tax_id not in (None, "", "undefined"):
        try:
            tax_id = int(tax_id)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Tax ID is invalid")
        tax = db.scalar(select(Tax).where(Tax.id == tax_id, Tax.organization_id == current_user.organization_id))
        if tax is None or not tax.is_active:
            raise HTTPException(status_code=404, detail="Tax not found")

    subtotal = float(sale.total_amount)
    tax_amount = round(subtotal * ((tax.rate if tax else 0.0) / 100), 2)

    invoice.sale_id = sale.id
    invoice.customer_id = sale.customer_id
    invoice.tax_id = tax.id if tax else None
    invoice.subtotal = subtotal
    invoice.tax_amount = tax_amount
    invoice.total_amount = subtotal + tax_amount
    invoice.status = "paid"
    sale.status = "completed"
    invoice.issue_date = datetime.utcnow()

    for line in list(invoice.lines):
        db.delete(line)
    db.flush()
    for item in sale.items:
        db.add(InvoiceLine(organization_id=current_user.organization_id, invoice_id=invoice.id, product_id=item.product_id, description=f"Produit #{item.product_id}", quantity=item.quantity, unit_price=item.unit_price, line_total=item.line_total))

    entry = db.scalar(select(JournalEntry).where(
        JournalEntry.organization_id == current_user.organization_id,
        or_(
            (JournalEntry.source_type == "sale") & (JournalEntry.source_id == sale.id),
            (JournalEntry.source_type == "invoice") & (JournalEntry.source_id == invoice.id),
        ),
    ))
    if entry is not None:
        for line in list(entry.lines):
            db.delete(line)
        db.flush()
        db.delete(entry)
        db.flush()

    account_codes = [payment_account_code(sale.payment_method), "4431", "701"]
    account_rows = db.scalars(select(Account).where(Account.organization_id == current_user.organization_id, Account.code.in_(account_codes))).all()
    accounts = {account.code: account for account in account_rows}
    if len(accounts) != len(set(account_codes)):
        raise HTTPException(status_code=500, detail="Default accounting accounts are missing")

    new_entry = JournalEntry(organization_id=current_user.organization_id, reference=f"VE-{invoice.number}", journal="VENTES", description=f"Facture {invoice.number}", source_type="sale", source_id=sale.id)
    db.add(new_entry)
    db.flush()
    db.add(JournalLine(organization_id=current_user.organization_id, entry_id=new_entry.id, account_id=accounts[payment_account_code(sale.payment_method)].id, label=f"Encaissement facture {invoice.number}", debit=invoice.total_amount, credit=0))
    db.add(JournalLine(organization_id=current_user.organization_id, entry_id=new_entry.id, account_id=accounts["701"].id, label=f"Vente facture {invoice.number}", debit=0, credit=invoice.subtotal))
    if invoice.tax_amount:
        db.add(JournalLine(organization_id=current_user.organization_id, entry_id=new_entry.id, account_id=accounts["4431"].id, label=f"TVA facture {invoice.number}", debit=0, credit=invoice.tax_amount))

    db.commit()
    db.refresh(invoice)
    return db.scalar(select(Invoice).options(selectinload(Invoice.lines)).where(Invoice.id == invoice.id, Invoice.organization_id == current_user.organization_id))


@router.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> dict[str, str]:
    invoice = db.scalar(select(Invoice).where(Invoice.id == invoice_id, Invoice.organization_id == current_user.organization_id).options(selectinload(Invoice.lines)))
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")

    entry = db.scalar(select(JournalEntry).where(JournalEntry.organization_id == current_user.organization_id, JournalEntry.source_type == "invoice", JournalEntry.source_id == invoice.id).options(selectinload(JournalEntry.lines)))
    if entry is not None:
        for line in list(entry.lines):
            db.delete(line)
        db.flush()
        db.delete(entry)
        db.flush()

    db.delete(invoice)
    db.commit()
    return {"message": "Invoice deleted successfully"}