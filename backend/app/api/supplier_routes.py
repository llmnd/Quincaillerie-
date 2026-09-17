from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_module, require_roles
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierRead, SupplierUpdate

router = APIRouter(prefix="/suppliers", tags=["suppliers"], dependencies=[Depends(require_module("stock"))])


@router.get("", response_model=list[SupplierRead])
def list_suppliers(db: Session = Depends(get_db), current_user: object = Depends(require_roles("admin"))) -> list[Supplier]:
    return db.scalars(select(Supplier).where(Supplier.organization_id == current_user.organization_id).order_by(Supplier.id)).all()


@router.post("", response_model=SupplierRead, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db), current_user: object = Depends(require_roles("admin"))) -> Supplier:
    supplier = Supplier(**payload.model_dump(), organization_id=current_user.organization_id)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/{supplier_id}", response_model=SupplierRead)
def get_supplier(supplier_id: int, db: Session = Depends(get_db), current_user: object = Depends(require_roles("admin"))) -> Supplier:
    supplier = db.scalar(select(Supplier).where(Supplier.id == supplier_id, Supplier.organization_id == current_user.organization_id))
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return supplier


@router.put("/{supplier_id}", response_model=SupplierRead)
def update_supplier(supplier_id: int, payload: SupplierUpdate, db: Session = Depends(get_db), current_user: object = Depends(require_roles("admin"))) -> Supplier:
    supplier = db.scalar(select(Supplier).where(Supplier.id == supplier_id, Supplier.organization_id == current_user.organization_id))
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)

    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db), current_user: object = Depends(require_roles("admin"))) -> dict[str, Any]:
    supplier = db.scalar(select(Supplier).where(Supplier.id == supplier_id, Supplier.organization_id == current_user.organization_id))
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    db.delete(supplier)
    db.commit()
    return {"message": "Supplier deleted successfully"}
