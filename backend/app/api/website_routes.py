from __future__ import annotations

import base64
import re
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db, require_roles
from app.core.config import settings
from app.models.organization import Organization
from app.models.product import Product
from app.models.user import User
from app.models.website import Website, WebsiteDomain, WebsitePage, WebsiteSection
from app.schemas.website import (
    WebsiteCreate,
    WebsitePageCreate,
    WebsitePageUpdate,
    WebsiteRead,
    WebsiteSectionCreate,
    WebsiteSectionRead,
    WebsiteSectionUpdate,
    WebsiteUpdate,
)

router = APIRouter(prefix="/websites", tags=["websites"])

DEFAULT_THEME = {
    "primary": "#111827",
    "secondary": "#714B67",
    "background": "#FFFFFF",
    "text": "#111827",
    "font": "Inter, sans-serif",
    "radius": "medium",
    "buttonStyle": "rounded",
    "cardStyle": "soft",
    "headerStyle": "minimal",
    "footerStyle": "simple",
    "secondaryText": "#475569",
    "headerText": "#111827",
    "categoryText": "#475569",
    "priceText": "#111827",
}


def _serialize_website(website: Website) -> dict[str, Any]:
    domains = sorted(website.domains, key=lambda item: (item.type != "custom", item.id))
    primary_domain = next((item for item in domains if item.type == "custom" and item.active), None)
    if primary_domain is None:
        primary_domain = next((item for item in domains if item.type == "subdomain" and item.active), None)
    primary_host = primary_domain.domain if primary_domain else f"{website.organization.slug}.{settings.public_site_base_domain}"
    return {
        "id": website.id,
        "organization_id": website.organization_id,
        "name": website.name,
        "slug": website.slug,
        "description": website.description,
        "logo": website.logo,
        "favicon": website.favicon,
        "template": website.template,
        "published": website.published,
        "theme": {**DEFAULT_THEME, **(website.theme or {})},
        "settings": website.settings or {},
        "domains": [
            {
                "id": item.id,
                "domain": item.domain,
                "type": item.type,
                "verified": item.verified,
                "active": item.active,
            }
            for item in domains
        ],
        "primary_domain": primary_host,
        "public_url": f"{settings.public_site_protocol}://{primary_host}",
        "created_at": website.created_at.isoformat() if website.created_at else None,
        "updated_at": website.updated_at.isoformat() if website.updated_at else None,
    }


def _serialize_page(page: WebsitePage) -> dict[str, Any]:
    return {
        "id": page.id,
        "website_id": page.website_id,
        "name": page.name,
        "slug": page.slug,
        "title": page.title,
        "meta_title": page.meta_title,
        "meta_description": page.meta_description,
        "position": page.position,
        "published": page.published,
        "created_at": page.created_at.isoformat() if page.created_at else None,
        "updated_at": page.updated_at.isoformat() if page.updated_at else None,
    }


def _serialize_section(section: WebsiteSection) -> dict[str, Any]:
    return {
        "id": section.id,
        "page_id": section.page_id,
        "type": section.type,
        "position": section.position,
        "content": section.content or {},
        "settings": section.settings or {},
        "visible": section.visible,
        "created_at": section.created_at.isoformat() if section.created_at else None,
        "updated_at": section.updated_at.isoformat() if section.updated_at else None,
    }


def _get_website_for_current_org(db: Session, current_user: User, website_id: int | None = None, slug: str | None = None) -> Website:
    query = select(Website).where(Website.organization_id == current_user.organization_id)
    if website_id is not None:
        query = query.where(Website.id == website_id)
    if slug is not None:
        query = query.where(Website.slug == slug)
    website = db.scalar(query)
    if website is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Website not found")
    return website


def _normalize_domain(value: str) -> str:
    domain = value.strip().lower().rstrip(".")
    if "://" in domain:
        domain = domain.split("://", 1)[1]
    domain = domain.split("/", 1)[0].split(":", 1)[0]
    if not re.fullmatch(r"(?=.{1,255}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", domain):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid domain name")
    return domain


def _subdomain_for_website(website: Website) -> str:
    return f"{website.organization.slug}.{settings.public_site_base_domain}".lower()


