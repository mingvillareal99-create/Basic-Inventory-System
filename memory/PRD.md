# PRD — Simple Inventory System

## Original Problem Statement
Build a "Very Simple Inventory System" — lightweight, functional prototype. Track Product ID, Name, Quantity, Unit Price, Category. Features: add, update stock (increment/decrement), view inventory (table with flag for qty<5), delete, search (name/category). Persist to MongoDB. Clean minimalist UI with light/dark toggle.

## Architecture
- Backend: FastAPI + Motor (async MongoDB), JWT auth via httpOnly cookies, bcrypt password hashing, brute-force protection (X-Forwarded-For aware).
- Frontend: React 19, React Router, Tailwind + Shadcn UI components, Phosphor icons, Sonner toasts, axios with credentials.
- Storage: MongoDB collections — `users`, `products`, `login_attempts`.

## User Personas
- Inventory Operator — adds/edits products, restocks, marks sales (decrement), audits low-stock items.

## Core Requirements (static)
1. Auth: simple email/password login + register.
2. CRUD on products with fields: name, quantity (≥0), price (≥0), category.
3. Stock increment/decrement endpoint.
4. Search by name or category (server + client side filter).
5. Low-stock visual flag when qty < 5.
6. Dark/light theme toggle persisted in localStorage.

## Implemented (2026-02)
- JWT cookie auth: login, register, me, logout (+ admin seeded `admin@example.com` / `admin123`).
- Products CRUD: `GET /api/products`, `POST /api/products`, `PATCH /api/products/{id}`, `PATCH /api/products/{id}/stock`, `DELETE /api/products/{id}`, `GET /api/products/stats`.
- Frontend: protected `/`, public `/login`, theme provider, Swiss/control-room dark dashboard with stats, search, table, add/edit dialog, increment/decrement controls, delete confirm dialog.
- Brute-force lockout (5 fails → 15-min lockout), respects X-Forwarded-For for ingress.

## Backlog (P1/P2)
- P1: CSV / JSON export of inventory.
- P1: Per-product audit log (stock change history).
- P2: Multi-tenant inventories (workspaces) with role-based permissions.
- P2: Barcode scanning (camera) to quickly adjust stock.
- P2: Low-stock email/Slack alerts.

## Next Tasks
- Add CSV export + audit log.
- Add inline-edit category dropdown with autocomplete from existing categories.
