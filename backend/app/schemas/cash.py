from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CashRegisterCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    code: str = Field(min_length=1, max_length=50)


class CashRegisterRead(CashRegisterCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool


class CashSessionOpen(BaseModel):
    register_id: int
    actual_opening_amount: float = Field(ge=0)
    opening_note: str | None = None


class CashSessionClose(BaseModel):
    actual_closing_amount: float = Field(ge=0)
    closing_note: str | None = None


class CashSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    register_id: int
    user_id: int
    opened_at: datetime
    closed_at: datetime | None
    expected_opening_amount: float
    actual_opening_amount: float
    opening_difference: float
    expected_closing_amount: float | None
    actual_closing_amount: float | None
    closing_difference: float | None
    status: str


class CashOperationCreate(BaseModel):
    session_id: int
    operation_type: str
    amount: float = Field(gt=0)
    payment_method: str | None = None
    reason: str = Field(min_length=2, max_length=500)


class CashOperationRead(CashOperationCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    register_id: int
    user_id: int
    created_at: datetime