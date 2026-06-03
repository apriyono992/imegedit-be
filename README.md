# Imagedit Backend

Backend untuk aplikasi edit foto (proses edit di frontend). Backend menangani
**autentikasi**, **manajemen user & role**, **log aktivitas edit**, dan
**audit trail** untuk setiap aksi user.

Dibangun dengan **NestJS 11 + TypeORM + SQLite (better-sqlite3)**.

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

---

## Setup

```bash
# 1. Install dependency
npm install

# 2. (opsional) buat file .env — lihat tabel di bawah. Semua punya default.

# 3. Seed role + admin user
npm run seed

# 4. Jalankan
npm run start:dev
```

Server jalan di `http://localhost:3000`.

> Tabel database dibuat otomatis (`synchronize: true`) saat aplikasi/seed pertama
> kali jalan. Database tersimpan di `data.sqlite`.

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
| `DATABASE_PATH`         | `data.sqlite`         | Lokasi file SQLite                      |
| `JWT_SECRET`            | `dev-secret-change-me`| **Wajib diganti di production**         |
| `JWT_ACCESS_EXPIRES_IN` | `15m`                 | Masa berlaku access token               |
| `REFRESH_EXPIRES_DAYS`  | `7`                   | Masa berlaku refresh token (hari)       |
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

## API Endpoints

Base URL: `http://localhost:3000`

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

Import file **`imagedit.postman_collection.json`** (di root repo) ke Postman.

- Variabel `baseUrl` default `http://localhost:3000`.
- Request **Login** / **Register** / **Refresh** otomatis menyimpan `accessToken`,
  `refreshToken`, dan `userId` ke variabel collection lewat test script — jadi
  request lain langsung pakai token tanpa copy-paste manual.
