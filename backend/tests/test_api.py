import uuid

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_ping_endpoint():
    response = client.get("/api/v1/ping")
    assert response.status_code == 200
    assert response.json() == {"message": "pong"}


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
    assert len(sale_payload["items"]) == 1

    stock_response = client.get(f"/api/v1/products/{product_id}")
    assert stock_response.status_code == 200
    assert stock_response.json()["stock_quantity"] == 8

    supplier_list = client.get("/api/v1/suppliers")
    assert supplier_list.status_code == 200
    assert any(item["id"] == supplier_id for item in supplier_list.json())

    customer_list = client.get("/api/v1/customers")
    assert customer_list.status_code == 200
    assert any(item["id"] == customer_id for item in customer_list.json())


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
