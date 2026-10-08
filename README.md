# preset-api

Node/Express backend for PRESET. Runs on Railway with Postgres.

---

## Deploy to Railway

### 1. Push to GitHub
Create a new repo and push this folder to it.

### 2. Create a Railway project
- Go to railway.app → New Project → Deploy from GitHub repo
- Select your repo

### 3. Add a Postgres database
- In your Railway project → New → Database → PostgreSQL
- Railway will automatically inject `DATABASE_URL` into your service

### 4. Set environment variables
In your Railway service → Variables, add:
```
ADMIN_SECRET=some_long_random_string_only_you_know
```
`DATABASE_URL` is set automatically by Railway — do not touch it.

### 5. Deploy
Railway auto-deploys on every push. Once live, grab your service URL from the Railway dashboard (looks like `https://preset-api-production-xxxx.up.railway.app`).

### 6. Update the website
In both `index.html` and `dashboard.html`, replace every occurrence of:
```
https://rehabs-production.up.railway.app
```
with your new Railway URL.

---

## API Reference

All endpoints return JSON.

### POST /api/login
```json
{ "username": "someone", "password": "pass123" }
```
Response:
```json
{
  "success": true,
  "user": { "username": "someone", "key": "PRESET-SOMEONE-ABCD1234", "expiryDate": 1234567890000 }
}
```

### POST /api/register
Requires header: `x-admin-secret: <your ADMIN_SECRET>`
```json
{ "username": "newuser", "password": "pass123", "days": 30 }
```
`days` is optional — omit for lifetime (9999 days).

### POST /api/save-config
```json
{ "username": "someone", "password": "pass123", "configs": { ... } }
```

### POST /api/load-config
```json
{ "username": "someone", "password": "pass123" }
```

---

## Admin Endpoints
All require header: `x-admin-secret: <your ADMIN_SECRET>`

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/users | List all users |
| DELETE | /api/admin/users/:username | Delete a user |
| PATCH | /api/admin/users/:username/extend | Extend expiry (`{ "days": 30 }`) |
| PATCH | /api/admin/users/:username/reset-key | Generate new license key |
| PATCH | /api/admin/users/:username/password | Reset password (`{ "password": "new" }`) |

---

## Creating your first user

Once deployed, run this in your terminal (replace the values):
```bash
curl -X POST https://YOUR-RAILWAY-URL.up.railway.app/api/register \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{ "username": "myuser", "password": "mypassword" }'
```
