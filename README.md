# Imegedit Backend

Backend untuk aplikasi edit foto (proses edit di frontend). Backend menangani
**autentikasi**, **manajemen user & role**, **log aktivitas edit**, dan
**audit trail** untuk setiap aksi user.

Dibangun dengan **NestJS 11 + TypeORM + PostgreSQL (pg)**.

---

## Fitur

- **Auth JWT** — access token pendek (15m) + refresh token (7 hari, rotasi) dengan bcrypt.
- **Logout** mencabut refresh token di backend (denylist via soft delete).
- **Role-based access** — guard `@Roles('admin')` untuk endpoint admin.
- **Manajemen user** (admin) — list / detail / update (role, status aktif) / soft delete.
- **Activity logs** — catatan aksi edit yang dikirim frontend.
- **Audit log (`log_history`)** — otomatis mencatat **setiap aksi** (POST/PUT/PATCH/DELETE),
  sukses maupun gagal, termasuk penolakan guard.
- **Soft delete** di semua tabel utama.
- **Seeder** role + admin user, dan **cron** pembersih refresh token kedaluwarsa.

---

## Prasyarat

- Node.js >= 20 (diuji di v22)
- npm
- PostgreSQL >= 13 (buat database kosong dulu, mis. `imegedit`)

---

## Setup

```bash
# 1. Install dependency
npm install

# 2. Buat database PostgreSQL kosong, mis:
#    createdb imegedit
#    (atau lewat psql: CREATE DATABASE imegedit;)

# 3. Buat file .env sesuai koneksi PostgreSQL — lihat tabel di bawah.

# 4. Seed role + admin user
npm run seed

# 5. Jalankan
npm run start:dev
```

Server jalan di `http://localhost:3000`.

> Tabel database dibuat otomatis (`synchronize: true`) saat aplikasi/seed pertama
> kali jalan, asalkan database PostgreSQL-nya sudah ada.

### Akun admin default (dari seeder)

| Field    | Default               |
| -------- | --------------------- |
| Email    | `admin@example.com`   |
| Password | `ChangeMe123!`        |

> ⚠️ Ganti password untuk production lewat env `ADMIN_PASSWORD` sebelum seeding.

---

## Environment variables

Semua opsional (ada default). Letakkan di file `.env`.

| Variable                | Default               | Keterangan                              |
| ----------------------- | --------------------- | --------------------------------------- |
| `PORT`                  | `3000`                | Port HTTP                               |
| `CORS_ORIGIN`           | _(semua)_             | Origin frontend yang diizinkan (pisah koma); kosong = izinkan semua |
| `DATABASE_HOST`         | `localhost`           | Host PostgreSQL                         |
| `DATABASE_PORT`         | `5432`                | Port PostgreSQL                         |
| `DATABASE_USER`         | `postgres`            | User PostgreSQL                         |
| `DATABASE_PASSWORD`     | `postgres`            | Password PostgreSQL                     |
| `DATABASE_NAME`         | `imegedit`            | Nama database                           |
| `DATABASE_SYNCHRONIZE`  | `true`                | Auto-sync skema TypeORM (set `false` di production) |
| `JWT_SECRET`            | `dev-secret-change-me`| **Wajib diganti di production**         |
| `JWT_ACCESS_EXPIRES_IN` | `15m`                 | Masa berlaku access token               |
| `REFRESH_EXPIRES_DAYS`  | `7`                   | Masa berlaku refresh token (hari)       |
| `BCRYPT_SALT_ROUNDS`    | `10`                  | Jumlah salt rounds bcrypt               |
| `ADMIN_EMAIL`           | `admin@example.com`   | Email admin yang di-seed                |
| `ADMIN_PASSWORD`        | `ChangeMe123!`        | Password admin yang di-seed             |
| `ADMIN_NAME`            | `Administrator`       | Nama admin yang di-seed                 |

---

## Script npm

| Script              | Fungsi                                |
| ------------------- | ------------------------------------- |
| `npm run start:dev` | Jalankan dengan watch mode            |
| `npm run start`     | Jalankan biasa                        |
| `npm run start:prod`| Jalankan hasil build (`dist/`)        |
| `npm run build`     | Build ke `dist/`                      |
| `npm run seed`      | Seed role (`user`, `admin`) + admin user (idempoten) |
| `npm run lint`      | Lint + auto-fix                       |
| `npm run test`      | Unit test                             |

---

## Query list (pagination, filter, sort, search)

Semua endpoint **GET list** (`/users`, `/activity-logs`, `/activity-logs/all`,
`/log-history`) mendukung query param berikut:

