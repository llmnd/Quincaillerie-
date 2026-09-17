from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    sku: str
    name: str
    image_url: str | None = None
    description: str | None = None
    category: str | None = None
    unit_price: float = Field(..., ge=0)
    stock_quantity: int = Field(..., ge=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    sku: str | None = None
    name: str | None = None
    image_url: str | None = None
    description: str | None = None
    category: str | None = None
    unit_price: float | None = Field(default=None, ge=0)
    stock_quantity: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool = True
    initial_stock_quantity: int = 0
    sold_quantity: int = 0
    remaining_stock: int = 0
