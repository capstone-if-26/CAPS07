# API Dashboard — Dokumentasi

Dokumen ini menjelaskan seluruh endpoint API pada modul dashboard analitik OJK Chatbot. Semua endpoint bersifat `GET` dan dapat diakses tanpa autentikasi.

---

## Daftar Endpoint

| Endpoint | Deskripsi |
| :--- | :--- |
| `GET /api/dashboard/stats` | Statistik historis per periode (time-series) |
| `GET /api/dashboard/overview` | Ringkasan KPI dalam rentang waktu tertentu |
| `GET /api/dashboard/session-intent` | Analisis sesi, distribusi intent, dan word cloud |
| `GET /api/dashboard/feedback` | CSAT keseluruhan, per intent, dan tren waktu |

---

## Filter Waktu

Terdapat dua skema filter yang digunakan oleh endpoint-endpoint ini.

### Skema A — digunakan oleh `/stats`

| Parameter | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `year` | `string` | Filter tahun tertentu, mis. `2026` |
| `month` | `string` | Filter bulan tertentu (1–12), mis. `5` |
| `groupBy` | `string` | Granularitas pengelompokan: `month` (default) atau `year` |

### Skema B — digunakan oleh `/overview`, `/session-intent`, `/feedback`

| Parameter | Tipe | Deskripsi | Default |
| :--- | :--- | :--- | :--- |
| `days` | `string` | Rentang hari terakhir: `7` atau `30` | `30` |
| `year` | `string` | Filter tahun tertentu, mis. `2026` | — |
| `month` | `string` | Filter bulan tertentu (dipakai bersama `year`) | — |

**Aturan prioritas Skema B:**
- Jika `year` diberikan, parameter `days` diabaikan.
- Jika hanya `year` diberikan (tanpa `month`), data difilter untuk seluruh tahun tersebut.
- Jika `year` dan `month` diberikan, data difilter untuk bulan tersebut.
- Jika tidak ada parameter yang diberikan, default ke **30 hari terakhir**.

---

## 1. GET `/api/dashboard/stats`

Mengambil data analitik dalam bentuk time-series yang diagregasi per periode (bulan atau tahun). Digunakan untuk menampilkan grafik historis *completion rate*, distribusi intent, dan statistik feedback.

### Query Parameters

Menggunakan **Skema A**.

### Success Response — `200 OK`

```json
{
  "status": true,
  "message": "Berhasil mengambil statistik chat",
  "data": {
    "completionRate": [
      {
        "period": "2026-05",
        "totalChats": 150,
        "resolvedChats": 105,
        "rate": 70.00
      }
    ],
    "topIntents": [
      {
        "period": "2026-05",
        "intent": "Lapor Penipuan (OJK / IASC)",
        "count": 80
      },
      {
        "period": "2026-05",
        "intent": "Cek Legalitas Pinjol/Investasi",
        "count": 70
      }
    ],
    "feedbackStats": [
      {
        "period": "2026-05",
        "likes": 50,
        "dislikes": 10,
        "none": 90,
        "total": 150
      }
    ]
  }
}
```

### Keterangan Field

| Field | Deskripsi |
| :--- | :--- |
| `completionRate[].period` | Label periode, format `YYYY-MM` atau `YYYY` tergantung `groupBy` |
| `completionRate[].rate` | Persentase chat yang terselesaikan (`resolvedChats / totalChats × 100`) |
| `topIntents[].intent` | Nama intent OJK |
| `topIntents[].count` | Jumlah chat dengan intent tersebut pada periode tersebut |
| `feedbackStats[].none` | Jumlah feedback dengan nilai default (belum diberi rating) |

---

## 2. GET `/api/dashboard/overview`

Mengambil ringkasan KPI utama dalam satu rentang waktu. Cocok untuk kartu-kartu ringkasan di bagian atas halaman dashboard.

### Query Parameters

Menggunakan **Skema B**.

### Success Response — `200 OK`

```json
{
  "status": true,
  "message": "Berhasil mengambil overview dashboard",
  "data": {
    "totalChats": 142,
    "completionRate": 67.61,
    "likePercentage": 82.35,
    "intents": [
      {
        "intent": "Cek Legalitas Pinjol/Investasi",
        "count": 34,
        "percentage": 23.94
      },
      {
        "intent": "Literasi & Tips Keuangan",
        "count": 28,
        "percentage": 19.72
      }
    ]
  }
}
```

### Keterangan Field

| Field | Deskripsi |
| :--- | :--- |
| `totalChats` | Total jumlah sesi chat dalam rentang waktu |
| `completionRate` | Persentase chat yang `is_resolved = true` |
| `likePercentage` | Persentase *like* dari seluruh feedback yang ada (termasuk *none*) |
| `intents[].percentage` | Persentase intent tersebut dari total chat, dibulatkan 2 desimal |

---

## 3. GET `/api/dashboard/session-intent`

Mengambil distribusi intent, word cloud dari pesan pengguna, dan analisis pola sesi. Digunakan untuk memahami topik yang paling sering ditanyakan dan mengidentifikasi drop-off.

### Query Parameters

Menggunakan **Skema B**.

