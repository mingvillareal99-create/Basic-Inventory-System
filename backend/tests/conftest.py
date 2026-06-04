import os
import re
import pymongo

def pytest_sessionfinish(session, exitstatus):
    """Clean up all TEST_* products, transactions, and users from MongoDB after the test run."""
    try:
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        client = pymongo.MongoClient(mongo_url)
        db = client["inventory_system"]
        
        pattern = re.compile(r"^(test_|clerk_|user_)", re.IGNORECASE)
        
        # 1. Clean up users
        users = list(db.users.find({}))
        user_ids = [u["_id"] for u in users if pattern.match(u.get("username", "")) or pattern.match(u.get("email", ""))]
        if user_ids:
            db.users.delete_many({"_id": {"$in": user_ids}})
            print(f"\n[Teardown] Deleted {len(user_ids)} test users.")
            
        # 2. Clean up products
        products = list(db.products.find({}))
        prod_ids = [p["_id"] for p in products if pattern.match(p.get("name", ""))]
        if prod_ids:
            db.products.delete_many({"_id": {"$in": prod_ids}})
            print(f"[Teardown] Deleted {len(prod_ids)} test products.")
            
        # 3. Clean up transactions
        transactions = list(db.transactions.find({}))
        tx_ids = [
            t["_id"] for t in transactions 
            if pattern.match(t.get("product_name", "")) 
            or pattern.match(t.get("note") or "") 
            or pattern.match(t.get("user_username", ""))
            or pattern.match(t.get("user_email", ""))
        ]
        if tx_ids:
            db.transactions.delete_many({"_id": {"$in": tx_ids}})
            print(f"[Teardown] Deleted {len(tx_ids)} test transactions.")
            
        client.close()
    except Exception as e:
        print(f"\n[Teardown] Database cleanup failed: {e}")
