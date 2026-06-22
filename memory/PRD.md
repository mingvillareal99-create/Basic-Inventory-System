# PRD — Simple Inventory System (multi-role)

## Original Problem Statement
Build a "Very Simple Inventory System" — lightweight, functional prototype. Track Product ID, Name, Quantity, Unit Price, Category. Features: add, update stock (increment/decrement), view inventory (table with flag for qty<5), delete, search (name/category). Persist to MongoDB. Clean minimalist UI with light/dark toggle.

**Iteration 2 update**: Multi-role login (admin, personnel). Admin manages accounts (CRUD users) and inventory CRUD; both can BUY and SELL items which now produce transaction records. Registration removed from /login — admins create accounts in the new Accounts tab. Tablet/mobile-first sizing with a fixed bottom BUY/SELL action bar on mobile. Font: DM Sans.

## Architecture
- Backend: FastAPI + Motor (async MongoDB), JWT auth via httpOnly cookies, bcrypt, brute-force protection (X-Forwarded-For aware).
- Frontend: React 19, React Router, Tailwind + Shadcn UI, Phosphor icons, Sonner toasts, axios w/ credentials.
- Collections: `users`, `products`, `transactions`, `login_attempts`.

## Roles
- **admin** — CRUD products, CRUD users, BUY & SELL
- **personnel** — read products, BUY only

## User Personas
- Owner/Admin — manages staff & catalog
- Store clerk (personnel) — handles daily buy transactions on tablet/phone

## Implemented
### Iteration 1 (2026-02)
- JWT cookie auth, admin seed, products CRUD, +/- stock, search, low-stock flag, theme toggle, Swiss/dark design.
### Iteration 2 (2026-02)
- Roles (admin/personnel), removed public registration.
- New endpoints: `/api/users` (admin-only CRUD), `/api/transactions` (buy/sell with audit fields).
- Frontend re-organised into tabs (Inventory / Transactions / Accounts).
- Mobile floating BUY/SELL action bar; desktop top-right BUY/SELL buttons.
- Per-row buy/sell buttons replacing +/-; transactions are recorded with user, time, qty, unit price, total.
- Account management UI: add/edit/reset-password/delete + role select. Guardrails: cannot delete self, cannot demote/delete the only admin.
- Font switched to DM Sans, mobile cards for inventory on <640px, responsive tab bar.

## Backlog (P1/P2)
- P1: CSV export of transactions + products.
- P1: Per-product transaction history drill-down.
- P2: Barcode scanning to quickly select product in tx dialog.
- P2: Multi-workspace / multi-store.
- P2: Email/Slack alerts when stock < 5.

## Next Tasks
- CSV export + per-product history.
- Improve TransactionDialog with recent-products quick chips on mobile.
