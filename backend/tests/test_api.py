import os
import uuid
from pathlib import Path

os.environ["APP_ENV"] = "test"
# Use a fresh SQLite file per test run so repeated runs do not reuse stale seeded data.
TEST_DB = Path(__file__).resolve().parents[1] / "test_erp_platform.db"
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app


client = TestClient(app)


def test_default_cors_settings_include_vercel_frontend():
    settings = Settings()
    assert "https://monerp.vercel.app" in settings.cors_origins
    assert "https://www.monerp.vercel.app" in settings.cors_origins
    assert settings.cors_origin_regex


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] in {"ok", "degraded"}
    assert "timestamp" in body


def test_ping_endpoint():
    response = client.get("/api/v1/ping")
    assert response.status_code == 200
    assert response.json() == {"message": "pong"}


def test_register_company_creates_admin_and_organization():
    payload = {
        "organization_name": "Boutique Demo",
        "full_name": "Nassim Admin",
        "email": f"admin-{uuid.uuid4().hex[:8]}@demo.test",
        "password": "StrongPass123",
    }

    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["full_name"] == "Nassim Admin"
    assert body["organization_id"] is not None
    assert body["role"] == "admin"


def test_new_organization_starts_with_default_accounting_chart():
    payload = {
        "organization_name": f"Compta Org {uuid.uuid4().hex[:8]}",
        "full_name": "Compta Admin",
        "email": f"compta-{uuid.uuid4().hex[:8]}@demo.test",
        "password": "StrongPass123",
    }

    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    organization_id = response.json()["organization_id"]

    accounts_response = client.get(
        "/api/v1/accounting/accounts",
        headers={"Authorization": f"Bearer {response.cookies.get('access_token', '')}"},
    )
    assert accounts_response.status_code == 200
    codes = {item["code"] for item in accounts_response.json()}
    assert {"411", "4431", "571", "701"}.issubset(codes)


def test_products_crud_flow():
    sku = f"SKU-{uuid.uuid4().hex[:8].upper()}"
    create_response = client.post(
        "/api/v1/products",
        json={
            "sku": sku,
            "name": "Clé à molette",
            "description": "Outil de précision",
            "category": "Outillage",
            "unit_price": 24.5,
            "stock_quantity": 12,
        },
    )
    assert create_response.status_code == 201
    payload = create_response.json()
    assert payload["sku"] == sku
    assert payload["name"] == "Clé à molette"

    list_response = client.get("/api/v1/products")
    assert list_response.status_code == 200
    assert len(list_response.json()) >= 1

    product_id = payload["id"]
    detail_response = client.get(f"/api/v1/products/{product_id}")
    assert detail_response.status_code == 200
    assert detail_response.json()["sku"] == sku


def test_website_current_is_scoped_by_organization():
    org1 = client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": f"Website Org 1 {uuid.uuid4().hex[:8]}",
            "full_name": "Website Admin 1",
            "email": f"website1-{uuid.uuid4().hex[:8]}@demo.test",
            "password": "StrongPass123",
        },
    )
    assert org1.status_code == 201
    org1_token = org1.cookies.get("access_token", "")

    org2 = client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": f"Website Org 2 {uuid.uuid4().hex[:8]}",
            "full_name": "Website Admin 2",
            "email": f"website2-{uuid.uuid4().hex[:8]}@demo.test",
            "password": "StrongPass123",
        },
    )
    assert org2.status_code == 201
    org2_token = org2.cookies.get("access_token", "")

    created = client.post(
        "/api/v1/websites",
        json={"name": "Premier site", "slug": "premier-site", "template": "commerce"},
        headers={"Authorization": f"Bearer {org1_token}"},
    )
    assert created.status_code == 201, created.text

    org1_current = client.get("/api/v1/websites/current", headers={"Authorization": f"Bearer {org1_token}"})
    assert org1_current.status_code == 200
    assert org1_current.json()["slug"] == "premier-site"

    org2_current = client.get("/api/v1/websites/current", headers={"Authorization": f"Bearer {org2_token}"})
    assert org2_current.status_code == 404

    public_response = client.get("/api/v1/websites/public/premier-site")
    assert public_response.status_code == 200
    assert public_response.json()["website"]["slug"] == "premier-site"