### Success Response — `200 OK`

```json
{
  "status": true,
  "message": "Berhasil mengambil data sesi dan intent",
  "data": {
    "intents": [
      {
        "intent": "Cek Legalitas Pinjol/Investasi",
        "count": 34,
        "percentage": 23.94
      },
      {
        "intent": "Lainnya",
        "count": 21,
        "percentage": 14.79
      }
    ],
    "wordCloud": [
      { "word": "pinjaman", "count": 42 },
      { "word": "ojk", "count": 38 },
      { "word": "investasi", "count": 31 }
    ],
    "sessionAnalysis": {
      "totalSessions": 142,
      "withIntent": 121,
      "withContact": 67,
      "dropOff": 18
    }
  }
}
```

### Keterangan Field

**`intents[]`**

| Field | Deskripsi |
| :--- | :--- |
| `intent` | Nama intent OJK |
| `count` | Jumlah chat dengan intent tersebut |
| `percentage` | Persentase dari total chat |

**`wordCloud[]`**

| Field | Deskripsi |
| :--- | :--- |
| `word` | Kata yang diekstrak dari pesan pengguna (`sender_type = 'user'`) |
| `count` | Frekuensi kemunculan kata dalam rentang waktu |

Word cloud diproses di sisi server: konten pesan pengguna ditokenisasi, *stop words* Bahasa Indonesia difilter, dan dikembalikan maksimal **50 kata teratas** berdasarkan frekuensi.

**`sessionAnalysis`**

| Field | Deskripsi |
| :--- | :--- |
| `totalSessions` | Total jumlah sesi chat |
| `withIntent` | Jumlah chat yang memiliki intent terklasifikasi (bukan `'Lainnya'`) |
| `withContact` | Jumlah chat yang `is_resolved = true` (pengguna memperoleh kanal/kontak resmi OJK) |
| `dropOff` | Jumlah chat dengan intent selain `'Literasi & Tips Keuangan'` dan `'Lainnya'`, tetapi `is_resolved = false` |

**Intent yang tersedia:**

| Nilai Intent |
| :--- |
| `Cek Legalitas Pinjol/Investasi` |
| `Lapor Penipuan (OJK / IASC)` |
| `Kenali Modus Penipuan` |
| `Cek SLIK / Riwayat Kredit` |
| `IASC — Anti-Scam Centre` |
| `Panduan Produk Bank` |
| `Hak Saya sebagai Konsumen` |
| `Panduan Investasi & Kripto Aman` |
| `Literasi & Tips Keuangan` |
| `Lainnya` *(default)* |

---

## 4. GET `/api/dashboard/feedback`

Mengambil data *Customer Satisfaction Score* (CSAT) secara keseluruhan, per intent, dan tren waktu. CSAT dihitung dari perbandingan *like* terhadap total *like + dislike* (feedback `'none'` tidak dihitung).

### Query Parameters

Menggunakan **Skema B**.

### Granularitas Tren

| Kondisi Filter | Pengelompokan `trend[]` |
| :--- | :--- |
| `days=7` atau `days=30` (default) | Per hari (`YYYY-MM-DD`) |
| `year` saja | Per bulan (`YYYY-MM`) |
| `year` + `month` | Per hari (`YYYY-MM-DD`) |

### Success Response — `200 OK`

```json
{
  "status": true,
  "message": "Berhasil mengambil data feedback",
  "data": {
    "csat": 84.21,
    "totalFeedback": 76,
    "likes": 64,
    "dislikes": 12,
    "csatByIntent": [
      {
        "intent": "Cek Legalitas Pinjol/Investasi",
        "likes": 18,
        "dislikes": 2,
        "total": 20,
        "csat": 90.00
      },
      {
        "intent": "Lapor Penipuan (OJK / IASC)",
        "likes": 12,
        "dislikes": 4,
        "total": 16,
        "csat": 75.00
      }
    ],
    "trend": [
      { "period": "2026-04-21", "likes": 5, "dislikes": 1 },
      { "period": "2026-04-22", "likes": 8, "dislikes": 0 },
      { "period": "2026-04-23", "likes": 3, "dislikes": 2 }
    ]
  }
}
```

### Keterangan Field

| Field | Deskripsi |
| :--- | :--- |
| `csat` | CSAT keseluruhan: `likes / (likes + dislikes) × 100`, dibulatkan 2 desimal |
| `totalFeedback` | Total feedback yang diberikan (`likes + dislikes`, tidak termasuk `'none'`) |
| `likes` | Jumlah feedback *like* |
| `dislikes` | Jumlah feedback *dislike* |
| `csatByIntent[].csat` | CSAT untuk intent tersebut, formula sama dengan `csat` keseluruhan |
| `csatByIntent[].total` | `likes + dislikes` untuk intent tersebut |
| `trend[].period` | Label periode sesuai granularitas (lihat tabel Granularitas Tren) |

---

## Error Response

Semua endpoint mengembalikan format error yang seragam.

- **Code:** `500 Internal Server Error`

```json
{
  "status": false,
  "message": "Terjadi kesalahan internal",
  "error": "Detail pesan error..."
}
```
