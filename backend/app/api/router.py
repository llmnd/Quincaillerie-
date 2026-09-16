from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.customer_routes import router as customer_router
from app.api.deps import get_db
from app.api.deps import require_roles
from app.api.auth_routes import router as auth_router
from app.api.cash_routes import router as cash_router
from app.api.sale_routes import router as sale_router
from app.api.supplier_routes import router as supplier_router
from app.models.product import Product
from app.models.sale import SaleItem
from app.models.stock_movement import StockMovement
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.schemas.stock_movement import StockMovementCreate, StockMovementRead

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(supplier_router)
api_router.include_router(customer_router)
api_router.include_router(sale_router)
api_router.include_router(auth_router)
api_router.include_router(cash_router)


@api_router.get("/ping")
def ping() -> dict[str, str]:
    return {"message": "pong"}


def product_read(product: Product, sold_quantity: int = 0) -> ProductRead:
    return ProductRead(
        id=product.id,
        sku=product.sku,
        name=product.name,
        description=product.description,
        category=product.category,
        unit_price=product.unit_price,
        stock_quantity=product.stock_quantity,
        is_active=product.is_active,
        initial_stock_quantity=product.initial_stock_quantity,
        sold_quantity=sold_quantity,
        remaining_stock=product.stock_quantity,
    )


@api_router.get("/products", response_model=list[ProductRead])
def list_products(db: Session = Depends(get_db), _: object = Depends(require_roles("admin", "seller"))) -> list[ProductRead]:
    sold_subquery = select(func.coalesce(func.sum(SaleItem.quantity), 0)).where(SaleItem.product_id == Product.id).scalar_subquery()
    rows = db.execute(select(Product, sold_subquery.label("sold_quantity")).where(Product.is_active.is_(True)).order_by(Product.id)).all()
    return [product_read(product, int(sold_quantity)) for product, sold_quantity in rows]


@api_router.post("/products", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db), _: object = Depends(require_roles("admin"))) -> Product:
    existing = db.scalar(select(Product).where(Product.sku == payload.sku))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product SKU already exists")

    product = Product(**payload.model_dump(), initial_stock_quantity=payload.stock_quantity)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product_read(product)


@api_router.get("/products/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db), _: object = Depends(require_roles("admin", "seller"))) -> ProductRead:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    sold_quantity = db.scalar(select(func.coalesce(func.sum(SaleItem.quantity), 0)).where(SaleItem.product_id == product.id)) or 0
    return product_read(product, int(sold_quantity))


@api_router.put("/products/{product_id}", response_model=ProductRead)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db), _: object = Depends(require_roles("admin"))) -> ProductRead:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "sku" in update_data and update_data["sku"] != product.sku:
        if db.scalar(select(Product).where(Product.sku == update_data["sku"])) is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product SKU already exists")

    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    sold_quantity = db.scalar(select(func.coalesce(func.sum(SaleItem.quantity), 0)).where(SaleItem.product_id == product.id)) or 0
    return product_read(product, int(sold_quantity))


@api_router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), _: object = Depends(require_roles("admin"))) -> dict[str, Any]:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product.is_active = False
    db.commit()
    return {"message": "Product archived successfully"}


@api_router.get("/stock-movements", response_model=list[StockMovementRead])
def list_stock_movements(db: Session = Depends(get_db), _: object = Depends(require_roles("admin"))) -> list[StockMovement]:
    return db.scalars(select(StockMovement).order_by(StockMovement.id.desc())).all()


@api_router.post("/stock-movements", response_model=StockMovementRead, status_code=status.HTTP_201_CREATED)
def create_stock_movement(payload: StockMovementCreate, db: Session = Depends(get_db), _: object = Depends(require_roles("admin"))) -> StockMovement:
    product = db.get(Product, payload.product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if payload.movement_type.lower() not in {"purchase", "sale", "adjustment", "return"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported stock movement type")

    if payload.movement_type.lower() == "sale":
        if payload.quantity > product.stock_quantity:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock for sale")
        product.stock_quantity -= payload.quantity
    else:
        product.stock_quantity += payload.quantity

    movement = StockMovement(
        product_id=payload.product_id,
        movement_type=payload.movement_type,
        quantity=payload.quantity,
        reason=payload.reason,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement
