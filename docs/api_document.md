# Dokumentasi API — Documents Module

Dokumen ini memetakan seluruh endpoint untuk manajemen dokumen pada project OJK Chatbot. Seluruh endpoint berada di bawah base path `/api/documents`.

---

## Konfigurasi & Arsitektur

Modul dokumen menggunakan pendekatan **Two-Phase Commit / Asynchronous Processing** untuk unggah dokumen:
1. **Phase 1 (Sync):** Validasi format, pembuatan hash, penyimpanan metadata ke Database (Drizzle), mengembalikan response `202 Accepted` segera ke client.
2. **Phase 2 (Async):** Pemrosesan isi dokumen (Chunking) dan embedding ke Vector Database (Pinecone) dilakukan di background via `after()` Next.js. Status dokumen akan terupdate secara asinkron.

### Database Schema

**Tabel `documents`:**
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `name` | text | Nama/Judul dokumen yang diisi user |
| `namespace` | text (unique) | Namespace di Pinecone (harus unik) |
| `description` | text | Deskripsi dokumen |
| `documentType` | text | Tipe (legal_document, faq, dll.) |
| `totalChunks` | integer | Jumlah chunk teks (default 0) |
| `fileName` | text | Nama file asli yang diunggah |
| `statusDocument` | text | Status keberlakuan (e.g. "Berlaku", "Dicabut") |
| `version` | text | Versi dokumen (e.g. "v1.0") |
| `effectiveDate` | timestamp | Waktu dokumen mulai berlaku (opsional) |
| `processingStatus` | text | Status sistem: `processing`, `completed`, `failed` |
| `errorMessage` | text | Pesan error jika processing gagal |
| `created_at` | timestamp | Waktu pembuatan |
| `updated_at` | timestamp | Waktu update terakhir |

---

## Endpoint API

### 1. Ambil Daftar Semua Dokumen

**Endpoint:** `GET /api/documents`

Mengambil semua daftar dokumen yang ada di dalam database.

#### Parameter Query (Opsional):
- `search` (string): Mencari dokumen berdasarkan nama (menggunakan filter `ilike`).
- `page` (number): Nomor halaman (default `1`).
- `limit` (number): Jumlah data per halaman (default `10`).

#### Response Sukses (`200`):

```json
{
  "status": true,
  "message": "Berhasil mengambil daftar dokumen",
  "data": {
    "documents": [
      {
        "id": "a1b2c3d4-...",
        "name": "Peraturan OJK No. 1",
        "namespace": "pojk-01-2026",
        "documentType": "legal_document",
        "totalChunks": 45,
        "fileName": "POJK_01_2026.pdf",
        "statusDocument": "Berlaku",
        "version": "v1.0",
        "effectiveDate": "2026-01-01T00:00:00.000Z",
        "processingStatus": "completed",
        "createdAt": "2026-05-12T10:00:00.000Z"
      }
    ],
    "metadata": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 2. Unggah Dokumen Baru

**Endpoint:** `POST /api/documents`

Mengunggah dokumen baru. Proses *parsing*, *chunking*, dan integrasi ke Vector DB berjalan di *background*.

#### Request:

```
Content-Type: multipart/form-data
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `file` | File | ✅ | File fisik dokumen (`.pdf`, `.docx`, `.txt`, `.md` sesuai tipe) |
| `documentType` | string | ✅ | Salah satu dari: `legal_document`, `procedure_sop`, `educational_material`, `faq`, `news_event`, `circular_letter`, `attachment` |
| `documentName` | string | ✅ | Judul/Nama dokumen |
| `namespaceName` | string | ✅ | ID unik namespace untuk Pinecone (tidak boleh mengandung spasi) |
| `description` | string | ✅ | Penjelasan singkat isi dokumen |
| `documentVersion` | string | ❌ | Versi dokumen (default: "v1.0") |
| `language` | string | ❌ | Bahasa dokumen |
| `securityLevel` | string | ❌ | Tingkat keamanan/kerahasiaan |
| `effectiveDate` | string | ❌ | Tanggal berlaku (format ISO date) |
| `statusDocument` | string | ❌ | Status keberlakuan dokumen (e.g. "Berlaku", "Dicabut") |
| `status` | string | ❌ | Status custom tambahan |

#### Response Sukses (`202 Accepted`):

