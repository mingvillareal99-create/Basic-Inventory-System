from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# ----------------- Config -----------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("inventory")

ROLES = {"admin", "personnel"}


# ----------------- Helpers -----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie("access_token", access_token, httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ----------------- Models -----------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserCreateIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None
    role: str = "personnel"


class UserUpdateIn(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=6)


class ProductIn(BaseModel):
    name: str = Field(min_length=1)
    quantity: int = Field(ge=0)
    price: float = Field(ge=0)
    category: str = Field(min_length=1)


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[int] = Field(default=None, ge=0)
    price: Optional[float] = Field(default=None, ge=0)
    category: Optional[str] = None


class StockDelta(BaseModel):
    delta: int


class TransactionIn(BaseModel):
    product_id: str
    type: str  # 'buy' or 'sell'
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)
    note: Optional[str] = None


# ----------------- Auth Dependency -----------------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def serialize_user(user: dict) -> dict:
    return {
        "id": str(user.get("_id") or user.get("id")),
        "email": user["email"],
        "name": user.get("name"),
        "role": user.get("role", "personnel"),
        "created_at": user.get("created_at"),
    }


def serialize_product(p: dict) -> dict:
    return {
        "id": str(p["_id"]),
        "name": p["name"],
        "quantity": int(p["quantity"]),
        "price": float(p["price"]),
        "category": p["category"],
        "created_at": p["created_at"],
        "updated_at": p["updated_at"],
    }


def serialize_transaction(t: dict) -> dict:
    return {
        "id": str(t["_id"]),
        "product_id": t["product_id"],
        "product_name": t["product_name"],
        "type": t["type"],
        "quantity": int(t["quantity"]),
        "unit_price": float(t["unit_price"]),
        "total": float(t["unit_price"]) * int(t["quantity"]),
        "user_id": t["user_id"],
        "user_email": t["user_email"],
        "note": t.get("note"),
        "created_at": t["created_at"],
    }


# ----------------- Brute Force -----------------
MAX_FAILED = 5
LOCKOUT_MIN = 15


