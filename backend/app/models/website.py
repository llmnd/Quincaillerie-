from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Website(Base):
    __tablename__ = "websites"
    __table_args__ = (UniqueConstraint("slug", name="uq_websites_slug"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    logo: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    favicon: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    template: Mapped[str | None] = mapped_column(String(100), nullable=True, default="commerce")
    published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    theme: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    settings: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization: Mapped["Organization"] = relationship(back_populates="websites")
    pages: Mapped[list["WebsitePage"]] = relationship(back_populates="website", cascade="all, delete-orphan")
    domains: Mapped[list["WebsiteDomain"]] = relationship(back_populates="website", cascade="all, delete-orphan")


class WebsitePage(Base):
    __tablename__ = "website_pages"
    __table_args__ = (
        UniqueConstraint("website_id", "slug", name="uq_website_pages_website_slug"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    website_id: Mapped[int] = mapped_column(ForeignKey("websites.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meta_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    website: Mapped[Website] = relationship(back_populates="pages")
    sections: Mapped[list["WebsiteSection"]] = relationship(back_populates="page", cascade="all, delete-orphan")


class WebsiteSection(Base):
    __tablename__ = "website_sections"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    page_id: Mapped[int] = mapped_column(ForeignKey("website_pages.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(100), nullable=False, default="text")
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    settings: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    page: Mapped[WebsitePage] = relationship(back_populates="sections")


class WebsiteDomain(Base):
    __tablename__ = "website_domains"
    __table_args__ = (UniqueConstraint("domain", name="uq_website_domains_domain"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    website_id: Mapped[int] = mapped_column(ForeignKey("websites.id"), nullable=False, index=True)
    domain: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="subdomain")
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    website: Mapped[Website] = relationship(back_populates="domains")
