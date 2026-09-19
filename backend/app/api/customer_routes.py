from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_module, require_roles
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerRead, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["customers"], dependencies=[Depends(require_module("customers"))])


@router.get("", response_model=list[CustomerRead])
def list_customers(
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: object = Depends(require_roles("admin", "seller")),
) -> list[Customer]:
    query = (
        select(Customer)
        .where(Customer.organization_id == current_user.organization_id)
        .order_by(Customer.id)
        .offset(offset)
        .limit(limit)
    )
    return db.scalars(query).all()


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db), current_user: object = Depends(require_roles("admin"))) -> Customer:
    customer = Customer(**payload.model_dump(), organization_id=current_user.organization_id)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(customer_id: int, db: Session = Depends(get_db), current_user: object = Depends(require_roles("admin", "seller"))) -> Customer:
    customer = db.scalar(select(Customer).where(Customer.id == customer_id, Customer.organization_id == current_user.organization_id))
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=CustomerRead)
def update_customer(customer_id: int, payload: CustomerUpdate, db: Session = Depends(get_db), current_user: object = Depends(require_roles("admin"))) -> Customer:
    customer = db.scalar(select(Customer).where(Customer.id == customer_id, Customer.organization_id == current_user.organization_id))
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db), current_user: object = Depends(require_roles("admin"))) -> dict[str, Any]:
    customer = db.scalar(select(Customer).where(Customer.id == customer_id, Customer.organization_id == current_user.organization_id))
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    db.delete(customer)
    db.commit()
    return {"message": "Customer deleted successfully"}
