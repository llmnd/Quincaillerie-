from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


from app.models.product import Product  # noqa: E402,F401
from app.models.user import User  # noqa: E402,F401
from app.models.cash import AuditLog, CashHandoff, CashOperation, CashRegister, CashSession  # noqa: E402,F401

connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

