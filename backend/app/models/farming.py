from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FarmingSite(Base):
    __tablename__ = "farming_sites"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    buildings: Mapped[list["FarmingBuilding"]] = relationship(back_populates="site", cascade="all, delete-orphan")


class FarmingBuilding(Base):
    __tablename__ = "farming_buildings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("farming_sites.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    site: Mapped[FarmingSite] = relationship(back_populates="buildings")
    batches: Mapped[list["FarmingBatch"]] = relationship(back_populates="building")


class FarmingBatch(Base):
    __tablename__ = "farming_batches"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    building_id: Mapped[int | None] = mapped_column(ForeignKey("farming_buildings.id"), nullable=True, index=True)
    reference: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    species: Mapped[str] = mapped_column(String(80), nullable=False, default="chicken")
    production_type: Mapped[str] = mapped_column(String(40), nullable=False)
    breed: Mapped[str | None] = mapped_column(String(120), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    initial_count: Mapped[int] = mapped_column(Integer, nullable=False)
    current_count: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    building: Mapped[FarmingBuilding | None] = relationship(back_populates="batches")
    health_events: Mapped[list["FarmingHealthEvent"]] = relationship(back_populates="batch", cascade="all, delete-orphan")


class FarmingHealthEvent(Base):
    __tablename__ = "farming_health_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("farming_batches.id"), nullable=False, index=True)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    diagnosis: Mapped[str | None] = mapped_column(String(255), nullable=True)
    treatment: Mapped[str | None] = mapped_column(String(255), nullable=True)
    affected_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mortality_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    veterinarian: Mapped[str | None] = mapped_column(String(160), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    batch: Mapped[FarmingBatch] = relationship(back_populates="health_events")


class FarmingConsumption(Base):
    __tablename__ = "farming_consumptions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("farming_batches.id"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    consumed_at: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class FarmingEggProduction(Base):
    __tablename__ = "farming_egg_productions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("farming_batches.id"), nullable=False, index=True)
    production_date: Mapped[date] = mapped_column(Date, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    damaged_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