def real_client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def check_lockout(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("failed", 0) >= MAX_FAILED:
        locked_at = rec.get("locked_at")
        if locked_at:
            locked_dt = datetime.fromisoformat(locked_at) if isinstance(locked_at, str) else locked_at
            if datetime.now(timezone.utc) - locked_dt < timedelta(minutes=LOCKOUT_MIN):
                raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
            await db.login_attempts.delete_one({"identifier": identifier})


async def register_failed(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    failed = (rec.get("failed", 0) if rec else 0) + 1
    update = {"failed": failed}
    if failed >= MAX_FAILED:
        update["locked_at"] = now_iso()
    await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)


async def clear_failed(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


# ----------------- App -----------------
app = FastAPI(title="Simple Inventory API")
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["auth"])
users_router = APIRouter(prefix="/users", tags=["users"])
products_router = APIRouter(prefix="/products", tags=["products"])
tx_router = APIRouter(prefix="/transactions", tags=["transactions"])


@api_router.get("/")
async def root():
    return {"message": "Inventory API ready"}


# ---------- Auth Routes ----------
@auth_router.post("/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower()
    ip = real_client_ip(request)
    identifier = f"{ip}:{email}"
    await check_lockout(identifier)

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        await register_failed(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await clear_failed(identifier)
    user_id = str(user["_id"])
    role = user.get("role", "personnel")
    set_auth_cookies(response, create_access_token(user_id, email, role), create_refresh_token(user_id))
    return serialize_user(user)


@auth_router.post("/logout")
async def logout(response: Response, _user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@auth_router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


# ---------- User Management (admin only) ----------
@users_router.get("")
async def list_users(_admin: dict = Depends(require_admin)):
    docs = await db.users.find({}, {"password_hash": 0}).sort("created_at", -1).to_list(1000)
    return [serialize_user(d) for d in docs]


@users_router.post("", status_code=201)
async def create_user(payload: UserCreateIn, _admin: dict = Depends(require_admin)):
    if payload.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of {sorted(ROLES)}")
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name or email.split("@")[0],
        "role": payload.role,
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_user(doc)


@users_router.patch("/{user_id}")
async def update_user(user_id: str, payload: UserUpdateIn, admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")
    update_fields = {}
    if payload.name is not None:
        update_fields["name"] = payload.name
    if payload.role is not None:
        if payload.role not in ROLES:
            raise HTTPException(status_code=400, detail=f"Role must be one of {sorted(ROLES)}")
        # Prevent the only admin from demoting themselves
        if str(admin["_id"]) == user_id and payload.role != "admin":
            count_admins = await db.users.count_documents({"role": "admin"})
            if count_admins <= 1:
                raise HTTPException(status_code=400, detail="Cannot demote the only admin")
        update_fields["role"] = payload.role
    if payload.password is not None:
        update_fields["password_hash"] = hash_password(payload.password)
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.users.find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": update_fields},
        return_document=True,
        projection={"password_hash": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_user(result)


@users_router.delete("/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")
    if str(admin["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    target = await db.users.find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("role") == "admin":
        admin_count = await db.users.count_documents({"role": "admin"})
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the only admin")
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"ok": True}


# ---------- Product Routes ----------
@products_router.get("")
async def list_products(search: Optional[str] = None, _user: dict = Depends(get_current_user)):
    query = {}
    if search:
        query = {"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}},
        ]}
    docs = await db.products.find(query).sort("created_at", -1).to_list(1000)
    return [serialize_product(d) for d in docs]


@products_router.get("/stats")
async def stats(_user: dict = Depends(get_current_user)):
    total = 0
    low = 0
    value = 0.0
    async for p in db.products.find({}):
        total += 1
        qty = int(p["quantity"])
        if qty < 5:
            low += 1
        value += qty * float(p["price"])
    return {"total_products": total, "low_stock": low, "total_value": round(value, 2)}


@products_router.post("", status_code=201)
async def create_product(payload: ProductIn, _admin: dict = Depends(require_admin)):
    now = now_iso()
    doc = {
        "name": payload.name.strip(),
        "quantity": payload.quantity,
        "price": payload.price,
        "category": payload.category.strip(),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.products.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_product(doc)


@products_router.patch("/{product_id}")
async def update_product(product_id: str, payload: ProductUpdate, _admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product id")
    update_fields = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_fields["updated_at"] = now_iso()
    result = await db.products.find_one_and_update(
        {"_id": ObjectId(product_id)},
        {"$set": update_fields},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")
    return serialize_product(result)


@products_router.patch("/{product_id}/stock")
async def adjust_stock(product_id: str, payload: StockDelta, _admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product id")
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    new_qty = int(product["quantity"]) + int(payload.delta)
    if new_qty < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    updated = await db.products.find_one_and_update(
        {"_id": ObjectId(product_id)},
        {"$set": {"quantity": new_qty, "updated_at": now_iso()}},
        return_document=True,
    )
    return serialize_product(updated)


@products_router.delete("/{product_id}")
async def delete_product(product_id: str, _admin: dict = Depends(require_admin)):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product id")
    result = await db.products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


# ---------- Transactions (buy/sell) ----------
@tx_router.get("")
async def list_transactions(
    product_id: Optional[str] = None,
    type: Optional[str] = None,
    limit: int = 200,
    _user: dict = Depends(get_current_user),
):
    query = {}
    if product_id:
        query["product_id"] = product_id
    if type in ("buy", "sell"):
        query["type"] = type
    docs = await db.transactions.find(query).sort("created_at", -1).to_list(limit)
    return [serialize_transaction(d) for d in docs]


@tx_router.post("", status_code=201)
async def create_transaction(payload: TransactionIn, user: dict = Depends(get_current_user)):
    if payload.type not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="type must be 'buy' or 'sell'")
    if not ObjectId.is_valid(payload.product_id):
        raise HTTPException(status_code=400, detail="Invalid product id")
    product = await db.products.find_one({"_id": ObjectId(payload.product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    delta = payload.quantity if payload.type == "buy" else -payload.quantity
    new_qty = int(product["quantity"]) + delta
    if new_qty < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock for this sale")

    await db.products.update_one(
        {"_id": product["_id"]},
        {"$set": {"quantity": new_qty, "updated_at": now_iso()}},
    )

    tx_doc = {
        "product_id": str(product["_id"]),
        "product_name": product["name"],
        "type": payload.type,
        "quantity": payload.quantity,
        "unit_price": payload.unit_price,
        "user_id": user["_id"],
        "user_email": user["email"],
        "note": payload.note,
        "created_at": now_iso(),
    }
    res = await db.transactions.insert_one(tx_doc)
    tx_doc["_id"] = res.inserted_id
    return serialize_transaction(tx_doc)


# ----------------- Mount -----------------
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(products_router)
api_router.include_router(tx_router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------- Startup -----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.products.create_index("name")
    await db.products.create_index("category")
    await db.transactions.create_index("created_at")
    await db.transactions.create_index("product_id")

    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing is None:
        await db.users.insert_one({
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info("Seeded admin user: %s", ADMIN_EMAIL)
    else:
        update = {}
        if not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
            update["password_hash"] = hash_password(ADMIN_PASSWORD)
        if existing.get("role") != "admin":
            update["role"] = "admin"
        if update:
            await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": update})


@app.on_event("shutdown")
async def shutdown():
    client.close()
