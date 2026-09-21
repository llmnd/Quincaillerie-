from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TaxCreate(BaseModel):
    code: str = Field(min_length=2, max_length=30)
    name: str = Field(min_length=2, max_length=120)
    rate: float = Field(ge=0, le=100)


class TaxRead(TaxCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool


class InvoiceLineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    description: str
    quantity: int
    unit_price: float
    line_total: float


class InvoiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    sale_id: int
    customer_id: int | None
    tax_id: int | None
    status: str
    issue_date: datetime
    currency: str
    subtotal: float
    tax_amount: float
    total_amount: float
    amount_due: float
    lines: list[InvoiceLineRead]


class AccountCreate(BaseModel):
    code: str = Field(min_length=2, max_length=20)
    name: str = Field(min_length=2, max_length=160)
    account_class: str = Field(min_length=1, max_length=2)


class ExpenseCreate(BaseModel):
    description: str = Field(min_length=2, max_length=255)
    amount: float = Field(gt=0)
    account_code: str = Field(min_length=2, max_length=20)
    payment_method: str = Field(default="cash")
    supplier_name: str | None = None
    issue_date: datetime | None = None


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    description: str
    amount: float
    account_code: str
    account_name: str
    payment_method: str
    journal: str
    issue_date: datetime


class AccountRead(AccountCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool


class JournalLineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    label: str
    debit: float
    credit: float


class JournalEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    entry_date: datetime
    journal: str
    description: str
    source_type: str | None
    source_id: int | None
    lines: list[JournalLineRead]