> Respons diberikan secepatnya, dan client diharapkan melakukan *polling* ke endpoint `GET /api/documents/[id]` untuk mengecek apakah `processingStatus` berubah dari `processing` menjadi `completed`.

```json
{
  "status": true,
  "message": "Dokumen diterima dan sedang diproses. Gunakan GET /api/documents/{id} untuk memantau status.",
  "data": {
    "documentId": "a1b2c3d4-...",
    "documentType": "legal_document",
    "processingStatus": "processing",
    "fileName": "POJK_01_2026.pdf",
    "namespace": "pojk-01-2026",
    "fileHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "statusDocument": "Berlaku",
    "version": "v1.0",
    "effectiveDate": null,
    "createdAt": "2026-05-12T10:00:00.000Z"
  }
}
```

#### Response Error:

| Status | Keterangan |
|---|---|
| `400` | Format file tidak didukung / Parameter tidak lengkap |
| `500` | Terjadi kesalahan pada internal server atau Pinecone |

---

### 3. Detail Dokumen

**Endpoint:** `GET /api/documents/[id]`

Melihat detail dan status *processing* dokumen spesifik.

#### Parameter:
- `id` (URL Parameter): UUID dari dokumen di database.

#### Response Sukses (`200`):

```json
{
  "status": true,
  "message": "Berhasil mengambil detail dokumen",
  "data": {
    "id": "a1b2c3d4-...",
    "name": "Peraturan OJK No. 1",
    "namespace": "pojk-01-2026",
    "description": "Peraturan tentang ...",
    "documentType": "legal_document",
    "totalChunks": 45,
    "fileName": "POJK_01_2026.pdf",
    "statusDocument": "Berlaku",
    "version": "v1.0",
    "effectiveDate": "2026-01-01T00:00:00.000Z",
    "processingStatus": "completed",
    "errorMessage": null,
    "createdAt": "2026-05-12T10:00:00.000Z",
    "updatedAt": "2026-05-12T10:05:00.000Z"
  }
}
```

#### Response Error (`404`):

```json
{
  "status": false,
  "message": "Dokumen dengan ID 'xyz' tidak ditemukan",
  "data": null
}
```

---

### 4. Perbarui Status Keberlakuan

**Endpoint:** `PATCH /api/documents/[id]`

Memperbarui *processing status* atau status internal dokumen. (Saat ini dikonfigurasi untuk memperbarui kolom `status`).

#### Request:

```
Content-Type: application/json
```

```json
{
  "document_status": "Dicabut"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `document_status` | string | ✅ | Nilai baru yang akan di-update (memperbarui `processingStatus`) |

#### Response Sukses (`200`):

```json
{
  "status": true,
  "message": "Dokumen berhasil diupdate",
  "data": null
}
```

---

### 5. Hapus Dokumen Secara Permanen

**Endpoint:** `DELETE /api/documents/[id]`

Menghapus dokumen dari relasi Database (PostgreSQL) dan menghapus Namespace beserta seluruh embeddings-nya dari Vector Database (Pinecone). Proses ini bersifat **Atomic** via *compensating transaction*.

#### Parameter:
- `id` (URL Parameter): UUID dari dokumen.

#### Response Sukses (`200`):

```json
{
  "status": true,
  "message": "Dokumen berhasil dihapus",
  "data": {
    "documentId": "a1b2c3d4-...",
    "status": "deleted"
  }
}
```

#### Response Error:

| Status | Keterangan |
|---|---|
| `404` | Dokumen tidak ditemukan di DB |
| `500` | Gagal menghapus DB atau Pinecone (akan di-rollback) |

```json
{
  "status": false,
  "message": "Gagal menghapus data dari Pinecone: Not Found",
  "data": {
    "code": "PINECONE_DELETE_FAILED"
  }
}
```

---

## Ringkasan Endpoint

| # | Method | Endpoint | Kegunaan | Body Format |
|---|---|---|---|---|
| 1 | `GET` | `/api/documents` | Mengambil seluruh daftar dokumen | *None* |
| 2 | `POST` | `/api/documents` | Upload dokumen + Inisiasi AI Chunking | `multipart/form-data` |
| 3 | `GET` | `/api/documents/[id]` | Mengambil detil / cek status *processing* | *None* |
| 4 | `PATCH` | `/api/documents/[id]` | Memperbarui status dokumen | `application/json` |
| 5 | `DELETE` | `/api/documents/[id]` | Menghapus dokumen (Database + Pinecone) | *None* |
