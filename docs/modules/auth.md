# Dokumentasi API Authentication — Better Auth

Dokumen ini memetakan seluruh endpoint autentikasi yang disediakan oleh **Better Auth** pada project OJK Chatbot. Semua endpoint berada di bawah base path `/api/auth/*` dan dihandle secara otomatis oleh catch-all route handler.

---

## Konfigurasi Aktif

| Fitur | Status | Keterangan |
|---|---|---|
| Email & Password | ✅ Aktif | `emailAndPassword.enabled: true` |
| Email Verification | ✅ Aktif (Mock) | Menggunakan `console.log` di server |
| Password Reset | ✅ Aktif (Mock) | Menggunakan `console.log` di server |
| OAuth / Social Login | ❌ Belum | Tidak ada provider OAuth yang dikonfigurasi |

### Database Schema

**Tabel `users`:**
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `name` | text | Nama lengkap user |
| `email` | text (unique) | Email user |
| `email_verified` | boolean | Default `false` |
| `image` | text | URL avatar (opsional) |
| `auth_provider` | text | Provider autentikasi (custom) |
| `password` | text | Password hash (custom) |
| `role` | text | Default `"user"` (custom) |
| `created_at` | timestamp | Waktu pembuatan |
| `updated_at` | timestamp | Waktu update terakhir |
| `deleted_at` | timestamp | Soft delete (opsional) |

**Tabel `session`:**
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `token` | text (unique) | Session token |
| `expires_at` | timestamp | Waktu kadaluarsa |
| `ip_address` | text | IP address client |
| `user_agent` | text | Browser user agent |
| `user_id` | UUID (FK → users) | Referensi ke user |

**Tabel `account`:**
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `account_id` | UUID | ID akun pada provider |
| `provider_id` | text | Identifier provider (e.g. `"credential"`) |
| `user_id` | UUID (FK → users) | Referensi ke user |
| `password` | text | Password hash (untuk credential provider) |
| `access_token` | text | OAuth access token (opsional) |
| `refresh_token` | text | OAuth refresh token (opsional) |

**Tabel `verification`:**
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `identifier` | text | Email atau identifier lain |
| `value` | text | Token verifikasi |
| `expires_at` | timestamp | Waktu kadaluarsa token |

---

## Session & Cookie

Better Auth menggunakan **HTTP-only secure cookies** untuk manajemen sesi. Setiap response dari `sign-in` dan `sign-up` akan menyertakan header `Set-Cookie` yang berisi session token. Cookie ini harus dikirim kembali di setiap request yang membutuhkan autentikasi.

```
Set-Cookie: better-auth.session_token=<TOKEN>; Path=/; HttpOnly; SameSite=Lax
```

---

## Endpoint API

### 1. Registrasi User Baru

**Endpoint:** `POST /api/auth/sign-up/email`

Membuat akun baru dengan email dan password. Jika berhasil, user otomatis ter-sign-in dan session cookie diberikan.

#### Request:

```
Content-Type: application/json
```

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "password1234",
  "image": "https://example.com/avatar.png",
  "callbackURL": "/dashboard"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `name` | string | ✅ | Nama lengkap user |
| `email` | string | ✅ | Email unik, belum terdaftar |
| `password` | string | ✅ | Minimal 8 karakter, maks 128 |
| `image` | string | ❌ | URL foto profil |
| `callbackURL` | string | ❌ | URL redirect setelah registrasi |

#### Response Sukses (`200`):

```
Set-Cookie: better-auth.session_token=<TOKEN>; ...
```

```json
{
  "user": {
    "id": "a1b2c3d4-...",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "emailVerified": false,
    "image": "https://example.com/avatar.png",
    "createdAt": "2026-05-12T10:00:00.000Z",
    "updatedAt": "2026-05-12T10:00:00.000Z"
  },
  "session": {
    "id": "e5f6g7h8-...",
    "userId": "a1b2c3d4-...",
    "token": "random-session-token",
    "expiresAt": "2026-05-19T10:00:00.000Z"
  }
}
```

#### Response Error:

| Status | Keterangan |
|---|---|
| `422` | Email sudah terdaftar |
| `400` | Validasi gagal (password terlalu pendek, field wajib kosong) |

```json
{
  "code": "USER_ALREADY_EXISTS",
  "message": "User with this email already exists"
}
```

---

### 2. Login User

**Endpoint:** `POST /api/auth/sign-in/email`

Login dengan email dan password. Jika berhasil, session cookie diberikan.

#### Request:

```
Content-Type: application/json
```

