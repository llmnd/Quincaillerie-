from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.stock_movement import StockMovement
from app.schemas.sale import SaleCreate, SaleRead, SaleUpdate

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("", response_model=list[SaleRead])
def list_sales(db: Session = Depends(get_db)) -> list[Sale]:
    return db.scalars(select(Sale).order_by(Sale.id)).all()


@router.post("", response_model=SaleRead, status_code=status.HTTP_201_CREATED)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db)) -> Sale:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A sale must contain at least one item")

    sale = Sale(customer_id=payload.customer_id, status=payload.status, notes=payload.notes)
    db.add(sale)
    db.flush()

    total_amount = 0.0
    for item in payload.items:
        product = db.get(Product, item.product_id)
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item.product_id} not found")
        if item.quantity > product.stock_quantity:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient stock for product {product.id}")

        line_total = item.quantity * item.unit_price
        sale_item = SaleItem(
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
                product_id=item.product_id,
                movement_type="sale",
                quantity=item.quantity,
                reason=f"Sale #{sale.id}",
            )
        )
        total_amount += line_total

    sale.total_amount = total_amount
    db.commit()
    db.refresh(sale)
    return sale


@router.get("/{sale_id}", response_model=SaleRead)
def get_sale(sale_id: int, db: Session = Depends(get_db)) -> Sale:
    sale = db.get(Sale, sale_id)
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    return sale


@router.put("/{sale_id}", response_model=SaleRead)
def update_sale(sale_id: int, payload: SaleUpdate, db: Session = Depends(get_db)) -> Sale:
    sale = db.get(Sale, sale_id)
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(sale, field, value)

    db.commit()
    db.refresh(sale)
    return sale


@router.delete("/{sale_id}")
def delete_sale(sale_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    sale = db.get(Sale, sale_id)
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    db.delete(sale)
    db.commit()
    return {"message": "Sale deleted successfully"}
