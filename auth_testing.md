# Auth Testing Playbook

## Admin Credentials
- Email: admin@example.com
- Password: admin123

## API Tests

```
# Login - sets cookies, returns user
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Verify session via cookie
curl -b cookies.txt http://localhost:8001/api/auth/me

# Inventory ops (authenticated)
curl -b cookies.txt http://localhost:8001/api/products
curl -b cookies.txt -X POST http://localhost:8001/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"USB Cable","quantity":10,"price":9.99,"category":"Accessories"}'
```

## Verification
- bcrypt hashes must start with `$2b$`
- Indexes: users.email unique, login_attempts.identifier, password_reset_tokens.expires_at TTL