def _ensure_subdomain(db: Session, website: Website) -> WebsiteDomain:
    domain = _subdomain_for_website(website)
    existing = db.scalar(select(WebsiteDomain).where(WebsiteDomain.domain == domain))
    if existing is not None:
        if existing.website_id != website.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization subdomain is already assigned")
        existing.active = True
        existing.verified = True
        return existing
    record = WebsiteDomain(website_id=website.id, domain=domain, type="subdomain", verified=True, active=True)
    db.add(record)
    return record


def _default_template_config(template: str | None) -> dict[str, Any]:
    template_name = template or "commerce"
    pages = [
        {"name": "Accueil", "slug": "accueil", "title": "Accueil", "published": True, "position": 0},
        {"name": "Produits", "slug": "produits", "title": "Produits", "published": True, "position": 1},
        {"name": "À propos", "slug": "a-propos", "title": "À propos", "published": True, "position": 2},
        {"name": "Contact", "slug": "contact", "title": "Contact", "published": True, "position": 3},
    ]
    sections = {
        "accueil": [
            {"type": "hero", "position": 0, "content": {"title": "Bienvenue", "subtitle": "Votre boutique professionnelle", "buttonText": "Découvrir", "buttonLink": "/produits"}, "settings": {"align": "left", "height": "medium"}},
            {"type": "products", "position": 1, "content": {"source": "products", "limit": 8, "show_price": True, "show_image": True, "show_description": True}, "settings": {"title": "Nos meilleures ventes"}},
        ],
        "produits": [
            {"type": "products", "position": 0, "content": {"source": "products", "limit": 12, "show_price": True, "show_image": True, "show_description": True}, "settings": {"title": "Catalogue"}},
        ],
        "a-propos": [{"type": "about", "position": 0, "content": {"title": "Qui sommes-nous ?", "text": "Notre entreprise"}, "settings": {}}],
        "contact": [{"type": "contact", "position": 0, "content": {"title": "Contactez-nous", "email": "contact@example.com", "phone": "0102030405"}, "settings": {}}],
    }
    if template_name == "services":
        pages = [
            {"name": "Accueil", "slug": "accueil", "title": "Accueil", "published": True, "position": 0},
            {"name": "Services", "slug": "services", "title": "Services", "published": True, "position": 1},
            {"name": "À propos", "slug": "a-propos", "title": "À propos", "published": True, "position": 2},
            {"name": "Contact", "slug": "contact", "title": "Contact", "published": True, "position": 3},
        ]
        sections = {
            "accueil": [
                {"type": "hero", "position": 0, "content": {"title": "Votre expertise à portée de main", "subtitle": "Des services fiables et professionnels", "buttonText": "Découvrir", "buttonLink": "/services"}, "settings": {"align": "left", "height": "medium"}},
                {"type": "features", "position": 1, "content": {"items": [{"title": "Expertise", "text": "Conseils métier"}, {"title": "Réactivité", "text": "Support rapide"}]}, "settings": {"title": "Pourquoi nous choisir ?"}},
            ],
            "services": [{"type": "text", "position": 0, "content": {"title": "Nos services", "text": "Des prestations pensées pour votre entreprise"}, "settings": {}}],
            "a-propos": [{"type": "about", "position": 0, "content": {"title": "Notre mission", "text": "Accompagner nos clients"}, "settings": {}}],
            "contact": [{"type": "contact", "position": 0, "content": {"title": "Nous écrire", "email": "contact@example.com", "phone": "0102030405"}, "settings": {}}],
        }
    return {"pages": pages, "sections": sections}


@router.get("/current", response_model=dict[str, Any])
def get_current_website(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "seller")),
) -> dict[str, Any]:
    website = db.scalar(
        select(Website)
        .where(Website.organization_id == current_user.organization_id)
        .order_by(Website.id.desc())
    )
    if website is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No website configured for this organization")
    return _serialize_website(website)


