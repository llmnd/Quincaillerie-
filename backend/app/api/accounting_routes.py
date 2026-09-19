from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.cash_routes import get_open_cash_session, handoff_is_acknowledged
from app.api.deps import get_db, require_module, require_roles
from app.models.accounting import Account, Invoice, InvoiceLine, JournalEntry, JournalLine, Tax
from app.models.sale import Sale
from app.models.user import User
from app.schemas.accounting import AccountCreate, AccountRead, InvoiceRead, JournalEntryRead, TaxCreate, TaxRead

router = APIRouter(prefix="/accounting", tags=["accounting"], dependencies=[Depends(require_module("accounting"))])


def _validate_date_range(date_from: datetime | None, date_to: datetime | None) -> tuple[datetime | None, datetime | None]:
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(status_code=400, detail="date_from must be before or equal to date_to")
    return date_from, date_to


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
    invoice_count = db.scalar(select(func.count(Invoice.id)).where(Invoice.organization_id == current_user.organization_id)) or 0
    invoice = Invoice(organization_id=current_user.organization_id, number=f"FAC-{datetime.utcnow():%Y}-{invoice_count + 1:06d}", sale_id=sale.id, customer_id=sale.customer_id, tax_id=tax.id if tax else None, subtotal=subtotal, tax_amount=tax_amount, total_amount=subtotal + tax_amount)
    db.add(invoice)
    db.flush()
    for item in sale.items:
        db.add(InvoiceLine(organization_id=current_user.organization_id, invoice_id=invoice.id, product_id=item.product_id, description=f"Produit #{item.product_id}", quantity=item.quantity, unit_price=item.unit_price, line_total=item.line_total))
    account_rows = db.scalars(select(Account).where(Account.organization_id == current_user.organization_id, Account.code.in_(["411", "4431", "701"]))).all()
    accounts = {account.code: account for account in account_rows}
    if len(accounts) != 3:
        raise HTTPException(status_code=500, detail="Default accounting accounts are missing")
    entry = JournalEntry(organization_id=current_user.organization_id, reference=f"VE-{invoice.number}", journal="VENTES", description=f"Facture {invoice.number}", source_type="invoice", source_id=invoice.id)
    db.add(entry)
    db.flush()
    db.add(JournalLine(organization_id=current_user.organization_id, entry_id=entry.id, account_id=accounts["411"].id, label=f"Client facture {invoice.number}", debit=invoice.total_amount, credit=0))
    db.add(JournalLine(organization_id=current_user.organization_id, entry_id=entry.id, account_id=accounts["701"].id, label=f"Vente facture {invoice.number}", debit=0, credit=invoice.subtotal))
    if invoice.tax_amount:
        db.add(JournalLine(organization_id=current_user.organization_id, entry_id=entry.id, account_id=accounts["4431"].id, label=f"TVA facture {invoice.number}", debit=0, credit=invoice.tax_amount))
    db.commit()
    return db.scalar(select(Invoice).options(selectinload(Invoice.lines)).where(Invoice.id == invoice.id, Invoice.organization_id == current_user.organization_id))