from typing import Any

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_module, require_roles
from app.api.cash_routes import get_open_cash_session, handoff_is_acknowledged
from app.core.accounting import MANUAL_PAYMENT_METHODS, create_sale_journal
from app.models.cash import AuditLog, CashOperation, CashSession
from app.models.accounting import Invoice, InvoiceLine
from app.models.farming import FarmingBatch
from app.models.user import User
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.stock_movement import StockMovement
from app.schemas.sale import SaleCreate, SaleRead, SaleUpdate

router = APIRouter(prefix="/sales", tags=["sales"], dependencies=[Depends(require_module("sales"))])


@router.get("", response_model=list[SaleRead])
def list_sales(
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user_id: int | None = Query(default=None),
    session_id: int | None = Query(default=None),
    register_id: int | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "seller")),
) -> list[Sale]:
    query = select(Sale).where(Sale.organization_id == current_user.organization_id).order_by(Sale.id.desc())
    if current_user.role != "admin":
        query = query.where(Sale.user_id == current_user.id)
    if user_id is not None:
        query = query.where(Sale.user_id == user_id)
    if session_id is not None:
        query = query.where(Sale.session_id == session_id)
    if register_id is not None:
        query = query.join(CashSession, Sale.session_id == CashSession.id).where(CashSession.register_id == register_id, Sale.organization_id == current_user.organization_id)
    if date_from is not None:
        query = query.where(Sale.sale_date >= date_from)
    if date_to is not None:
        query = query.where(Sale.sale_date <= date_to)
    return db.scalars(query.offset(offset).limit(limit)).all()


@router.post("", response_model=SaleRead, status_code=status.HTTP_201_CREATED)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> Sale:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A sale must contain at least one item")

    session = get_open_cash_session(db, current_user)
    if session is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Open a cash session before creating a sale")
    if current_user.role != "admin" and not handoff_is_acknowledged(session.id, current_user.id, db):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Acknowledge the cash handoff before creating a sale")
    if payload.payment_method not in MANUAL_PAYMENT_METHODS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported payment method")

    if payload.farming_batch_id is not None and db.scalar(select(FarmingBatch.id).where(FarmingBatch.id == payload.farming_batch_id, FarmingBatch.organization_id == current_user.organization_id)) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farming batch not found")
    sale = Sale(organization_id=current_user.organization_id, customer_id=payload.customer_id, farming_batch_id=payload.farming_batch_id, user_id=current_user.id, session_id=session.id, status="completed", notes=payload.notes, discount_amount=payload.discount_amount, payment_method=payload.payment_method)
    db.add(sale)
    db.flush()

    total_amount = 0.0
    for item in payload.items:
        product = db.scalar(select(Product).where(Product.id == item.product_id, Product.organization_id == current_user.organization_id))
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item.product_id} not found")
        if item.quantity > product.stock_quantity:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient stock for product {product.id}")

        line_total = item.quantity * item.unit_price
        sale_item = SaleItem(
            organization_id=current_user.organization_id,
            sale=sale,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=line_total,
        )
        db.add(sale_item)
        product.stock_quantity -= item.quantity

        db.add(
            StockMovement(
                organization_id=current_user.organization_id,
                product_id=item.product_id,
                movement_type="sale",
                quantity=item.quantity,
                reason=f"Sale #{sale.id}",
            )
        )
        total_amount += line_total

    if payload.discount_amount > total_amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discount cannot exceed sale subtotal")
    sale.total_amount = total_amount - payload.discount_amount
    try:
        create_sale_journal(
            db,
            organization_id=current_user.organization_id,
            sale_id=sale.id,
            amount=sale.total_amount,
            payment_method=payload.payment_method,
        )
        invoice_count = db.scalar(
            select(func.count(Invoice.id)).where(Invoice.organization_id == current_user.organization_id)
        ) or 0
        invoice = Invoice(
            organization_id=current_user.organization_id,
            number=f"FAC-{datetime.utcnow():%Y}-{invoice_count + 1:06d}",
            sale_id=sale.id,
            customer_id=sale.customer_id,
            status="paid",
            subtotal=sale.total_amount,
            tax_amount=0.0,
            total_amount=sale.total_amount,
        )
        db.add(invoice)
        db.flush()
        for item in sale.items:
            db.add(
                InvoiceLine(
                    organization_id=current_user.organization_id,
                    invoice_id=invoice.id,
                    product_id=item.product_id,
                    description=f"Produit #{item.product_id}",
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    line_total=item.line_total,
                )
            )
        db.add(CashOperation(organization_id=current_user.organization_id, register_id=session.register_id, session_id=session.id, user_id=current_user.id, operation_type="sale", amount=sale.total_amount, payment_method=payload.payment_method, reason=f"Sale #{sale.id}"))
        db.add(AuditLog(organization_id=current_user.organization_id, user_id=current_user.id, register_id=session.register_id, session_id=session.id, action="sale.created", entity_type="sale", entity_id=sale.id, amount=sale.total_amount, after_data=f"payment_method={payload.payment_method}"))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=500, detail="The accounting data for this sale could not be saved because the chart of accounts contains duplicate entries. The transaction was rolled back.") from None

    db.refresh(sale)
    return sale


@router.get("/{sale_id}", response_model=SaleRead)
def get_sale(sale_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> Sale:
    sale = db.scalar(select(Sale).where(Sale.id == sale_id, Sale.organization_id == current_user.organization_id))
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    return sale


@router.put("/{sale_id}", response_model=SaleRead)
def update_sale(sale_id: int, payload: SaleUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> Sale:
    sale = db.scalar(select(Sale).where(Sale.id == sale_id, Sale.organization_id == current_user.organization_id))
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    updates = payload.model_dump(exclude_unset=True)
    if updates.get("status") == "pending":
        updates["status"] = "completed"
    for field, value in updates.items():
        setattr(sale, field, value)

    db.commit()
    db.refresh(sale)
    return sale


@router.delete("/{sale_id}")
def delete_sale(sale_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> dict[str, Any]:
    sale = db.scalar(select(Sale).where(Sale.id == sale_id, Sale.organization_id == current_user.organization_id))
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    db.delete(sale)
    db.commit()
    return {"message": "Sale deleted successfully"}