@router.post("", response_model=dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_website(
    payload: WebsiteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, Any]:
    slug = (payload.slug or payload.name).strip().lower().replace(" ", "-")
    if db.scalar(select(Website.id).where(Website.organization_id == current_user.organization_id, Website.slug == slug)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Website slug already exists")

    website = Website(
        organization_id=current_user.organization_id,
        name=payload.name.strip(),
        slug=slug,
        description=payload.description,
        logo=payload.logo,
        favicon=payload.favicon,
        template=payload.template or "commerce",
        published=payload.published,
        theme={**DEFAULT_THEME, **(payload.theme or {})},
        settings=payload.settings or {},
    )
    db.add(website)
    db.flush()

    template_defaults = _default_template_config(website.template)
    for page_order, page_config in enumerate(template_defaults["pages"]):
        page = WebsitePage(
            website_id=website.id,
            name=page_config["name"],
            slug=page_config["slug"],
            title=page_config.get("title"),
            meta_title=page_config.get("title"),
            meta_description=page_config.get("title"),
            position=page_config.get("position", page_order),
            published=page_config.get("published", True),
        )
        db.add(page)
        db.flush()
        for section_order, section_config in enumerate(template_defaults["sections"].get(page.slug, [])):
            db.add(
                WebsiteSection(
                    page_id=page.id,
                    type=section_config["type"],
                    position=section_config.get("position", section_order),
                    content=section_config.get("content", {}),
                    settings=section_config.get("settings", {}),
                    visible=True,
                )
            )
    db.commit()
    db.refresh(website)
    return _serialize_website(website)


@router.patch("/current", response_model=dict[str, Any])
def update_current_website(
    payload: WebsiteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, Any]:
    website = _get_website_for_current_org(db, current_user)
    update_data = payload.model_dump(exclude_unset=True)
    if "slug" in update_data and update_data["slug"] is not None:
        slug = update_data["slug"].strip().lower().replace(" ", "-")
        if slug != website.slug and db.scalar(select(Website.id).where(Website.organization_id == current_user.organization_id, Website.slug == slug)) is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Website slug already exists")
        website.slug = slug
    if "theme" in update_data and update_data["theme"] is not None:
        website.theme = {**(website.theme or DEFAULT_THEME), **update_data["theme"]}
    for field in ["name", "description", "logo", "favicon", "template", "published", "settings"]:
        if field in update_data and update_data[field] is not None:
            setattr(website, field, update_data[field])
    db.commit()
    db.refresh(website)
    return _serialize_website(website)


@router.post("/current/media/upload")
def upload_website_media(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, Any]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed")

    payload = file.file.read()
    if len(payload) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    if len(payload) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image must be smaller than 5 MB")

    encoded = base64.b64encode(payload).decode("ascii")
    url = f"data:{file.content_type};base64,{encoded}"

    website = _get_website_for_current_org(db, current_user)
    current_settings = website.settings or {}
    media_items = current_settings.get("media") if isinstance(current_settings.get("media"), list) else []
    media_items = [
        *media_items,
        {
            "id": len(media_items),
            "name": file.filename or "uploaded-image",
            "url": url,
            "content_type": file.content_type,
            "created_at": datetime.utcnow().isoformat(),
        },
    ]
    website.settings = {**current_settings, "media": media_items}
    db.commit()
    db.refresh(website)
    return {"id": len(media_items) - 1, "name": file.filename or "uploaded-image", "url": url, "content_type": file.content_type, "media": media_items}


@router.get("/current/media")
def list_website_media(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "seller")),
) -> dict[str, Any]:
    website = _get_website_for_current_org(db, current_user)
    media = website.settings.get("media") if isinstance(website.settings, dict) and isinstance(website.settings.get("media"), list) else []
    return {"media": media}


@router.get("/current/pages", response_model=list[dict[str, Any]])
def list_current_pages(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "seller")),
) -> list[dict[str, Any]]:
    website = _get_website_for_current_org(db, current_user)
    pages = db.scalars(select(WebsitePage).where(WebsitePage.website_id == website.id).order_by(WebsitePage.position.asc(), WebsitePage.id.asc())).all()
    return [_serialize_page(page) for page in pages]


