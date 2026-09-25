from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class FarmingSiteCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    location: str | None = Field(default=None, max_length=255)
    notes: str | None = None


class FarmingSiteRead(FarmingSiteCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime


class FarmingBuildingCreate(BaseModel):
    site_id: int
    name: str = Field(min_length=2, max_length=160)
    capacity: int | None = Field(default=None, ge=0)
    notes: str | None = None


class FarmingBuildingRead(FarmingBuildingCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool


class FarmingBatchCreate(BaseModel):
    building_id: int | None = None
    reference: str = Field(min_length=2, max_length=80)
    species: str = Field(default="chicken", min_length=2, max_length=80)
    production_type: str = Field(default="broiler", min_length=2, max_length=40)
    breed: str | None = Field(default=None, max_length=120)
    image_url: str | None = None
    start_date: date = Field(default_factory=date.today)
    initial_count: int = Field(gt=0)
    notes: str | None = None


class FarmingBatchUpdate(BaseModel):
    building_id: int | None = None
    reference: str | None = Field(default=None, min_length=2, max_length=80)
    species: str | None = Field(default=None, min_length=2, max_length=80)
    production_type: str | None = Field(default=None, min_length=2, max_length=40)
    breed: str | None = Field(default=None, max_length=120)
    image_url: str | None = None
    start_date: date | None = None
    initial_count: int | None = Field(default=None, gt=0)
    current_count: int | None = Field(default=None, ge=0)
    status: str | None = Field(default=None, min_length=2, max_length=30)
    notes: str | None = None


class FarmingBatchRead(FarmingBatchCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    current_count: int
    status: str
    created_at: datetime


class FarmingHealthEventCreate(BaseModel):
    batch_id: int
    event_date: date
    event_type: str = Field(min_length=2, max_length=40)
    title: str = Field(min_length=2, max_length=160)
    diagnosis: str | None = Field(default=None, max_length=255)
    treatment: str | None = Field(default=None, max_length=255)
    affected_count: int = Field(default=0, ge=0)
    mortality_count: int = Field(default=0, ge=0)
    veterinarian: str | None = Field(default=None, max_length=160)
    notes: str | None = None


class FarmingHealthEventRead(FarmingHealthEventCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class FarmingConsumptionCreate(BaseModel):
    batch_id: int
    product_id: int
    quantity: int = Field(gt=0)
    consumed_at: date
    reason: str | None = Field(default=None, max_length=255)


class FarmingConsumptionRead(FarmingConsumptionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    unit_cost: float
    created_at: datetime


class FarmingEggProductionCreate(BaseModel):
    batch_id: int
    production_date: date
    quantity: int = Field(gt=0)
    damaged_quantity: int = Field(default=0, ge=0)
    notes: str | None = Field(default=None, max_length=255)


class FarmingEggProductionRead(FarmingEggProductionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class FarmingStockTransferCreate(BaseModel):
    batch_id: int
    product_id: int
    egg_production_id: int | None = None
    transfer_type: str = Field(pattern="^(eggs|poultry)$")
    quantity: int = Field(gt=0)
    unit_cost: float = Field(default=0.0, ge=0)
    transfer_date: date = Field(default_factory=date.today)
    notes: str | None = Field(default=None, max_length=255)


class FarmingStockTransferRead(FarmingStockTransferCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
