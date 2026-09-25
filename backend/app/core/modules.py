from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.organization import OrganizationModule

MODULE_CATALOG: tuple[dict[str, object], ...] = (
    {"key": "sales", "label": "Ventes", "description": "Commandes et encaissements", "href": "/sales", "required": True},
    {"key": "cash", "label": "Caisse", "description": "Sessions et clôtures", "href": "/cash", "required": False},
    {"key": "products", "label": "Produits", "description": "Catalogue et tarifs", "href": "/products", "required": True},
    {"key": "users", "label": "Utilisateurs", "description": "Comptes et droits", "href": "/settings/users", "required": True},
    {"key": "customers", "label": "Clients", "description": "Contacts et comptes clients", "href": "/clients", "required": True},
    {"key": "suppliers", "label": "Fournisseurs", "description": "Fournisseurs et approvisionnements", "href": "/suppliers", "required": False},
    {"key": "stock", "label": "Stock", "description": "Inventaire et mouvements", "href": "/stock", "required": False},
    {"key": "accounting", "label": "Comptabilité", "description": "Taxes, factures et journaux", "href": "/accounting", "required": False},
    {"key": "reports", "label": "Rapports", "description": "Analyse de l’activité", "href": "/reports", "required": False},
    {"key": "farming", "label": "Élevage", "description": "Lots, bâtiments et suivi sanitaire", "href": "/farming", "required": False},
    {"key": "website", "label": "Website", "description": "Site public, pages et sections", "href": "/website", "required": False},
)

MODULES_BY_KEY = {str(module["key"]): module for module in MODULE_CATALOG}


def ensure_organization_modules(db: Session, organization_id: int) -> list[OrganizationModule]:
    existing = {
        module.module_key: module
        for module in db.scalars(
            select(OrganizationModule).where(OrganizationModule.organization_id == organization_id)
        ).all()
    }
    changed = False
    for definition in MODULE_CATALOG:
        key = str(definition["key"])
        module = existing.get(key)
        if module is None:
            module = OrganizationModule(
                organization_id=organization_id,
                module_key=key,
                enabled=True,
            )
            db.add(module)
            existing[key] = module
            changed = True
        elif bool(definition["required"]) and not module.enabled:
            module.enabled = True
            changed = True
    if changed:
        db.commit()
    return [existing[str(definition["key"])] for definition in MODULE_CATALOG]


def enabled_module_keys(db: Session, organization_id: int) -> set[str]:
    return {
        module.module_key
        for module in ensure_organization_modules(db, organization_id)
        if module.enabled
    }


def module_definitions() -> Iterable[dict[str, object]]:
    return MODULE_CATALOG
