"""Backend API tests for Inventory System — iteration 2 (roles + transactions)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
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
def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    return s, r


@pytest.fixture(scope="session")
def admin_session():
    s, r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    assert "access_token" in s.cookies
    return s


@pytest.fixture(scope="session")
def personnel_creds(admin_session):
    """Create a personnel user via admin, return creds + cleanup."""
    email = f"test_clerk_{uuid.uuid4().hex[:8]}@example.com"
    password = "clerk123"
    r = admin_session.post(f"{API}/users", json={
        "email": email, "password": password, "name": "Test Clerk", "role": "personnel"
    })
    assert r.status_code == 201, r.text
    user_id = r.json()["id"]
    yield {"email": email, "password": password, "id": user_id}
    try:
        admin_session.delete(f"{API}/users/{user_id}")
    except Exception:
        pass


@pytest.fixture(scope="session")
def personnel_session(personnel_creds):
    s, r = _login(personnel_creds["email"], personnel_creds["password"])
    assert r.status_code == 200, r.text
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


# ----------------- Auth -----------------
class TestAuth:
    def test_register_endpoint_removed(self):
        r = requests.post(f"{API}/auth/register", json={"email": "x@y.z", "password": "abcdef"})
        assert r.status_code == 404, f"/auth/register should be removed, got {r.status_code}"

    def test_login_admin(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "id" in data

    def test_login_personnel(self, personnel_session, personnel_creds):
        r = personnel_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "personnel"
        assert r.json()["email"] == personnel_creds["email"]

    def test_login_wrong_password(self):
        _, r = _login(ADMIN_EMAIL, "wrongpw_xyz")
        assert r.status_code == 401

    def test_brute_force_lockout(self, admin_session):
        # Create a temp user to brute-force
        email = f"TEST_lock_{uuid.uuid4().hex[:8]}@example.com"
        rc = admin_session.post(f"{API}/users", json={"email": email, "password": "correctpw1", "role": "personnel"})
        assert rc.status_code == 201
        uid = rc.json()["id"]
        try:
            s = requests.Session()
            statuses = []
            for _ in range(6):
                r = s.post(f"{API}/auth/login", json={"email": email, "password": "wrongpw"})
                statuses.append(r.status_code)
            assert statuses[:5] == [401] * 5, f"Got {statuses}"
            assert statuses[5] == 429, f"Expected 429 on 6th, got {statuses}"
        finally:
            admin_session.delete(f"{API}/users/{uid}")


# ----------------- Users (admin-only) -----------------
class TestUsers:
    def test_personnel_cannot_list_users(self, personnel_session):
        r = personnel_session.get(f"{API}/users")
        assert r.status_code == 403

    def test_personnel_cannot_create_user(self, personnel_session):
        r = personnel_session.post(f"{API}/users", json={
            "email": f"TEST_x_{uuid.uuid4().hex[:6]}@example.com", "password": "abcdef", "role": "personnel"
        })
        assert r.status_code == 403

    def test_admin_list_users(self, admin_session):
        r = admin_session.get(f"{API}/users")
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list)
        assert any(u["email"] == ADMIN_EMAIL for u in users)

    def test_create_user_default_role_personnel(self, admin_session):
        email = f"test_def_{uuid.uuid4().hex[:6]}@example.com"
        r = admin_session.post(f"{API}/users", json={"email": email, "password": "abcdef"})
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["role"] == "personnel"
        assert data["email"] == email
        admin_session.delete(f"{API}/users/{data['id']}")

    def test_create_user_admin_role(self, admin_session):
        email = f"TEST_adm_{uuid.uuid4().hex[:6]}@example.com"
        r = admin_session.post(f"{API}/users", json={"email": email, "password": "abcdef", "role": "admin"})
        assert r.status_code == 201
        assert r.json()["role"] == "admin"
        admin_session.delete(f"{API}/users/{r.json()['id']}")

    def test_create_user_duplicate(self, admin_session):
        email = f"TEST_dup_{uuid.uuid4().hex[:6]}@example.com"
        r1 = admin_session.post(f"{API}/users", json={"email": email, "password": "abcdef"})
        assert r1.status_code == 201
        r2 = admin_session.post(f"{API}/users", json={"email": email, "password": "abcdef"})
        assert r2.status_code == 400
        admin_session.delete(f"{API}/users/{r1.json()['id']}")

    def test_create_user_invalid_role(self, admin_session):
        r = admin_session.post(f"{API}/users", json={
            "email": f"TEST_ir_{uuid.uuid4().hex[:6]}@example.com", "password": "abcdef", "role": "owner"
        })
        assert r.status_code == 400

    def test_create_user_short_password(self, admin_session):
        r = admin_session.post(f"{API}/users", json={
            "email": f"TEST_sp_{uuid.uuid4().hex[:6]}@example.com", "password": "abc"
        })
        assert r.status_code == 422

    def test_update_user(self, admin_session):
        email = f"TEST_upd_{uuid.uuid4().hex[:6]}@example.com"
        r = admin_session.post(f"{API}/users", json={"email": email, "password": "abcdef"})
        uid = r.json()["id"]
        try:
            # Update name + role + password
            ru = admin_session.patch(f"{API}/users/{uid}", json={
                "name": "Updated", "role": "admin", "password": "newpass1"
            })
            assert ru.status_code == 200
            assert ru.json()["name"] == "Updated"
            assert ru.json()["role"] == "admin"
            # Verify new password works
            _, rl = _login(email, "newpass1")
            assert rl.status_code == 200
        finally:
            admin_session.delete(f"{API}/users/{uid}")

    def test_cannot_demote_only_admin(self, admin_session):
        # admin@example.com is the only admin in seeded state. Get its id.
        users = admin_session.get(f"{API}/users").json()
        # Ensure only one admin exists (delete any extra TEST admins from earlier failures)
        admins = [u for u in users if u["role"] == "admin"]
        me = next(u for u in users if u["email"] == ADMIN_EMAIL)
        # Clean up extras
        for a in admins:
            if a["email"] != ADMIN_EMAIL and a["email"].startswith("TEST_"):
                admin_session.delete(f"{API}/users/{a['id']}")
        # Now try to demote self
        r = admin_session.patch(f"{API}/users/{me['id']}", json={"role": "personnel"})
        assert r.status_code == 400, r.text

    def test_cannot_delete_self(self, admin_session):
        me = admin_session.get(f"{API}/auth/me").json()
        r = admin_session.delete(f"{API}/users/{me['id']}")
        assert r.status_code == 400


# ----------------- Products role gating -----------------
class TestProducts:
    def test_personnel_can_list_products(self, personnel_session):
        r = personnel_session.get(f"{API}/products")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_personnel_cannot_create_product(self, personnel_session):
        r = personnel_session.post(f"{API}/products", json={
            "name": "TEST_PNG", "quantity": 1, "price": 1.0, "category": "TEST"
        })
        assert r.status_code == 403

    def test_personnel_cannot_update_or_delete(self, personnel_session, admin_session, cleanup_products):
        r = admin_session.post(f"{API}/products", json={
            "name": "TEST_PnUpd", "quantity": 1, "price": 1.0, "category": "TEST"
        })
        pid = r.json()["id"]
        cleanup_products.append(pid)
        ru = personnel_session.patch(f"{API}/products/{pid}", json={"price": 2.0})
        assert ru.status_code == 403
        rd = personnel_session.delete(f"{API}/products/{pid}")
        assert rd.status_code == 403

    def test_admin_crud_product(self, admin_session, cleanup_products):
        r = admin_session.post(f"{API}/products", json={
            "name": "TEST_Widget", "quantity": 5, "price": 9.99, "category": "TEST_Cat"
        })
        assert r.status_code == 201
        data = r.json()
        cleanup_products.append(data["id"])
        ru = admin_session.patch(f"{API}/products/{data['id']}", json={"price": 12.5})
        assert ru.status_code == 200 and ru.json()["price"] == 12.5


# ----------------- Transactions -----------------
class TestTransactions:
    def test_personnel_can_buy_and_stock_increments(self, admin_session, personnel_session, cleanup_products):
        r = admin_session.post(f"{API}/products", json={
            "name": "TEST_TxBuy", "quantity": 10, "price": 5.0, "category": "TEST"
        })
        pid = r.json()["id"]
        cleanup_products.append(pid)

        rt = personnel_session.post(f"{API}/transactions", json={
            "product_id": pid, "type": "buy", "quantity": 5, "unit_price": 4.0
        })
        assert rt.status_code == 201, rt.text
        tx = rt.json()
        assert tx["type"] == "buy"
        assert tx["quantity"] == 5
        assert tx["unit_price"] == 4.0
        assert tx["total"] == 20.0
        assert "product_name" in tx
        assert "user_email" in tx
        assert "created_at" in tx

        # Verify stock incremented
        rp = admin_session.get(f"{API}/products").json()
        prod = next(p for p in rp if p["id"] == pid)
        assert prod["quantity"] == 15

    def test_sell_decrements_stock(self, admin_session, personnel_session, cleanup_products):
        r = admin_session.post(f"{API}/products", json={
            "name": "TEST_TxSell", "quantity": 10, "price": 5.0, "category": "TEST"
        })
        pid = r.json()["id"]
        cleanup_products.append(pid)

        rt = personnel_session.post(f"{API}/transactions", json={
            "product_id": pid, "type": "sell", "quantity": 3, "unit_price": 7.0
        })
        assert rt.status_code == 201
        prod = next(p for p in admin_session.get(f"{API}/products").json() if p["id"] == pid)
        assert prod["quantity"] == 7

    def test_sell_more_than_stock_fails(self, admin_session, personnel_session, cleanup_products):
        r = admin_session.post(f"{API}/products", json={
            "name": "TEST_TxOver", "quantity": 2, "price": 1.0, "category": "TEST"
        })
        pid = r.json()["id"]
        cleanup_products.append(pid)
        rt = personnel_session.post(f"{API}/transactions", json={
            "product_id": pid, "type": "sell", "quantity": 5, "unit_price": 1.0
        })
        assert rt.status_code == 400
        # Stock unchanged
        prod = next(p for p in admin_session.get(f"{API}/products").json() if p["id"] == pid)
        assert prod["quantity"] == 2

    def test_list_transactions_and_filters(self, admin_session, personnel_session, cleanup_products):
        r = admin_session.post(f"{API}/products", json={
            "name": "TEST_TxFilter", "quantity": 20, "price": 5.0, "category": "TEST"
        })
        pid = r.json()["id"]
        cleanup_products.append(pid)

        personnel_session.post(f"{API}/transactions", json={
            "product_id": pid, "type": "buy", "quantity": 4, "unit_price": 2.0
        })
        personnel_session.post(f"{API}/transactions", json={
            "product_id": pid, "type": "sell", "quantity": 1, "unit_price": 6.0
        })

        # All
        rall = personnel_session.get(f"{API}/transactions", params={"product_id": pid})
        assert rall.status_code == 200
        txs = rall.json()
        assert len(txs) >= 2
        for t in txs:
            assert "product_name" in t and "type" in t and "quantity" in t
            assert "unit_price" in t and "total" in t and "user_email" in t and "created_at" in t

        # Filter buy
        rbuy = personnel_session.get(f"{API}/transactions", params={"product_id": pid, "type": "buy"})
        assert all(t["type"] == "buy" for t in rbuy.json())
        # Filter sell
        rsell = personnel_session.get(f"{API}/transactions", params={"product_id": pid, "type": "sell"})
        assert all(t["type"] == "sell" for t in rsell.json())

    def test_invalid_type_rejected(self, personnel_session, admin_session, cleanup_products):
        r = admin_session.post(f"{API}/products", json={
            "name": "TEST_TxInv", "quantity": 5, "price": 1.0, "category": "TEST"
        })
        pid = r.json()["id"]
        cleanup_products.append(pid)
        rt = personnel_session.post(f"{API}/transactions", json={
            "product_id": pid, "type": "exchange", "quantity": 1, "unit_price": 1.0
        })
        assert rt.status_code == 400