@router.post("/current/pages", response_model=dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_page(
    payload: WebsitePageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, Any]:
    website = _get_website_for_current_org(db, current_user)
    slug = (payload.slug or payload.name).strip().lower().replace(" ", "-")
    if db.scalar(select(WebsitePage.id).where(WebsitePage.website_id == website.id, WebsitePage.slug == slug)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Page slug already exists")
    page = WebsitePage(website_id=website.id, name=payload.name.strip(), slug=slug, title=payload.title or payload.name.strip(), meta_title=payload.meta_title or payload.title or payload.name.strip(), meta_description=payload.meta_description, position=payload.position, published=payload.published)
    db.add(page)
    db.commit()
    db.refresh(page)
    return _serialize_page(page)


@router.patch("/pages/{page_id}", response_model=dict[str, Any])
def update_page(
    page_id: int,
    payload: WebsitePageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, Any]:
    page = db.scalar(select(WebsitePage).options(selectinload(WebsitePage.website)).where(WebsitePage.id == page_id, WebsitePage.website.has(Website.organization_id == current_user.organization_id)))
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    update_data = payload.model_dump(exclude_unset=True)
    if "slug" in update_data and update_data["slug"] is not None:
        slug = update_data["slug"].strip().lower().replace(" ", "-")
        if slug != page.slug and db.scalar(select(WebsitePage.id).where(WebsitePage.website_id == page.website_id, WebsitePage.slug == slug)) is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Page slug already exists")
        page.slug = slug
    for field in ["name", "title", "meta_title", "meta_description", "position", "published"]:
        if field in update_data:
            setattr(page, field, update_data[field])
    db.commit()
    db.refresh(page)
    return _serialize_page(page)


@router.delete("/pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page(
    page_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> Response:
    page = db.scalar(select(WebsitePage).where(WebsitePage.id == page_id, WebsitePage.website.has(Website.organization_id == current_user.organization_id)))
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    db.delete(page)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/pages/{page_id}/sections", response_model=list[dict[str, Any]])
def list_sections(
    page_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "seller")),
) -> list[dict[str, Any]]:
    page = db.scalar(select(WebsitePage).where(WebsitePage.id == page_id, WebsitePage.website.has(Website.organization_id == current_user.organization_id)))
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    sections = db.scalars(select(WebsiteSection).where(WebsiteSection.page_id == page.id).order_by(WebsiteSection.position.asc(), WebsiteSection.id.asc())).all()
    return [_serialize_section(section) for section in sections]


@router.post("/pages/{page_id}/sections", response_model=dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_section(
    page_id: int,
    payload: WebsiteSectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, Any]:
    page = db.scalar(select(WebsitePage).where(WebsitePage.id == page_id, WebsitePage.website.has(Website.organization_id == current_user.organization_id)))
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    section = WebsiteSection(
        page_id=page.id,
        type=payload.type,
        position=payload.position,
        content=payload.content or {},
        settings=payload.settings or {},
        visible=payload.visible,
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return _serialize_section(section)


@router.patch("/sections/{section_id}", response_model=dict[str, Any])
def update_section(
    section_id: int,
    payload: WebsiteSectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, Any]:
    section = db.scalar(select(WebsiteSection).where(WebsiteSection.id == section_id, WebsiteSection.page.has(WebsitePage.website.has(Website.organization_id == current_user.organization_id))))
    if section is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    update_data = payload.model_dump(exclude_unset=True)
    for field in ["type", "position", "content", "settings", "visible"]:
        if field in update_data:
            setattr(section, field, update_data[field])
    db.commit()
    db.refresh(section)
    return _serialize_section(section)


@router.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> Response:
    section = db.scalar(select(WebsiteSection).where(WebsiteSection.id == section_id, WebsiteSection.page.has(WebsitePage.website.has(Website.organization_id == current_user.organization_id))))
    if section is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    db.delete(section)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/current/publish")
def publish_website(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, Any]:
    website = _get_website_for_current_org(db, current_user)
    _ensure_subdomain(db, website)
    website.published = True
    db.commit()
    db.refresh(website)
    return _serialize_website(website)


@router.post("/current/unpublish")
def unpublish_website(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, Any]:
    website = _get_website_for_current_org(db, current_user)
    website.published = False
    db.commit()
    return _serialize_website(website)


@router.get("/current/domains", response_model=list[dict[str, Any]])
def list_current_website_domains(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "seller")),
) -> list[dict[str, Any]]:
    website = _get_website_for_current_org(db, current_user)
    return [
        {"id": item.id, "domain": item.domain, "type": item.type, "verified": item.verified, "active": item.active}
        for item in sorted(website.domains, key=lambda item: (item.type != "custom", item.id))
    ]


@router.post("/current/domains", response_model=dict[str, Any], status_code=status.HTTP_201_CREATED)
def add_current_website_domain(
    payload: dict[str, str],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, Any]:
    website = _get_website_for_current_org(db, current_user)
    raw_domain = payload.get("domain", "")
    domain = _normalize_domain(raw_domain)
    base_domain = settings.public_site_base_domain.lower().strip().rstrip(".")
    if domain == base_domain or domain.endswith(f".{base_domain}"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Use the automatic organization subdomain")
    existing = db.scalar(select(WebsiteDomain).where(WebsiteDomain.domain == domain))
    if existing is not None and existing.website_id != website.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Domain is already assigned")
    record = existing or WebsiteDomain(website_id=website.id, domain=domain, type="custom", verified=False, active=True)
    if existing is None:
        db.add(record)
    db.commit()
    db.refresh(record)
    return {
        "id": record.id,
        "domain": record.domain,
        "type": record.type,
        "verified": record.verified,
        "active": record.active,
        "verification": {"type": "CNAME", "name": record.domain, "target": base_domain},
    }


@router.delete("/current/domains/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_website_domain(
    domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> Response:
    website = _get_website_for_current_org(db, current_user)
    record = db.scalar(select(WebsiteDomain).where(WebsiteDomain.id == domain_id, WebsiteDomain.website_id == website.id))
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found")
    if record.type == "subdomain":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The automatic subdomain cannot be deleted")
    db.delete(record)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/public/{slug}", response_model=dict[str, Any])
def public_website(
    slug: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    website = db.scalar(select(Website).options(selectinload(Website.pages).selectinload(WebsitePage.sections)).where(Website.slug == slug))
    if website is None or not website.published:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Website not found")
    pages = sorted(website.pages, key=lambda page: page.position)
    page = next((item for item in pages if item.published), pages[0] if pages else None)
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Website has no pages")
    sections = sorted(page.sections, key=lambda section: section.position)
    products = db.scalars(select(Product).where(Product.organization_id == website.organization_id, Product.is_active.is_(True)).order_by(Product.id.desc()).limit(12)).all()
    return {
        "website": _serialize_website(website),
        "organization": {"id": website.organization_id, "name": db.scalar(select(Organization.name).where(Organization.id == website.organization_id))},
        "page": _serialize_page(page),
        "sections": [_serialize_section(section) for section in sections],
        "products": [
            {
                "id": product.id,
                "name": product.name,
                "description": product.description,
                "price": product.unit_price,
                "image": product.image_url,
                "category": product.category,
            }
            for product in products
        ],
    }


@router.get("/public/host/{host}", response_model=dict[str, Any])
def public_website_by_host(
    host: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    domain = _normalize_domain(host)
    website = db.scalar(
        select(Website)
        .join(WebsiteDomain, WebsiteDomain.website_id == Website.id)
        .where(
            WebsiteDomain.domain == domain,
            WebsiteDomain.active.is_(True),
            Website.published.is_(True),
        )
    )
    if website is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Published website not found for host")
    return public_website(website.slug, db)


@router.get("/public/{slug}/products")
def public_website_products(
    slug: str,
    limit: int = Query(default=12, ge=1, le=50),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    website = db.scalar(select(Website).where(Website.slug == slug))
    if website is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Website not found")
    products = db.scalars(select(Product).where(Product.organization_id == website.organization_id, Product.is_active.is_(True)).order_by(Product.id.desc()).limit(limit)).all()
    return {"products": [{"id": product.id, "name": product.name, "description": product.description, "price": product.unit_price, "image": product.image_url, "category": product.category} for product in products]}
