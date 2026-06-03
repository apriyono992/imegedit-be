# Imegedit Backend — API Documentation

Base URL: `http://localhost:3000`

Format respons error mengikuti standar NestJS:

```json
{ "statusCode": 400, "message": ["..."], "error": "Bad Request" }
```

## Autentikasi

Sebagian endpoint butuh **access token** (JWT, masa berlaku 15m). Kirim di header:

```
Authorization: Bearer <accessToken>
```

Kolom **Auth**:

- `—` : publik, tanpa token
- `Bearer` : butuh access token (user mana pun yang aktif)
- `Admin` : butuh access token milik user dengan role `admin`

---

## Konvensi list (pagination, filter, sort, search)

Semua endpoint **GET list** menerima query param umum berikut:

| Param       | Tipe   | Required | Default     | Keterangan                                                   |
| ----------- | ------ | -------- | ----------- | ------------------------------------------------------------ |
| `page`      | int    | optional | `1`         | Halaman, minimal `1`                                         |
| `limit`     | int    | optional | `20`        | Item per halaman, `1`–`100`                                  |
| `sortBy`    | string | optional | `createdAt` | Field sort (whitelist per endpoint; key tak valid → default) |
| `sortOrder` | enum   | optional | `DESC`      | `ASC` atau `DESC`                                            |
| `search`    | string | optional | —           | Pencarian teks bebas (case-insensitive) di kolom relevan     |

Query param di luar yang didokumentasikan akan **ditolak `400`** (validasi whitelist).

Bentuk respons list:

```json
{
  "data": [ /* array baris */ ],
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

---

## Auth

### POST `/auth/register`

Daftar user baru. Default role `user` bila `roleId` tidak diisi.

- **Auth:** —
- **Status sukses:** `201 Created`

**Body**

| Field      | Tipe   | Required | Aturan                  |
| ---------- | ------ | -------- | ----------------------- |
| `name`     | string | **wajib** | —                      |
| `email`    | string | **wajib** | format email, unik      |
| `password` | string | **wajib** | minimal 6 karakter      |
| `roleId`   | int    | optional | default role `user`     |

**Respons:** `{ accessToken, refreshToken, user }`

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "id": "uuid", "name": "Budi", "email": "budi@example.com", "roleId": 1, "active": true }
}
```

Error: `409 Conflict` bila email sudah terdaftar.

### POST `/auth/login`

- **Auth:** —
- **Status sukses:** `200 OK`

**Body**

| Field      | Tipe   | Required | Aturan             |
| ---------- | ------ | -------- | ------------------ |
| `email`    | string | **wajib** | format email      |
| `password` | string | **wajib** | minimal 6 karakter |

**Respons:** sama seperti register (`accessToken`, `refreshToken`, `user`).

Error: `401 Unauthorized` (kredensial salah / akun nonaktif).

### POST `/auth/refresh`

Tukar refresh token dengan pasangan token baru (rotasi — refresh token lama langsung tidak valid).

- **Auth:** —
- **Status sukses:** `200 OK`

**Body**

| Field          | Tipe   | Required | Aturan       |
| -------------- | ------ | -------- | ------------ |
| `refreshToken` | string | **wajib** | tidak kosong |

**Respons:** `{ accessToken, refreshToken, user }`

Error: `401 Unauthorized` (refresh token tidak valid / kedaluwarsa).

### POST `/auth/logout`

Cabut refresh token di server.

- **Auth:** Bearer
- **Status sukses:** `200 OK`

**Body**

| Field          | Tipe   | Required | Aturan       |
| -------------- | ------ | -------- | ------------ |
| `refreshToken` | string | **wajib** | tidak kosong |

### GET `/auth/me`

Profil user yang sedang login.

- **Auth:** Bearer
- **Status sukses:** `200 OK`
- **Query / Body:** —

---

## Users (admin)

Semua endpoint di bawah butuh role **Admin**.

### GET `/users`

List user (pagination/filter/sort/search).

- **Auth:** Admin
- **Status sukses:** `200 OK`

**Query params** (selain param umum di atas)