```json
{
  "email": "john.doe@example.com",
  "password": "password1234",
  "rememberMe": true,
  "callbackURL": "/dashboard"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `email` | string | ✅ | Email terdaftar |
| `password` | string | ✅ | Password akun |
| `rememberMe` | boolean | ❌ | Default `true`. Jika `false`, sesi berakhir saat browser ditutup |
| `callbackURL` | string | ❌ | URL redirect setelah login |

#### Response Sukses (`200`):

```
Set-Cookie: better-auth.session_token=<TOKEN>; ...
```

```json
{
  "user": {
    "id": "a1b2c3d4-...",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "emailVerified": false,
    "image": "https://example.com/avatar.png",
    "createdAt": "2026-05-12T10:00:00.000Z",
    "updatedAt": "2026-05-12T10:00:00.000Z"
  },
  "session": {
    "id": "e5f6g7h8-...",
    "userId": "a1b2c3d4-...",
    "token": "random-session-token",
    "expiresAt": "2026-05-19T10:00:00.000Z"
  }
}
```

#### Response Error:

| Status | Keterangan |
|---|---|
| `401` | Email atau password salah |
| `403` | Email belum diverifikasi (jika `requireEmailVerification` aktif) |

```json
{
  "code": "INVALID_EMAIL_OR_PASSWORD",
  "message": "Invalid email or password"
}
```

---

### 3. Logout

**Endpoint:** `POST /api/auth/sign-out`

Menghapus/invalidasi session aktif. Membutuhkan session cookie.

#### Request:

```
Cookie: better-auth.session_token=<TOKEN>
Content-Type: application/json
```

```json
{}
```

Tidak membutuhkan body khusus. Cukup kirimkan cookie session.

#### Response Sukses (`200`):

```
Set-Cookie: better-auth.session_token=; Max-Age=0; ...
```

```json
{
  "success": true
}
```

---

### 4. Mengambil Sesi Aktif

**Endpoint:** `GET /api/auth/get-session`

Mengambil informasi user dan session yang sedang aktif. Membutuhkan session cookie.

#### Request:

```
Cookie: better-auth.session_token=<TOKEN>
```

Tidak membutuhkan body.

#### Response Sukses (`200`):

```json
{
  "user": {
    "id": "a1b2c3d4-...",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "emailVerified": false,
    "image": "https://example.com/avatar.png",
    "createdAt": "2026-05-12T10:00:00.000Z",
    "updatedAt": "2026-05-12T10:00:00.000Z"
  },
  "session": {
    "id": "e5f6g7h8-...",
    "userId": "a1b2c3d4-...",
    "token": "random-session-token",
    "expiresAt": "2026-05-19T10:00:00.000Z"
  }
}
```

#### Response Error:

| Status | Keterangan |
|---|---|
| `401` | Tidak ada session aktif / cookie tidak valid |

---

### 5. Daftar Sesi Aktif

**Endpoint:** `GET /api/auth/list-sessions`

Mengambil semua sesi aktif milik user yang sedang login. Berguna untuk fitur "kelola perangkat aktif".

#### Request:

```
Cookie: better-auth.session_token=<TOKEN>
```

#### Response Sukses (`200`):

```json
[
  {
    "id": "e5f6g7h8-...",
    "userId": "a1b2c3d4-...",
    "token": "session-token-1",
    "expiresAt": "2026-05-19T10:00:00.000Z",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
  },
  {
    "id": "i9j0k1l2-...",
    "userId": "a1b2c3d4-...",
    "token": "session-token-2",
    "expiresAt": "2026-05-20T08:00:00.000Z",
    "ipAddress": "10.0.0.5",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)..."
  }
]
```

---

### 6. Revoke Sesi Tertentu

**Endpoint:** `POST /api/auth/revoke-session`

Menghapus sesi tertentu berdasarkan token. Membutuhkan session cookie.

#### Request:

```json
{
  "token": "session-token-to-revoke"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `token` | string | ✅ | Token session yang akan di-revoke |

#### Response Sukses (`200`):

```json
{
  "success": true
}
```

---

### 7. Revoke Semua Sesi

**Endpoint:** `POST /api/auth/revoke-sessions`

Menghapus semua sesi aktif milik user yang sedang login (termasuk sesi saat ini).

#### Request:

```
Cookie: better-auth.session_token=<TOKEN>
```

```json
{}
```

#### Response Sukses (`200`):

```json
{
  "success": true
}
```

---

### 8. Ganti Password

**Endpoint:** `POST /api/auth/change-password`

Mengubah password user yang sedang login. Membutuhkan session cookie.

#### Request:

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456",
  "revokeOtherSessions": true
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `currentPassword` | string | ✅ | Password saat ini |
| `newPassword` | string | ✅ | Password baru (min 8, max 128 karakter) |
| `revokeOtherSessions` | boolean | ❌ | Jika `true`, semua sesi lain akan dihapus |

#### Response Sukses (`200`):

```json
{
  "success": true
}
```

#### Response Error:

| Status | Keterangan |
|---|---|
| `400` | Password baru tidak memenuhi syarat |
| `401` | Password saat ini salah |

---

### 9. Request Reset Password

**Endpoint:** `POST /api/auth/forget-password`

> ✅ **Aktif (Mock).** Saat ini email dikirimkan secara mock melalui `console.log` di server.

Mengirim link reset password ke email user.

#### Request:

```json
{
  "email": "john.doe@example.com",
  "redirectTo": "https://example.com/reset-password"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `email` | string | ✅ | Email terdaftar |
| `redirectTo` | string | ❌ | URL halaman reset password |

#### Response Sukses (`200`):

```json
{
  "success": true
}
```

> Response selalu `200` meskipun email tidak terdaftar (untuk mencegah enumerasi).

---

### 10. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

> ✅ **Aktif.** Bergantung pada token yang digenerate oleh endpoint `forget-password`.

Mengatur password baru menggunakan token dari email reset.

#### Request:

```json
{
  "newPassword": "newSecurePassword456",
  "token": "reset-token-from-email-url"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `newPassword` | string | ✅ | Password baru |
| `token` | string | ✅ | Token dari URL reset password |

#### Response Sukses (`200`):

```json
{
  "success": true
}
```

#### Response Error:

| Status | Keterangan |
|---|---|
| `400` | Token tidak valid atau sudah kadaluarsa |

---

### 11. Kirim Email Verifikasi

**Endpoint:** `POST /api/auth/send-verification-email`

> ✅ **Aktif (Mock).** Saat ini email dikirimkan secara mock melalui `console.log` di server.

Mengirim ulang email verifikasi ke user.

#### Request:

```json
{
  "email": "john.doe@example.com",
  "callbackURL": "/email-verified"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `email` | string | ✅ | Email yang akan diverifikasi |
| `callbackURL` | string | ❌ | URL redirect setelah verifikasi berhasil |

#### Response Sukses (`200`):

```json
{
  "success": true
}
```

---

### 12. Verifikasi Email

**Endpoint:** `GET /api/auth/verify-email`

> ✅ **Aktif.** Bergantung pada endpoint `send-verification-email`.

Dipanggil saat user mengklik link verifikasi dari email. Redirect ke `callbackURL` yang diberikan saat `send-verification-email`.

#### Query Parameters:

| Parameter | Keterangan |
|---|---|
| `token` | Token verifikasi dari URL email |
| `callbackURL` | URL redirect setelah verifikasi |

#### Behavior:

- **Token valid** → redirect ke `callbackURL`
- **Token tidak valid** → redirect ke `callbackURL?error=invalid_token`

---

### 13. Update Profil User

**Endpoint:** `POST /api/auth/update-user`

Mengupdate data profil user yang sedang login.

#### Request:

```json
{
  "name": "Jane Doe",
  "image": "https://example.com/new-avatar.png"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `name` | string | ❌ | Nama baru |
| `image` | string | ❌ | URL foto profil baru |

#### Response Sukses (`200`):

```json
{
  "user": {
    "id": "a1b2c3d4-...",
    "name": "Jane Doe",
    "email": "john.doe@example.com",
    "emailVerified": false,
    "image": "https://example.com/new-avatar.png",
    "createdAt": "2026-05-12T10:00:00.000Z",
    "updatedAt": "2026-05-12T18:00:00.000Z"
  }
}
```

---

## Penggunaan Server-Side (Next.js)

Untuk mengecek session di API route handler atau Server Component, gunakan `auth.api.getSession()`:

```typescript
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // session.user → data user
  // session.session → data session
  const userId = session.user.id;
}
```

---

## Ringkasan Endpoint

| # | Method | Endpoint | Auth | Status |
|---|---|---|---|---|
| 1 | `POST` | `/api/auth/sign-up/email` | ❌ | ✅ Aktif |
| 2 | `POST` | `/api/auth/sign-in/email` | ❌ | ✅ Aktif |
| 3 | `POST` | `/api/auth/sign-out` | 🔒 Cookie | ✅ Aktif |
| 4 | `GET` | `/api/auth/get-session` | 🔒 Cookie | ✅ Aktif |
| 5 | `GET` | `/api/auth/list-sessions` | 🔒 Cookie | ✅ Aktif |
| 6 | `POST` | `/api/auth/revoke-session` | 🔒 Cookie | ✅ Aktif |
| 7 | `POST` | `/api/auth/revoke-sessions` | 🔒 Cookie | ✅ Aktif |
| 8 | `POST` | `/api/auth/change-password` | 🔒 Cookie | ✅ Aktif |
| 9 | `POST` | `/api/auth/forget-password` | ❌ | ✅ Aktif |
| 10 | `POST` | `/api/auth/reset-password` | ❌ | ✅ Aktif |
| 11 | `POST` | `/api/auth/send-verification-email` | ❌ | ✅ Aktif |
| 12 | `GET` | `/api/auth/verify-email` | ❌ | ✅ Aktif |
| 13 | `POST` | `/api/auth/update-user` | 🔒 Cookie | ✅ Aktif |
