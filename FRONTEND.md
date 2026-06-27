# Imegedit — Panduan Integrasi Frontend

Dokumen ini untuk developer **frontend** yang mau menyambung ke backend Imegedit.
Fokusnya: alur autentikasi, cara menyimpan & memakai token, format request/response,
dan contoh kode siap pakai.

> Referensi lengkap tiap endpoint (query param, body, status code) ada di **[API.md](API.md)**.

Base URL (default dev): `http://localhost:3000`

---

## 1. Konsep singkat

- **Edit foto terjadi di frontend.** Backend hanya menangani **auth**, **user/role**,
  **log aktivitas edit**, dan **audit trail**.
- Autentikasi pakai **JWT**:
  - `accessToken` — masa berlaku **pendek (15 menit)**, dikirim di header tiap request.
  - `refreshToken` — masa berlaku **7 hari**, dipakai untuk memperbarui access token.
    Sekali dipakai (refresh), refresh token lama **langsung tidak valid** (rotasi).
- Semua endpoint list mengembalikan bentuk `{ data, meta }` (lihat bagian Pagination).

---

## 2. Alur autentikasi (wajib dipahami)

```
register / login  ──►  { accessToken, refreshToken, user }
       │
       ▼
simpan kedua token di frontend
       │
       ▼
tiap request terproteksi ──► header: Authorization: Bearer <accessToken>
       │
       ├─ response 200 ──► lanjut normal
       │
       └─ response 401 ──► panggil /auth/refresh dengan refreshToken
                              │
                              ├─ sukses ──► simpan token BARU, ulangi request tadi
                              │
                              └─ gagal (401) ──► refresh token mati → paksa login ulang
       │
       ▼
logout ──► kirim refreshToken ke /auth/logout, lalu hapus kedua token di frontend
```

### Di mana menyimpan token?

| Opsi                     | Kelebihan                  | Kekurangan                                  |
| ------------------------ | -------------------------- | ------------------------------------------- |
| `localStorage`           | Mudah, persist antar tab   | Rentan XSS (script bisa baca)               |
| `sessionStorage`         | Hilang saat tab ditutup    | Rentan XSS, tidak persist                   |
| Memory (variabel JS)     | Paling aman dari XSS       | Hilang saat refresh halaman                 |

Rekomendasi praktis: simpan `accessToken` di memory + `refreshToken` di `localStorage`
(atau cookie httpOnly jika kamu bisa atur di reverse proxy). Untuk MVP, `localStorage`
keduanya juga boleh — yang penting konsisten dan hapus saat logout.

---

## 3. Endpoint auth

### Register — `POST /auth/register`

```json
// request body
{ "name": "Budi", "email": "budi@example.com", "password": "secret123" }
// roleId opsional (default role "user")
```

```json
// response 201
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "a1b2c3...",
  "user": { "id": "uuid", "name": "Budi", "email": "budi@example.com", "roleId": 1, "active": true }
}
```

Error: `409` bila email sudah terdaftar.

### Login — `POST /auth/login`

```json
{ "email": "budi@example.com", "password": "secret123" }
```

Response sama seperti register. Error: `401` bila kredensial salah / akun nonaktif.

### Refresh — `POST /auth/refresh`

```json
{ "refreshToken": "a1b2c3..." }
```

Response: pasangan token baru (`accessToken`, `refreshToken`, `user`).
Setelah ini, **refresh token lama tidak boleh dipakai lagi** — simpan yang baru.
Error: `401` bila refresh token tidak valid / kedaluwarsa → user harus login ulang.

### Logout — `POST /auth/logout` (butuh Bearer)

```json
{ "refreshToken": "a1b2c3..." }
```

Mencabut refresh token di server. Setelah ini hapus kedua token di frontend.

### Profil — `GET /auth/me` (butuh Bearer)

Mengembalikan data user yang sedang login.

---

## 4. Helper fetch dengan auto-refresh (vanilla JS)

Pola umum: bungkus `fetch` agar otomatis menyisipkan token, dan otomatis refresh
+ ulangi request bila kena `401`.

```js
const BASE_URL = 'http://localhost:3000';

const tokens = {
  get access() { return localStorage.getItem('accessToken'); },
  get refresh() { return localStorage.getItem('refreshToken'); },
  set(access, refresh) {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  },
  clear() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Login gagal');
  const data = await res.json();
  tokens.set(data.accessToken, data.refreshToken);
  return data.user;
}

async function logout() {
  await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.access}`,
    },
    body: JSON.stringify({ refreshToken: tokens.refresh }),
  }).catch(() => {});
  tokens.clear();
}

// Tukar refresh token → token baru. Lempar error bila gagal (harus login ulang).
async function refreshTokens() {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refresh }),
  });
  if (!res.ok) {
    tokens.clear();
    throw new Error('SESSION_EXPIRED');
  }
  const data = await res.json();
  tokens.set(data.accessToken, data.refreshToken);
  return data.accessToken;
}