def test_website_upload_route_persists_media_for_current_org():
    org = client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": f"Media Org {uuid.uuid4().hex[:8]}",
            "full_name": "Media Admin",
            "email": f"media-{uuid.uuid4().hex[:8]}@demo.test",
            "password": "StrongPass123",
        },
    )
    assert org.status_code == 201, org.text
    token = org.cookies.get("access_token", "")

    site = client.post(
        "/api/v1/websites",
        json={"name": "Site Media", "slug": "site-media", "template": "commerce"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert site.status_code == 201, site.text

    upload = client.post(
        "/api/v1/websites/current/media/upload",
        files={"file": ("hero.png", b"fake-image-bytes", "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert upload.status_code == 200, upload.text
    body = upload.json()
    assert body["url"].startswith("data:image/png;base64,")

    current = client.get("/api/v1/websites/current", headers={"Authorization": f"Bearer {token}"})
    assert current.status_code == 200
    media = current.json().get("settings", {}).get("media", [])
    assert len(media) >= 1
    assert media[-1]["url"].startswith("data:image/png;base64,")


def test_supplier_customer_and_sale_flow():
    supplier_response = client.post(
        "/api/v1/suppliers",
        json={
            "name": "Fournisseur Test",
            "contact_name": "Jean Fournisseur",
            "email": "fournisseur@test.com",
            "phone": "0102030405",
            "address": "1 rue de test",
        },
    )
    assert supplier_response.status_code == 201
    supplier_id = supplier_response.json()["id"]

    customer_response = client.post(
        "/api/v1/customers",
        json={
            "name": "Client Test",
            "email": "client@test.com",
            "phone": "0607080910",
            "address": "2 avenue de test",
        },
    )
    assert customer_response.status_code == 201
    customer_id = customer_response.json()["id"]

    product_response = client.post(
        "/api/v1/products",
        json={
            "sku": f"SKU-{uuid.uuid4().hex[:8].upper()}",
            "name": "Produit de vente",
            "description": "Vente test",
            "category": "Vente",
            "unit_price": 15.0,
            "stock_quantity": 10,
        },
    )
    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    sale_response = client.post(
        "/api/v1/sales",
        json={
            "customer_id": customer_id,
            "status": "pending",
            "notes": "Test vente",
            "items": [
                {"product_id": product_id, "quantity": 2, "unit_price": 15.0},
            ],
        },
    )
    assert sale_response.status_code == 201
    sale_payload = sale_response.json()
    assert sale_payload["customer_id"] == customer_id
    assert sale_payload["total_amount"] == 30.0
    invoices_response = client.get("/api/v1/accounting/invoices")
    assert invoices_response.status_code == 200
    sale_invoice = next(invoice for invoice in invoices_response.json() if invoice["sale_id"] == sale_payload["id"])
    assert sale_invoice["status"] == "paid"
    assert sale_invoice["amount_due"] == 0.0
    assert len(sale_payload["items"]) == 1

    journal_response = client.get("/api/v1/accounting/journal")
    assert journal_response.status_code == 200
    sale_entries = [entry for entry in journal_response.json() if entry["source_type"] == "sale" and entry["source_id"] == sale_payload["id"]]
    assert len(sale_entries) == 1
    assert sum(line["debit"] for line in sale_entries[0]["lines"]) == sum(line["credit"] for line in sale_entries[0]["lines"]) == 30.0

    stock_response = client.get(f"/api/v1/products/{product_id}")
    assert stock_response.status_code == 200
    assert stock_response.json()["stock_quantity"] == 8

    supplier_list = client.get("/api/v1/suppliers")
    assert supplier_list.status_code == 200
    assert any(item["id"] == supplier_id for item in supplier_list.json())

    customer_list = client.get("/api/v1/customers")
    assert customer_list.status_code == 200
    assert any(item["id"] == customer_id for item in customer_list.json())


def test_manual_wave_payment_is_completed_and_does_not_create_receivable():
    product_response = client.post(
        "/api/v1/products",
        json={
            "sku": f"WAVE-{uuid.uuid4().hex[:8].upper()}",
            "name": "Produit Wave",
            "description": "Paiement manuel Wave",
            "category": "Vente",
            "unit_price": 100.0,
            "stock_quantity": 5,
        },
    )
    assert product_response.status_code == 201

    sale_response = client.post(
        "/api/v1/sales",
        json={
            "status": "pending",
            "payment_method": "wave",
            "items": [{"product_id": product_response.json()["id"], "quantity": 1, "unit_price": 100.0}],
        },
    )
    assert sale_response.status_code == 201
    assert sale_response.json()["status"] == "completed"

    accounts = {account["code"]: account["id"] for account in client.get("/api/v1/accounting/accounts").json()}
    journal = client.get("/api/v1/accounting/journal").json()
    sale_entry = next(entry for entry in journal if entry["source_type"] == "sale" and entry["source_id"] == sale_response.json()["id"])
    assert accounts["411"] not in {line["account_id"] for line in sale_entry["lines"]}
    assert accounts["521"] in {line["account_id"] for line in sale_entry["lines"]}


def test_expense_creation_reaches_journal():
    payload = {
        "organization_name": f"Depense Org {uuid.uuid4().hex[:8]}",
        "full_name": "Depense Admin",
        "email": f"expense-{uuid.uuid4().hex[:8]}@demo.test",
        "password": "StrongPass123",
    }
    register_response = client.post("/api/v1/auth/register", json=payload)
    assert register_response.status_code == 201

    expense_response = client.post(
        "/api/v1/accounting/expenses",
        json={
            "description": "Achat de visserie",
            "amount": 1250.0,
            "account_code": "601",
            "payment_method": "credit",
        },
    )
    assert expense_response.status_code == 201
    body = expense_response.json()
    assert body["description"] == "Achat de visserie"
    assert body["journal"] == "ACHAT"

    journal_response = client.get("/api/v1/accounting/journal")
    assert journal_response.status_code == 200
    assert any(entry["description"] == "Achat de visserie" for entry in journal_response.json())


def test_expense_update_and_delete_are_supported():
    payload = {
        "organization_name": f"Expense CRUD Org {uuid.uuid4().hex[:8]}",
        "full_name": "Expense CRUD Admin",
        "email": f"crud-expense-{uuid.uuid4().hex[:8]}@demo.test",
        "password": "StrongPass123",
    }
    register_response = client.post("/api/v1/auth/register", json=payload)
    assert register_response.status_code == 201

    create_response = client.post(
        "/api/v1/accounting/expenses",
        json={
            "description": "Dépense initiale",
            "amount": 500.0,
            "account_code": "601",
            "payment_method": "cash",
        },
    )
    assert create_response.status_code == 201
    expense_id = create_response.json()["id"]

    list_response = client.get("/api/v1/accounting/expenses")
    assert list_response.status_code == 200
    assert any(item["id"] == expense_id for item in list_response.json())

    update_response = client.put(
        f"/api/v1/accounting/expenses/{expense_id}",
        json={
            "description": "Dépense modifiée",
            "amount": 750.0,
            "account_code": "601",
            "payment_method": "cash",
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["description"] == "Dépense modifiée"
    assert update_response.json()["amount"] == 750.0

    delete_response = client.delete(f"/api/v1/accounting/expenses/{expense_id}")
    assert delete_response.status_code == 200

    final_list_response = client.get("/api/v1/accounting/expenses")
    assert final_list_response.status_code == 200
    assert all(item["id"] != expense_id for item in final_list_response.json())


def test_invoice_update_and_delete_are_supported():
    payload = {
        "organization_name": f"Invoice CRUD Org {uuid.uuid4().hex[:8]}",
        "full_name": "Invoice CRUD Admin",
        "email": f"crud-invoice-{uuid.uuid4().hex[:8]}@demo.test",
        "password": "StrongPass123",
    }
    register_response = client.post("/api/v1/auth/register", json=payload)
    assert register_response.status_code == 201

    customer_response = client.post(
        "/api/v1/customers",
        json={
            "name": "Client facture",
            "email": "client-facture@test.com",
            "phone": "0600000000",
            "address": "3 rue de test",
        },
    )
    assert customer_response.status_code == 201
    customer_id = customer_response.json()["id"]

    product_response = client.post(
        "/api/v1/products",
        json={
            "sku": f"INV-{uuid.uuid4().hex[:8].upper()}",
            "name": "Produit facture",
            "description": "Produit test invoice",
            "category": "Vente",
            "unit_price": 35.0,
            "stock_quantity": 15,
        },
    )
    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    sale_response = client.post(
        "/api/v1/sales",
        json={
            "customer_id": customer_id,
            "status": "paid",
            "notes": "Vente pour facture",
            "items": [
                {"product_id": product_id, "quantity": 2, "unit_price": 35.0},
            ],
        },
    )
    assert sale_response.status_code == 201
    sale_id = sale_response.json()["id"]

    invoice_list_response = client.get("/api/v1/accounting/invoices")
    assert invoice_list_response.status_code == 200
    invoice_payload = next(invoice for invoice in invoice_list_response.json() if invoice["sale_id"] == sale_id)
    assert invoice_payload["status"] == "paid"
    assert invoice_payload["amount_due"] == 0.0
    invoice_id = invoice_payload["id"]

    update_response = client.put(
        f"/api/v1/accounting/invoices/{invoice_id}",
        json={"sale_id": sale_id, "tax_id": None},
    )
    assert update_response.status_code == 200
    assert update_response.json()["id"] == invoice_id

    delete_response = client.delete(f"/api/v1/accounting/invoices/{invoice_id}")
    assert delete_response.status_code == 200

    final_list_response = client.get("/api/v1/accounting/invoices")
    assert final_list_response.status_code == 200
    assert all(item["id"] != invoice_id for item in final_list_response.json())


def test_stock_movement_and_sale_inventory_adjustments():
    product_response = client.post(
        "/api/v1/products",
        json={
            "sku": f"STOCK-{uuid.uuid4().hex[:8].upper()}",
            "name": "Produit stock",
            "description": "Test stock",
            "category": "Stock",
            "unit_price": 20.0,
            "stock_quantity": 12,
        },
    )
    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    movement_response = client.post(
        "/api/v1/stock-movements",
        json={
            "product_id": product_id,
            "movement_type": "purchase",
            "quantity": 8,
            "reason": "Réapprovisionnement",
        },
    )
    assert movement_response.status_code == 201
    assert movement_response.json()["quantity"] == 8

    stock_after_purchase = client.get(f"/api/v1/products/{product_id}")
    assert stock_after_purchase.status_code == 200
    assert stock_after_purchase.json()["stock_quantity"] == 20

    customer_response = client.post(
        "/api/v1/customers",
        json={
            "name": "Client Stock",
            "email": f"stock-{uuid.uuid4().hex[:8]}@test.com",
            "phone": "0700000000",
            "address": "99 rue stock",
        },
    )
    assert customer_response.status_code == 201
    customer_id = customer_response.json()["id"]

    sale_response = client.post(
        "/api/v1/sales",
        json={
            "customer_id": customer_id,
            "status": "paid",
            "notes": "Vente sur stock",
            "items": [
                {"product_id": product_id, "quantity": 5, "unit_price": 22.0},
            ],
        },
    )
    assert sale_response.status_code == 201
    assert sale_response.json()["total_amount"] == 110.0

    remaining_stock = client.get(f"/api/v1/products/{product_id}")
    assert remaining_stock.status_code == 200
    assert remaining_stock.json()["stock_quantity"] == 15


def test_organization_profile_accepts_long_logo_data_urls():
    suffix = uuid.uuid4().hex[:8]
    email = f"logo-{suffix}@demo.test"
    org_name = f"Logo Org {suffix}"
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": org_name,
            "full_name": "Logo Admin",
            "email": email,
            "password": "StrongPass123",
        },
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPass123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    logo_data = "data:image/png;base64," + ("A" * 50000)

    update_response = client.put(
        "/api/v1/organization/profile",
        json={"name": org_name, "logo": logo_data},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["logo"] == logo_data


def test_login_is_rate_limited_after_repeated_failures():
    email = f"rate-limit-{uuid.uuid4().hex[:8]}@demo.test"
    org_name = f"Rate Limit Org {uuid.uuid4().hex[:6]}"

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": org_name,
            "full_name": "Rate Limit Admin",
            "email": email,
            "password": "StrongPass123",
        },
    )
    assert register_response.status_code == 201

    for _ in range(5):
        failure_response = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "wrong-password"},
        )
        assert failure_response.status_code == 401

    locked_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPass123"},
    )
    assert locked_response.status_code == 429


def test_sensitive_actions_generate_audit_entries():
    email = f"audit-{uuid.uuid4().hex[:8]}@demo.test"
    org_name = f"Audit Org {uuid.uuid4().hex[:6]}"

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": org_name,
            "full_name": "Audit Admin",
            "email": email,
            "password": "StrongPass123",
        },
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPass123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    module_response = client.patch(
        "/api/v1/organization/modules/suppliers?enabled=false",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert module_response.status_code == 200

    audit_list = client.get(
        "/api/v1/cash/audit",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert audit_list.status_code == 200
    actions = {entry["action"] for entry in audit_list.json()}
    assert "auth.register" in actions
    assert "auth.login" in actions
    assert "organization.module.updated" in actions


def test_disabled_cash_module_blocks_access():
    email = f"cash-module-{uuid.uuid4().hex[:8]}@demo.test"
    org_name = f"Cash Module Org {uuid.uuid4().hex[:6]}"

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": org_name,
            "full_name": "Cash Admin",
            "email": email,
            "password": "StrongPass123",
        },
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPass123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    disable_response = client.patch(
        "/api/v1/organization/modules/cash?enabled=false",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert disable_response.status_code == 200

    blocked_response = client.get(
        "/api/v1/cash/registers",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert blocked_response.status_code == 403


def test_organizations_are_isolated():
    org1_email = f"org1-{uuid.uuid4().hex[:8]}@demo.test"
    org2_email = f"org2-{uuid.uuid4().hex[:8]}@demo.test"

    org1 = client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": f"Org1-{uuid.uuid4().hex[:6]}",
            "full_name": "Alice Org 1",
            "email": org1_email,
            "password": "StrongPass123",
        },
    )
    assert org1.status_code == 201
    org1_token = client.post(
        "/api/v1/auth/login",
        json={"email": org1_email, "password": "StrongPass123"},
    )
    assert org1_token.status_code == 200
    org1_access = org1_token.json()["access_token"]

    org2 = client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": f"Org2-{uuid.uuid4().hex[:6]}",
            "full_name": "Bob Org 2",
            "email": org2_email,
            "password": "StrongPass123",
        },
    )
    assert org2.status_code == 201
    org2_token = client.post(
        "/api/v1/auth/login",
        json={"email": org2_email, "password": "StrongPass123"},
    )
    assert org2_token.status_code == 200
    org2_access = org2_token.json()["access_token"]

    product1 = client.post(
        "/api/v1/products",
        json={
            "sku": f"ORG1-{uuid.uuid4().hex[:8].upper()}",
            "name": "Produit org 1",
            "description": "Produit de l'organisation 1",
            "category": "Outillage",
            "unit_price": 10.0,
            "stock_quantity": 5,
        },
        headers={"Authorization": f"Bearer {org1_access}"},
    )
    assert product1.status_code == 201

    product2 = client.post(
        "/api/v1/products",
        json={
            "sku": f"ORG2-{uuid.uuid4().hex[:8].upper()}",
            "name": "Produit org 2",
            "description": "Produit de l'organisation 2",
            "category": "Outillage",
            "unit_price": 20.0,
            "stock_quantity": 7,
        },
        headers={"Authorization": f"Bearer {org2_access}"},
    )
    assert product2.status_code == 201

    list_org1 = client.get(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {org1_access}"},
    )
    assert list_org1.status_code == 200
    assert any(item["id"] == product1.json()["id"] for item in list_org1.json())
    assert not any(item["id"] == product2.json()["id"] for item in list_org1.json())

    list_org2 = client.get(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {org2_access}"},
    )
    assert list_org2.status_code == 200
    assert any(item["id"] == product2.json()["id"] for item in list_org2.json())
    assert not any(item["id"] == product1.json()["id"] for item in list_org2.json())
