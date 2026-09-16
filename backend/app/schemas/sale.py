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
    customer_id: int | None = None
    status: str = "pending"
    notes: str | None = None
    discount_amount: float = Field(default=0, ge=0)
    payment_method: str = "cash"
    items: list[SaleItemCreate]


class SaleUpdate(BaseModel):
    customer_id: int | None = None
    status: str | None = None
    notes: str | None = None
    discount_amount: float | None = Field(default=None, ge=0)
    payment_method: str | None = None


class SaleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int | None
    sale_date: datetime
    total_amount: float
    status: str
    notes: str | None = None
    user_id: int | None = None
    session_id: int | None = None
    discount_amount: float
    payment_method: str
    items: list[SaleItemRead]