// fetch terproteksi dengan auto-refresh sekali coba ulang.
async function apiFetch(path, options = {}) {
  const doFetch = (token) =>
    fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

  let res = await doFetch(tokens.access);
  if (res.status === 401) {
    const newToken = await refreshTokens(); // lempar SESSION_EXPIRED kalau gagal
    res = await doFetch(newToken);
  }
  return res;
}
```

Contoh pemakaian:

```js
// catat aksi edit
await apiFetch('/activity-logs', {
  method: 'POST',
  body: JSON.stringify({ toolName: 'crop', metadata: { width: 800, height: 600 } }),
});

// ambil profil
const me = await (await apiFetch('/auth/me')).json();
```

---

## 5. Mencatat aktivitas edit — `POST /activity-logs`

Tiap kali user memakai sebuah tool edit di frontend, kirim log-nya:

```json
{ "toolName": "crop", "metadata": { "width": 800, "height": 600 } }
```

- `toolName` **wajib** (string, mis. `crop`, `rotate`, `filter:sepia`).
- `metadata` **opsional** — objek bebas, isi apa saja yang relevan.
- **Jangan** kirim `userId` atau `ipAddress` — diisi otomatis dari token & server.

Lihat log milik sendiri: `GET /activity-logs` (mendukung pagination/filter/sort/search).

---

## 6. Pagination, filter, sort, search (semua endpoint list)

Semua endpoint GET list (`/users`, `/activity-logs`, `/activity-logs/all`,
`/log-history`) menerima query param:

| Param       | Default     | Keterangan                                            |
| ----------- | ----------- | ----------------------------------------------------- |
| `page`      | `1`         | Halaman (mulai 1)                                     |
| `limit`     | `20`        | Item per halaman (maks `100`)                         |
| `sortBy`    | `createdAt` | Field sort (whitelist per endpoint; tak valid → default) |
| `sortOrder` | `DESC`      | `ASC` / `DESC`                                        |
| `search`    | —           | Pencarian teks bebas (case-insensitive)               |

> ⚠️ Query param **di luar** yang didokumentasikan akan ditolak `400`.
> Jangan kirim param acak.

Bentuk response:

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

Contoh membangun query di frontend:

```js
const params = new URLSearchParams({
  page: '2',
  limit: '10',
  sortBy: 'createdAt',
  sortOrder: 'DESC',
  search: 'crop',
});
const res = await apiFetch(`/activity-logs?${params}`);
const { data, meta } = await res.json();
// render `data`, pakai `meta.totalPages` & `meta.hasNextPage` untuk paginator
```

Filter spesifik per endpoint (lihat detail di [API.md](API.md)):

| Endpoint              | Filter tambahan                  |
| --------------------- | -------------------------------- |
| `/users`              | `roleId`, `active`               |
| `/activity-logs`      | `toolName`                       |
| `/activity-logs/all`  | `userId`, `toolName`             |
| `/log-history`        | `method`, `statusCode`, `userId` |

---

## 7. Role & hak akses

- Endpoint `/users/*`, `/activity-logs/all`, `/log-history` hanya untuk **admin**.
- User biasa yang mengaksesnya akan dapat `403 Forbidden`.
- `user.roleId`: `1` = user, `2` = admin (default seeder). Gunakan untuk
  menampilkan/menyembunyikan menu admin di UI — tapi **tetap andalkan backend**
  untuk penegakan, jangan hanya UI.

---

## 8. Penanganan error (HTTP status)

Format error mengikuti NestJS:

```json
{ "statusCode": 400, "message": ["..."], "error": "Bad Request" }
```

| Code | Arti & yang harus dilakukan frontend                                      |
| ---- | ------------------------------------------------------------------------- |
| 400  | Validasi gagal / query param tak dikenal → tampilkan pesan, perbaiki input |
| 401  | Token tidak valid/kedaluwarsa → coba refresh; gagal → paksa login ulang    |
| 403  | Bukan admin → sembunyikan/blokir fitur admin                              |
| 404  | Resource tidak ada → tampilkan "tidak ditemukan"                          |
| 409  | Email sudah terdaftar (register) → minta user pakai email lain            |

`message` bisa berupa **array string** (dari validasi) atau **string tunggal** —
tangani keduanya saat menampilkan ke user.

---

## 9. Catatan integrasi

- **CORS:** sudah aktif. Backend mengizinkan origin dari env `CORS_ORIGIN`
  (daftar dipisah koma, mis. `http://localhost:5173,https://app.example.com`).
  Kalau `CORS_ORIGIN` kosong, **semua origin diizinkan** (cocok untuk dev).
  Set ke origin frontend yang spesifik untuk production. `credentials` di-enable.
- **Content-Type:** selalu kirim `application/json` untuk request ber-body.
- **Jam token:** access token cuma 15 menit — wajib implementasikan auto-refresh
  (bagian 4) supaya user tidak ke-logout tiap 15 menit.
- **Logout bersih:** selalu panggil `/auth/logout` sebelum menghapus token lokal,
  agar refresh token dicabut di server (mencegah penyalahgunaan token yang bocor).
```