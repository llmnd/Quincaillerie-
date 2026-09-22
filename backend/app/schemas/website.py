from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WebsiteBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    logo: str | None = Field(default=None, max_length=2000)
    favicon: str | None = Field(default=None, max_length=2000)
    template: str | None = Field(default="commerce", max_length=100)
    published: bool = False
    theme: dict[str, Any] = Field(default_factory=dict)
    settings: dict[str, Any] = Field(default_factory=dict)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip().lower().replace(" ", "-")
        if not cleaned:
            raise ValueError("Slug cannot be empty")
        return cleaned


class WebsiteCreate(WebsiteBase):
    pass


class WebsiteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    slug: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    logo: str | None = Field(default=None, max_length=2000)
    favicon: str | None = Field(default=None, max_length=2000)
    template: str | None = Field(default=None, max_length=100)
    published: bool | None = None
    theme: dict[str, Any] | None = None
    settings: dict[str, Any] | None = None

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip().lower().replace(" ", "-")
        if not cleaned:
            raise ValueError("Slug cannot be empty")
        return cleaned


class WebsiteRead(WebsiteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_at: str | None = None
    updated_at: str | None = None


class WebsitePageBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str | None = Field(default=None, min_length=2, max_length=100)
    title: str | None = Field(default=None, max_length=255)
    meta_title: str | None = Field(default=None, max_length=255)
    meta_description: str | None = Field(default=None, max_length=500)
    position: int = 0
    published: bool = True

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip().lower().replace(" ", "-")
        if not cleaned:
            raise ValueError("Slug cannot be empty")
        return cleaned


class WebsitePageCreate(WebsitePageBase):
    pass


class WebsitePageUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    slug: str | None = Field(default=None, min_length=2, max_length=100)
    title: str | None = Field(default=None, max_length=255)
    meta_title: str | None = Field(default=None, max_length=255)
    meta_description: str | None = Field(default=None, max_length=500)
    position: int | None = None
    published: bool | None = None

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip().lower().replace(" ", "-")
        if not cleaned:
            raise ValueError("Slug cannot be empty")
        return cleaned


class WebsitePageRead(WebsitePageBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    website_id: int
    created_at: str | None = None
    updated_at: str | None = None


class WebsiteSectionBase(BaseModel):
    type: Literal[
        "hero",
        "text",
        "image",
        "image_text",
        "products",
        "product_grid",
        "categories",
        "banner",
        "about",
        "contact",
        "gallery",
        "testimonials",
        "features",
        "faq",
        "map",
        "social_links",
        "footer",
    ] = "text"
    position: int = 0
    content: dict[str, Any] = Field(default_factory=dict)
    settings: dict[str, Any] = Field(default_factory=dict)
    visible: bool = True


class WebsiteSectionCreate(WebsiteSectionBase):
    pass


class WebsiteSectionUpdate(BaseModel):
    type: Literal[
        "hero",
        "text",
        "image",
        "image_text",
        "products",
        "product_grid",
        "categories",
        "banner",
        "about",
        "contact",
        "gallery",
        "testimonials",
        "features",
        "faq",
        "map",
        "social_links",
        "footer",
    ] | None = None
    position: int | None = None
    content: dict[str, Any] | None = None
    settings: dict[str, Any] | None = None
    visible: bool | None = None


class WebsiteSectionRead(WebsiteSectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    page_id: int
    created_at: str | None = None
    updated_at: str | None = None


class WebsiteDomainRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    website_id: int
    domain: str
    type: str = "subdomain"
    verified: bool = False
    active: bool = True
    created_at: str | None = None
