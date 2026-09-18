from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_module, require_roles
from app.models.farming import FarmingBatch, FarmingBuilding, FarmingConsumption, FarmingEggProduction, FarmingHealthEvent, FarmingSite
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.schemas.farming import (
    FarmingBatchCreate,
    FarmingBatchRead,
    FarmingBatchUpdate,
    FarmingBuildingCreate,
    FarmingBuildingRead,
    FarmingConsumptionCreate,
    FarmingConsumptionRead,
    FarmingEggProductionCreate,
    FarmingEggProductionRead,
    FarmingHealthEventCreate,
    FarmingHealthEventRead,
    FarmingSiteCreate,
    FarmingSiteRead,
)

router = APIRouter(prefix="/farming", tags=["farming"], dependencies=[Depends(require_module("farming"))])


@router.get("/sites", response_model=list[FarmingSiteRead])
def list_sites(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> list[FarmingSite]:
    return db.scalars(select(FarmingSite).where(FarmingSite.organization_id == current_user.organization_id, FarmingSite.is_active.is_(True)).order_by(FarmingSite.name)).all()


@router.post("/sites", response_model=FarmingSiteRead, status_code=status.HTTP_201_CREATED)
def create_site(payload: FarmingSiteCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> FarmingSite:
    site = FarmingSite(organization_id=current_user.organization_id, **payload.model_dump())
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@router.get("/buildings", response_model=list[FarmingBuildingRead])
def list_buildings(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> list[FarmingBuilding]:
    return db.scalars(select(FarmingBuilding).where(FarmingBuilding.organization_id == current_user.organization_id, FarmingBuilding.is_active.is_(True)).order_by(FarmingBuilding.name)).all()


@router.post("/buildings", response_model=FarmingBuildingRead, status_code=status.HTTP_201_CREATED)
def create_building(payload: FarmingBuildingCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> FarmingBuilding:
    site = db.scalar(select(FarmingSite).where(FarmingSite.id == payload.site_id, FarmingSite.organization_id == current_user.organization_id, FarmingSite.is_active.is_(True)))
    if site is None:
        raise HTTPException(status_code=404, detail="Farming site not found")
    building = FarmingBuilding(organization_id=current_user.organization_id, **payload.model_dump())
    db.add(building)
    db.commit()
    db.refresh(building)
    return building


@router.get("/batches", response_model=list[FarmingBatchRead])
def list_batches(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> list[FarmingBatch]:
    return db.scalars(select(FarmingBatch).where(FarmingBatch.organization_id == current_user.organization_id).order_by(FarmingBatch.start_date.desc(), FarmingBatch.id.desc())).all()


@router.post("/batches", response_model=FarmingBatchRead, status_code=status.HTTP_201_CREATED)
def create_batch(payload: FarmingBatchCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> FarmingBatch:
    if db.scalar(select(FarmingBatch.id).where(FarmingBatch.organization_id == current_user.organization_id, FarmingBatch.reference == payload.reference)) is not None:
        raise HTTPException(status_code=409, detail="Batch reference already exists")
    if payload.building_id is not None and db.scalar(select(FarmingBuilding.id).where(FarmingBuilding.id == payload.building_id, FarmingBuilding.organization_id == current_user.organization_id, FarmingBuilding.is_active.is_(True))) is None:
        raise HTTPException(status_code=404, detail="Farming building not found")
    batch = FarmingBatch(organization_id=current_user.organization_id, current_count=payload.initial_count, **payload.model_dump())
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.put("/batches/{batch_id}", response_model=FarmingBatchRead)
def update_batch(batch_id: int, payload: FarmingBatchUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> FarmingBatch:
    batch = db.scalar(select(FarmingBatch).where(FarmingBatch.id == batch_id, FarmingBatch.organization_id == current_user.organization_id))
    if batch is None:
        raise HTTPException(status_code=404, detail="Farming batch not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "reference" in update_data and update_data["reference"] is not None and update_data["reference"] != batch.reference:
        existing = db.scalar(select(FarmingBatch.id).where(FarmingBatch.organization_id == current_user.organization_id, FarmingBatch.reference == update_data["reference"], FarmingBatch.id != batch_id))
        if existing is not None:
            raise HTTPException(status_code=409, detail="Batch reference already exists")
    if "building_id" in update_data and update_data["building_id"] is not None:
        building = db.scalar(select(FarmingBuilding.id).where(FarmingBuilding.id == update_data["building_id"], FarmingBuilding.organization_id == current_user.organization_id, FarmingBuilding.is_active.is_(True)))
        if building is None:
            raise HTTPException(status_code=404, detail="Farming building not found")
    if "current_count" in update_data and update_data["current_count"] is not None and update_data["current_count"] < 0:
        raise HTTPException(status_code=400, detail="Current count cannot be negative")

    for field, value in update_data.items():
        setattr(batch, field, value)

    db.commit()
    db.refresh(batch)
    return batch


@router.delete("/batches/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> dict[str, str]:
    batch = db.scalar(select(FarmingBatch).where(FarmingBatch.id == batch_id, FarmingBatch.organization_id == current_user.organization_id))
    if batch is None:
        raise HTTPException(status_code=404, detail="Farming batch not found")

    for event in db.scalars(select(FarmingHealthEvent).where(FarmingHealthEvent.batch_id == batch_id)).all():
        db.delete(event)
    for production in db.scalars(select(FarmingEggProduction).where(FarmingEggProduction.batch_id == batch_id)).all():
        db.delete(production)
    for consumption in db.scalars(select(FarmingConsumption).where(FarmingConsumption.batch_id == batch_id)).all():
        db.delete(consumption)

    db.delete(batch)
    db.commit()
    return {"message": "Farming batch deleted successfully"}


@router.get("/health-events", response_model=list[FarmingHealthEventRead])
def list_health_events(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> list[FarmingHealthEvent]:
    return db.scalars(select(FarmingHealthEvent).where(FarmingHealthEvent.organization_id == current_user.organization_id).order_by(FarmingHealthEvent.event_date.desc(), FarmingHealthEvent.id.desc())).all()


@router.post("/health-events", response_model=FarmingHealthEventRead, status_code=status.HTTP_201_CREATED)
def create_health_event(payload: FarmingHealthEventCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> FarmingHealthEvent:
    batch = db.scalar(select(FarmingBatch).where(FarmingBatch.id == payload.batch_id, FarmingBatch.organization_id == current_user.organization_id, FarmingBatch.status == "active"))
    if batch is None:
        raise HTTPException(status_code=404, detail="Active farming batch not found")
    if payload.mortality_count > batch.current_count:
        raise HTTPException(status_code=400, detail="Mortality cannot exceed the current batch count")
    event = FarmingHealthEvent(organization_id=current_user.organization_id, **payload.model_dump())
    batch.current_count -= payload.mortality_count
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/consumptions", response_model=list[FarmingConsumptionRead])
def list_consumptions(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> list[FarmingConsumption]:
    return db.scalars(select(FarmingConsumption).where(FarmingConsumption.organization_id == current_user.organization_id).order_by(FarmingConsumption.consumed_at.desc(), FarmingConsumption.id.desc())).all()


@router.post("/consumptions", response_model=FarmingConsumptionRead, status_code=status.HTTP_201_CREATED)
def create_consumption(payload: FarmingConsumptionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> FarmingConsumption:
    batch = db.scalar(select(FarmingBatch).where(FarmingBatch.id == payload.batch_id, FarmingBatch.organization_id == current_user.organization_id, FarmingBatch.status == "active"))
    product = db.scalar(select(Product).where(Product.id == payload.product_id, Product.organization_id == current_user.organization_id, Product.is_active.is_(True)))
    if batch is None:
        raise HTTPException(status_code=404, detail="Active farming batch not found")
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.quantity > product.stock_quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock for farming consumption")
    product.stock_quantity -= payload.quantity
    consumption = FarmingConsumption(
        organization_id=current_user.organization_id,
        unit_cost=product.unit_price,
        **payload.model_dump(),
    )
    db.add(consumption)
    db.add(StockMovement(organization_id=current_user.organization_id, product_id=product.id, movement_type="farming_consumption", quantity=payload.quantity, reason=f"Batch {batch.reference}: {payload.reason or 'consumption'}"))
    db.commit()
    db.refresh(consumption)
    return consumption


@router.get("/egg-productions", response_model=list[FarmingEggProductionRead])
def list_egg_productions(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> list[FarmingEggProduction]:
    return db.scalars(select(FarmingEggProduction).where(FarmingEggProduction.organization_id == current_user.organization_id).order_by(FarmingEggProduction.production_date.desc(), FarmingEggProduction.id.desc())).all()


@router.post("/egg-productions", response_model=FarmingEggProductionRead, status_code=status.HTTP_201_CREATED)
def create_egg_production(payload: FarmingEggProductionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "seller"))) -> FarmingEggProduction:
    batch = db.scalar(select(FarmingBatch).where(FarmingBatch.id == payload.batch_id, FarmingBatch.organization_id == current_user.organization_id, FarmingBatch.status == "active"))
    if batch is not None:
        normalized_production_type = batch.production_type.strip().lower().replace("é", "e").replace("è", "e")
        if normalized_production_type not in {"layer", "layers", "pondeuse", "pondeuses", "ponte"}:
            batch = None
    if batch is None:
        raise HTTPException(status_code=404, detail="Active layer batch not found")
    if payload.damaged_quantity > payload.quantity:
        raise HTTPException(status_code=400, detail="Damaged eggs cannot exceed total production")
    production = FarmingEggProduction(organization_id=current_user.organization_id, **payload.model_dump())
    db.add(production)
    db.commit()
    db.refresh(production)
    return production
