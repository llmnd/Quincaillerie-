from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


from app.models.product import Product  # noqa: E402,F401
from app.models.organization import Organization, OrganizationModule  # noqa: E402,F401
from app.models.user import User  # noqa: E402,F401
from app.models.customer import Customer  # noqa: E402,F401
from app.models.sale import Sale, SaleItem  # noqa: E402,F401
from app.models.stock_movement import StockMovement  # noqa: E402,F401
from app.models.supplier import Supplier  # noqa: E402,F401
from app.models.cash import AuditLog, CashHandoff, CashOperation, CashRegister, CashSession  # noqa: E402,F401
from app.models.accounting import Account, Invoice, InvoiceLine, JournalEntry, JournalLine, Tax  # noqa: E402,F401
from app.models.farming import FarmingBatch, FarmingBuilding, FarmingConsumption, FarmingEggProduction, FarmingHealthEvent, FarmingSite  # noqa: E402,F401

connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_sqlite_schema() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    with engine.begin() as connection:
        inspector = inspect(connection)
        tables = set(inspector.get_table_names())
        if not tables:
            Base.metadata.create_all(bind=engine)
            return

        if "organizations" not in tables:
            Base.metadata.create_all(bind=engine)
            return

        default_org_id = connection.execute(text("SELECT id FROM organizations ORDER BY id LIMIT 1")).scalar()
        if default_org_id is None:
            connection.execute(text("INSERT INTO organizations (name, slug, settings, is_active, created_at) VALUES ('Default Organization', 'default-organization', '{}', 1, CURRENT_TIMESTAMP)"))
            default_org_id = connection.execute(text("SELECT id FROM organizations ORDER BY id LIMIT 1")).scalar()

        user_columns = {column[1] for column in connection.execute(text("PRAGMA table_info(users)"))}
        if "organization_id" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN organization_id INTEGER"))
            connection.execute(text("UPDATE users SET organization_id = :org_id WHERE organization_id IS NULL"), {"org_id": default_org_id})

        for table_name in [
            "products",
            "customers",
            "suppliers",
            "stock_movements",
            "sales",
            "sale_items",
            "taxes",
            "invoices",
            "invoice_lines",
            "accounts",
            "journal_entries",
            "journal_lines",
            "cash_registers",
            "cash_sessions",
            "cash_handoffs",
            "cash_operations",
            "audit_logs",
            "farming_sites",
            "farming_buildings",
            "farming_batches",
            "farming_health_events",
            "farming_consumptions",
            "farming_egg_productions",
        ]:
            if table_name not in tables:
                continue
            columns = {column[1] for column in connection.execute(text(f"PRAGMA table_info({table_name})"))}
            if "organization_id" not in columns:
                connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN organization_id INTEGER"))
                connection.execute(text(f"UPDATE {table_name} SET organization_id = :org_id WHERE organization_id IS NULL"), {"org_id": default_org_id})

            if table_name == "sales" and "farming_batch_id" not in columns:
                connection.execute(text("ALTER TABLE sales ADD COLUMN farming_batch_id INTEGER"))

            if table_name == "farming_consumptions" and "batch_id" not in columns:
                connection.execute(text("ALTER TABLE farming_consumptions ADD COLUMN batch_id INTEGER"))


if settings.app_env != "production":
    ensure_sqlite_schema()
    Base.metadata.create_all(bind=engine)