| Param       | Default     | Keterangan                                                        |
| ----------- | ----------- | ----------------------------------------------------------------- |
| `page`      | `1`         | Halaman (mulai 1)                                                 |
| `limit`     | `20`        | Item per halaman (maks `100`)                                     |
| `sortBy`    | `createdAt` | Field sort (per endpoint, lihat di bawah; key tak valid → default)|
| `sortOrder` | `DESC`      | `ASC` / `DESC`                                                    |
| `search`    | —           | Pencarian teks bebas (case-insensitive) di kolom yang relevan     |

Plus filter spesifik per endpoint:

| Endpoint              | `sortBy` yang valid                            | Filter           | Kolom `search`                                              |
| --------------------- | ---------------------------------------------- | ---------------- | ----------------------------------------------------------- |
| `/users`              | `name`, `email`, `active`, `role`, `createdAt` | `roleId`, `active` | nama, email, nama role                                    |
| `/activity-logs`      | `toolName`, `createdAt`                        | `toolName`       | toolName, ipAddress                                         |
| `/activity-logs/all`  | `toolName`, `createdAt`                        | `userId`, `toolName` | toolName, ipAddress, nama & email user                  |
| `/log-history`        | `action`, `method`, `path`, `statusCode`, `createdAt` | `method`, `statusCode`, `userId` | action, method, path, ip, userAgent, nama & email user |

Response berbentuk:

```json
{
  "data": [ /* ...rows... */ ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

Contoh: `GET /users?page=2&limit=10&sortBy=name&sortOrder=ASC&search=budi&active=true`

---

## API Endpoints

Base URL: `http://localhost:3000`

> Dokumentasi lengkap (query param, body, required/optional, status code) ada di **[API.md](API.md)**.

### Auth

| Method | Endpoint         | Auth          | Body                                  | Keterangan                          |
| ------ | ---------------- | ------------- | ------------------------------------- | ----------------------------------- |
| POST   | `/auth/register` | —             | `{ name, email, password, roleId? }`  | Daftar (default role `user`)        |
| POST   | `/auth/login`    | —             | `{ email, password }`                 | Login → access + refresh token      |
| POST   | `/auth/refresh`  | —             | `{ refreshToken }`                    | Tukar refresh token → token baru (rotasi) |
| POST   | `/auth/logout`   | Bearer access | `{ refreshToken }`                    | Cabut refresh token                 |
| GET    | `/auth/me`       | Bearer access | —                                     | Profil user saat ini                |

### Users (admin only)

| Method | Endpoint      | Body                              | Keterangan          |
| ------ | ------------- | --------------------------------- | ------------------- |
| POST   | `/users`      | `{ name, email, password, roleId?, active? }` | Buat user baru |
| GET    | `/users`      | —                                 | List semua user     |
| GET    | `/users/:id`  | —                                 | Detail user         |
| PATCH  | `/users/:id`  | `{ name?, roleId?, active? }`     | Update user         |
| DELETE | `/users/:id`  | —                                 | Soft delete user    |

### Activity Logs

| Method | Endpoint              | Auth          | Body                       | Keterangan                |
| ------ | --------------------- | ------------- | -------------------------- | ------------------------- |
| POST   | `/activity-logs`      | Bearer access | `{ toolName, metadata? }`  | Catat aksi edit           |
| GET    | `/activity-logs`      | Bearer access | —                          | Log milik sendiri         |
| GET    | `/activity-logs/all`  | admin         | —                          | Semua log (admin)         |

### Audit Log

| Method | Endpoint        | Auth  | Keterangan                          |
| ------ | --------------- | ----- | ----------------------------------- |
| GET    | `/log-history`  | admin | Audit trail semua aksi user         |

---

## Alur token (frontend)

1. `login` / `register` → simpan `accessToken` + `refreshToken`.
2. Kirim `Authorization: Bearer <accessToken>` di setiap request terproteksi.
3. Saat access token kena `401`, panggil `/auth/refresh` dengan `refreshToken`
   untuk dapat pasangan token baru (refresh token lama otomatis tidak valid).
4. `logout` → kirim `refreshToken` agar dicabut di server, lalu hapus kedua token di frontend.

---

## Postman

Import file **`imegedit.postman_collection.json`** (di root repo) ke Postman.

- Variabel `baseUrl` default `http://localhost:3000`.
- Request **Login** / **Register** / **Refresh** otomatis menyimpan `accessToken`,
  `refreshToken`, dan `userId` ke variabel collection lewat test script — jadi
  request lain langsung pakai token tanpa copy-paste manual.
