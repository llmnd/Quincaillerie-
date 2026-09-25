from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StockMovementCreate(BaseModel):
    product_id: int
    movement_type: str = Field(..., min_length=1)
    quantity: int = Field(..., gt=0)
    source_type: str | None = None
    source_id: int | None = None
    reason: str | None = None


class StockMovementRead(StockMovementCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
