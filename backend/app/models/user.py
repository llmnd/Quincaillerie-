from sqlalchemy import Boolean, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="seller")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    permissions: Mapped[dict[str, bool]] = mapped_column(JSON, nullable=False, default=dict)
    pinned_modules: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    organization: Mapped["Organization"] = relationship(back_populates="users")