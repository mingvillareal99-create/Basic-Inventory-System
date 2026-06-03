"""Backend API tests for Simple Inventory System."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fall back to frontend env file
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"')
                    break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"


# ----------------- Fixtures -----------------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    assert "access_token" in s.cookies, "access_token cookie missing"
    assert "refresh_token" in s.cookies, "refresh_token cookie missing"
    return s


@pytest.fixture
def cleanup_products(admin_session):
    created = []
    yield created
    for pid in created:
        try:
            admin_session.delete(f"{API}/products/{pid}")
        except Exception:
            pass


# ----------------- Auth Tests -----------------
class TestAuth:
    def test_login_success(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "id" in data

    def test_login_wrong_password(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpw"})
        assert r.status_code == 401

    def test_me_no_cookie(self):
        s = requests.Session()
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_register_new_user_and_duplicate(self):
        s = requests.Session()
        email = f"TEST_user_{uuid.uuid4().hex[:8]}@Example.COM"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "Test"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == email.lower(), "Email should be normalized to lowercase"
        assert "access_token" in s.cookies

        # Duplicate
        s2 = requests.Session()
        r2 = s2.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "T2"})
        assert r2.status_code == 400

    def test_brute_force_lockout(self):
        # Use a unique email to avoid affecting admin
        email = f"TEST_locktest_{uuid.uuid4().hex[:8]}@example.com"
        # Register the user first
        sreg = requests.Session()
        rreg = sreg.post(f"{API}/auth/register", json={"email": email, "password": "correctpw1"})
        assert rreg.status_code == 200

        s = requests.Session()
        statuses = []
        for _ in range(6):
            r = s.post(f"{API}/auth/login", json={"email": email, "password": "wrongpw"})
            statuses.append(r.status_code)
        # First 5 should be 401, 6th should be 429
        assert statuses[:5] == [401] * 5, f"Got {statuses}"
        assert statuses[5] == 429, f"Expected lockout 429 on 6th attempt, got {statuses}"


# ----------------- Product Tests -----------------
class TestProducts:
    def test_list_requires_auth(self):
        s = requests.Session()
        r = s.get(f"{API}/products")
        assert r.status_code == 401

    def test_list_products(self, admin_session):
        r = admin_session.get(f"{API}/products")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_product_valid(self, admin_session, cleanup_products):
        payload = {"name": "TEST_Mouse", "quantity": 10, "price": 19.99, "category": "TEST_Accessories"}
        r = admin_session.post(f"{API}/products", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["name"] == "TEST_Mouse"
        assert data["quantity"] == 10
        assert data["price"] == 19.99
        assert data["category"] == "TEST_Accessories"
        assert "id" in data
        cleanup_products.append(data["id"])

        # GET verify persistence
        rg = admin_session.get(f"{API}/products")
        assert any(p["id"] == data["id"] for p in rg.json())

    def test_create_product_invalid(self, admin_session):
        for bad in [
            {"name": "", "quantity": 1, "price": 1, "category": "X"},
            {"name": "X", "quantity": -1, "price": 1, "category": "X"},
            {"name": "X", "quantity": 1, "price": -2, "category": "X"},
            {"name": "X", "quantity": 1, "price": 1, "category": ""},
        ]:
            r = admin_session.post(f"{API}/products", json=bad)
            assert r.status_code == 422, f"Expected 422 for {bad}, got {r.status_code}"

    def test_update_product(self, admin_session, cleanup_products):
        r = admin_session.post(f"{API}/products", json={"name": "TEST_Old", "quantity": 3, "price": 5.0, "category": "TEST_C"})
        pid = r.json()["id"]
        cleanup_products.append(pid)

        ru = admin_session.patch(f"{API}/products/{pid}", json={"name": "TEST_New", "price": 7.5})
        assert ru.status_code == 200
        assert ru.json()["name"] == "TEST_New"
        assert ru.json()["price"] == 7.5

    def test_stock_adjustment(self, admin_session, cleanup_products):
        r = admin_session.post(f"{API}/products", json={"name": "TEST_Stock", "quantity": 5, "price": 2.0, "category": "TEST"})
        pid = r.json()["id"]
        cleanup_products.append(pid)

        # Increment
        r1 = admin_session.patch(f"{API}/products/{pid}/stock", json={"delta": 3})
        assert r1.status_code == 200 and r1.json()["quantity"] == 8

        # Decrement
        r2 = admin_session.patch(f"{API}/products/{pid}/stock", json={"delta": -2})
        assert r2.status_code == 200 and r2.json()["quantity"] == 6

        # Decrement below zero
        r3 = admin_session.patch(f"{API}/products/{pid}/stock", json={"delta": -100})
        assert r3.status_code == 400

    def test_delete_product(self, admin_session):
        r = admin_session.post(f"{API}/products", json={"name": "TEST_DEL", "quantity": 1, "price": 1, "category": "T"})
        pid = r.json()["id"]
        rd = admin_session.delete(f"{API}/products/{pid}")
        assert rd.status_code == 200

        # Delete again -> 404
        rd2 = admin_session.delete(f"{API}/products/{pid}")
        assert rd2.status_code == 404

    def test_search(self, admin_session, cleanup_products):
        prod = {"name": f"TEST_SearchableABC_{uuid.uuid4().hex[:6]}", "quantity": 1, "price": 1, "category": "TEST_UniqueCatXYZ"}
        r = admin_session.post(f"{API}/products", json=prod)
        pid = r.json()["id"]
        cleanup_products.append(pid)

        # Search by name (case-insensitive)
        rs = admin_session.get(f"{API}/products", params={"search": "searchableabc"})
        assert rs.status_code == 200
        assert any(p["id"] == pid for p in rs.json())

        # Search by category
        rs2 = admin_session.get(f"{API}/products", params={"search": "uniquecatxyz"})
        assert any(p["id"] == pid for p in rs2.json())

    def test_stats(self, admin_session, cleanup_products):
        # Create one low-stock product
        r = admin_session.post(f"{API}/products", json={"name": "TEST_LowStat", "quantity": 2, "price": 10.0, "category": "T"})
        pid = r.json()["id"]
        cleanup_products.append(pid)

        rs = admin_session.get(f"{API}/products/stats")
        assert rs.status_code == 200, rs.text
        data = rs.json()
        assert "total_products" in data
        assert "low_stock" in data
        assert "total_value" in data
        assert data["low_stock"] >= 1
        assert data["total_value"] >= 20.0