| Param       | Tipe    | Required | Keterangan                          |
| ----------- | ------- | -------- | ----------------------------------- |
| `roleId`    | int     | optional | Filter berdasarkan role             |
| `active`    | boolean | optional | `true` / `false`                    |
| `sortBy`    | enum    | optional | `name`, `email`, `active`, `role`, `createdAt` |
| `search`    | string  | optional | Cari di nama, email, nama role      |

### GET `/users/:id`

Detail user.

- **Auth:** Admin
- **Path param:** `id` (UUID, **wajib**)
- **Status sukses:** `200 OK` — Error `404` bila tidak ada.

### PATCH `/users/:id`

Update user. Semua field body opsional.

- **Auth:** Admin
- **Path param:** `id` (UUID, **wajib**)
- **Status sukses:** `200 OK`

**Body**

| Field    | Tipe    | Required | Aturan                                  |
| -------- | ------- | -------- | --------------------------------------- |
| `name`   | string  | optional | —                                       |
| `roleId` | int     | optional | harus role yang ada, else `400`         |
| `active` | boolean | optional | —                                       |

### DELETE `/users/:id`

Soft delete user.

- **Auth:** Admin
- **Path param:** `id` (UUID, **wajib**)
- **Status sukses:** `204 No Content`

---

## Activity Logs

Catatan aksi edit yang dikirim frontend.

### POST `/activity-logs`

- **Auth:** Bearer
- **Status sukses:** `201 Created`

**Body**

| Field      | Tipe   | Required | Aturan                  |
| ---------- | ------ | -------- | ----------------------- |
| `toolName` | string | **wajib** | —                      |
| `metadata` | object | optional | objek bebas (mis. ukuran) |

> `ipAddress` diisi otomatis dari server, `userId` dari token. Tidak perlu dikirim.

### GET `/activity-logs`

Log milik user yang sedang login.

- **Auth:** Bearer
- **Status sukses:** `200 OK`

**Query params** (selain param umum)

| Param      | Tipe   | Required | Keterangan                        |
| ---------- | ------ | -------- | --------------------------------- |
| `toolName` | string | optional | Filter nama tool                  |
| `sortBy`   | enum   | optional | `toolName`, `createdAt`           |
| `search`   | string | optional | Cari di toolName, ipAddress       |

### GET `/activity-logs/all`

Semua log seluruh user.

- **Auth:** Admin
- **Status sukses:** `200 OK`

**Query params** (selain param umum)

| Param      | Tipe   | Required | Keterangan                                   |
| ---------- | ------ | -------- | -------------------------------------------- |
| `userId`   | UUID   | optional | Filter berdasarkan user                      |
| `toolName` | string | optional | Filter nama tool                             |
| `sortBy`   | enum   | optional | `toolName`, `createdAt`                      |
| `search`   | string | optional | Cari di toolName, ipAddress, nama & email user |

---

## Audit Log (admin)

### GET `/log-history`

Audit trail setiap aksi user (otomatis tercatat: POST/PUT/PATCH/DELETE, sukses & gagal).

- **Auth:** Admin
- **Status sukses:** `200 OK`

**Query params** (selain param umum)

| Param        | Tipe   | Required | Keterangan                                                  |
| ------------ | ------ | -------- | ----------------------------------------------------------- |
| `method`     | string | optional | `GET` / `POST` / `PATCH` / `DELETE`                         |
| `statusCode` | int    | optional | Filter HTTP status                                          |
| `userId`     | UUID   | optional | Filter berdasarkan user                                     |
| `sortBy`     | enum   | optional | `action`, `method`, `path`, `statusCode`, `createdAt`       |
| `search`     | string | optional | Cari di action, method, path, ip, userAgent, nama & email   |

---

## Ringkasan status code

| Code | Makna                                                        |
| ---- | ------------------------------------------------------------ |
| 200  | Sukses (GET, login, refresh, logout, patch)                  |
| 201  | Resource dibuat (register, create activity log)              |
| 204  | Sukses tanpa body (delete user)                              |
| 400  | Validasi gagal / query param tak dikenal / roleId tak valid  |
| 401  | Tidak terautentikasi / token tidak valid                     |
| 403  | Terautentikasi tapi bukan admin                              |
| 404  | Resource tidak ditemukan                                     |
| 409  | Konflik (email sudah terdaftar)                              |
