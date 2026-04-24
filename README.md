# ☕ Coffee Shop API v2.0
**DIT207 Final Project** — Node.js + Express + MySQL (TiDB Cloud) + JWT

---

👉 [Open Postman Collection]
(https://scottxsh.postman.co/workspace/DIT323-API~afb58d47-fa86-42c2-b24f-6dc48d5c1c31/collection/46027124-7b99c66c-c964-4578-b680-62e2c4dc8879?action=share&source=copy-link&creator=46027124)

## 🚀 Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Copy env and fill in your values
cp .env.example .env

# 3. Run SQL schema on TiDB / MySQL
mysql -h <host> -u <user> -p < sql/schema.sql

# 4. Run dev server
bun dev
```

---

## 🔐 Authentication (JWT)

All protected routes require:
```
Authorization: Bearer <accessToken>
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | สมัครสมาชิก |
| POST | /api/auth/login | เข้าสู่ระบบ → ได้ accessToken + refreshToken |
| POST | /api/auth/refresh | รับ accessToken ใหม่ด้วย refreshToken |
| POST | /api/auth/logout | ลบ refreshToken |

### Login Response
```json
{
  "success": true,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": 1, "name": "...", "email": "...", "role": "customer" }
}
```

---

## 👤 Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/users | Admin | ดูผู้ใช้ทั้งหมด |
| GET | /api/users/me/profile | 🔑 | ดูโปรไฟล์ตัวเอง |
| GET | /api/users/:id | Owner/Admin | ดูผู้ใช้รายคน |
| POST | /api/users | Admin | เพิ่มผู้ใช้ |
| PATCH | /api/users/:id | Owner/Admin | แก้ไขโปรไฟล์ |
| DELETE | /api/users/:id | Admin | ลบผู้ใช้ |
| GET | /api/users/:id/orders | Owner/Admin | ประวัติการสั่งซื้อ |

### PATCH /api/users/:id — Body
```json
{
  "name": "New Name",
  "phone": "0812345678",
  "avatar_url": "https://...",
  "password": "newpassword"
}
```

---

## ☕ Coffees (Menu)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/coffees | Public | เมนูทั้งหมด |
| GET | /api/coffees/:id | Public | เมนูตาม ID |
| POST | /api/coffees | Admin | เพิ่มเมนู |
| PUT | /api/coffees/:id | Admin | แก้ไขเมนู |
| DELETE | /api/coffees/:id | Admin | ลบเมนู |

---

## 📦 Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/orders | 🔑 | Admin: ทุก order / Customer: ของตัวเอง |
| GET | /api/orders/:id | 🔑 | ดู order พร้อม items |
| POST | /api/orders | 🔑 | สร้าง order |
| PATCH | /api/orders/:id/status | Admin | อัปเดตสถานะ |
| DELETE | /api/orders/:id | Admin | ลบ order |

### POST /api/orders — Body
```json
{
  "note": "ไม่ใส่น้ำตาล",
  "items": [
    { "coffee_id": 1, "quantity": 2 },
    { "coffee_id": 3, "quantity": 1 }
  ]
}
```

### Order Status Flow
```
pending → preparing → delivering → completed
                   ↘ cancelled
```

---

## 🗄️ Database Schema

```
users ──< orders ──< order_items >── coffees
users ──< refresh_tokens
```

---

## ☁️ Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL
# JWT_SECRET, JWT_REFRESH_SECRET
```

---

## 📱 Flutter Integration Example

```dart
// Login
final res = await http.post(
  Uri.parse('$baseUrl/api/auth/login'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'email': email, 'password': password}),
);
final data = jsonDecode(res.body);
final token = data['accessToken'];

// Get profile
final profile = await http.get(
  Uri.parse('$baseUrl/api/users/me/profile'),
  headers: {'Authorization': 'Bearer $token'},
);

// Get order history
final orders = await http.get(
  Uri.parse('$baseUrl/api/users/$userId/orders'),
  headers: {'Authorization': 'Bearer $token'},
);
```
