from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)


class SaleItemRead(SaleItemCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    line_total: float


class SaleCreate(BaseModel):
    customer_id: int
    status: str = "pending"
    notes: str | None = None
    items: list[SaleItemCreate]


class SaleUpdate(BaseModel):
    customer_id: int | None = None
    status: str | None = None
    notes: str | None = None


class SaleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    sale_date: datetime
    total_amount: float
    status: str
    notes: str | None = None
    items: list[SaleItemRead]
