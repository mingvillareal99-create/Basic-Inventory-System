# Deployment Best Practices

To keep the live application stable and prevent accidental production data loss, always adhere to these key strategies:

## ⚠️ 1. Use Separate Databases (CRITICAL)
Your local development/testing environment and production environment must use isolated database targets.
* **The Risk**: Running backend tests (`pytest`) initiates a teardown sequence (`pytest_sessionfinish` in `backend/tests/conftest.py`) which deletes test-created records. If your local environment points to the production Atlas database, **running tests will delete matching user accounts, products, or transactions from your live production database**.
* **Action**:
  * Keep the MongoDB Atlas cluster connection string only for production (configured in Render settings).
  * For local coding, run a local MongoDB instance (`mongodb://localhost:27017`) and set `MONGO_URL=mongodb://localhost:27017` in your local `backend/.env` file.

## 2. Test Locally Before Pushing
Always verify all changes locally first to avoid pushing broken builds to production:
1. Run the backend locally: `.venv\Scripts\uvicorn.exe server:app --port 8001`
2. Run the frontend locally: `yarn start`
3. Run the automated test suite: `.venv\Scripts\pytest`
* *Only commit and push to GitHub once everything is fully working and verified green.*

## 3. Use Git Branches for Preview Deployments
Avoid pushing changes directly to the `main` branch:
1. Create a development/feature branch: `git checkout -b feature/your-feature-name`
2. Commit and push your changes to that branch.
3. Test Vercel's automatically generated **Preview Deployment** link first.
4. Once verified, merge the feature branch into `main` to deploy to production.

## 4. Keep Secrets Out of Version Control
* Never hardcode sensitive credentials, passwords, or connection strings in your source code.
* Keep using the `.env` files for local environments (already hidden by `.gitignore`).
* Configure all production values via Vercel and Render dashboards.
