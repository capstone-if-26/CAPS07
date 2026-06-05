# API Dashboard — Dokumentasi

Dokumen ini menjelaskan seluruh endpoint API pada modul dashboard analitik OJK Chatbot. Semua endpoint bersifat `GET` dan dapat diakses tanpa autentikasi.

---

## Daftar Endpoint

| Endpoint | Deskripsi |
| :--- | :--- |
| `GET /api/dashboard/overview` | Ringkasan KPI + tren waktu |
| `GET /api/dashboard/session-intent` | Analisis sesi, distribusi intent, dan word cloud |
| `GET /api/dashboard/feedback` | CSAT keseluruhan, per intent, dan tren waktu |
| `GET /api/dashboard/performance` | Waktu respons rata-rata, error rate, dan tren performa per endpoint AI |

---

## Filter Waktu (berlaku untuk semua endpoint)

| Parameter | Tipe | Deskripsi | Default |
| :--- | :--- | :--- | :--- |
| `days` | `string` | Rentang hari terakhir: `7` atau `30` | `30` |
| `year` | `string` | Filter tahun tertentu, mis. `2026` | — |
| `month` | `string` | Filter bulan tertentu (1–12), dipakai bersama `year` | — |

**Aturan prioritas:**

| Kombinasi parameter | Rentang data yang digunakan |
| :--- | :--- |
| *(tidak ada)* | 30 hari terakhir |
| `days=7` | 7 hari terakhir |
| `days=30` | 30 hari terakhir |
| `year=YYYY` | Seluruh tahun tersebut |
| `year=YYYY&month=MM` | Bulan tersebut pada tahun tersebut |

Jika `year` diberikan, `days` diabaikan.

### Granularitas periode tren

| Kondisi filter | Format `period` |
| :--- | :--- |
| `days=7` atau `days=30` (default) | Harian — `YYYY-MM-DD` |
| `year` saja | Bulanan — `YYYY-MM` |
| `year` + `month` | Harian — `YYYY-MM-DD` |

---

## 1. GET `/api/dashboard/overview`

Mengambil ringkasan KPI utama (angka tunggal) beserta data tren waktu untuk menampilkan *line chart* pada tiga metrik utama: jumlah chat, completion rate, dan persentase like.

### Query Parameters

Menggunakan filter waktu standar di atas.

### Success Response — `200 OK`

```json
{
  "status": true,
  "message": "Berhasil mengambil overview dashboard",
  "data": {
    "totalChats": 142,
    "resolvedChats": 96,
    "totalChatsChange": 18.33,
    "completionRate": 67.61,
    "completionRateChange": 3.21,
    "likePercentage": 62.50,
    "satisfactionLevel": "puas",
    "satisfactionLabel": "Puas",
    "satisfactionThreshold": 50,
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
    ],
    "trend": [
      {
        "period": "2026-04-23",
        "totalChats": 12,
        "completionRate": 66.67,
        "likePercentage": 60.00
      },
      {
        "period": "2026-04-24",
        "totalChats": 9,
        "completionRate": 77.78,
        "likePercentage": 71.43
      }
    ]
  }
}
```

### Keterangan Field

**Aggregate — volume chat**

| Field | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `totalChats` | `number` | Total sesi chat dalam rentang waktu |
| `resolvedChats` | `number` | Jumlah chat yang `is_resolved = true` |
| `totalChatsChange` | `number \| null` | Perubahan relatif dibanding periode sebelumnya dalam persen, mis. `+18.33` = naik 18,33%. `null` jika periode sebelumnya tidak ada data |

**Aggregate — completion rate**

| Field | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `completionRate` | `number` | Persentase chat yang `is_resolved = true` (`resolvedChats / totalChats × 100`) |
| `completionRateChange` | `number` | Selisih persentase poin dibanding periode sebelumnya, mis. `+3.21` = naik 3,21 pp. Dapat bernilai negatif |

**Aggregate — kepuasan (like percentage)**

| Field | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `likePercentage` | `number` | Persentase *like* dari seluruh feedback yang tercatat (termasuk *none*) |
| `satisfactionLevel` | `string` | Kunci level kepuasan (lihat tabel tier di bawah) |
| `satisfactionLabel` | `string` | Label tampilan dalam Bahasa Indonesia |
| `satisfactionThreshold` | `number` | Persentase minimum untuk level tersebut |

**Tier kepuasan `likePercentage`:**

| `satisfactionLevel` | `satisfactionLabel` | `satisfactionThreshold` |
| :--- | :--- | :--- |
| `sangat_puas` | Sangat Puas | 70% |
| `puas` | Puas | 50% |
| `cukup` | Cukup | 30% |
| `kurang` | Kurang | 0% |

**Periode perbandingan (previous period):**

| Filter aktif | Periode sebelumnya yang dibandingkan |
| :--- | :--- |
| `days=7` | 7 hari sebelum periode saat ini |
| `days=30` (default) | 30 hari sebelum periode saat ini |
| `year=YYYY` | Tahun `YYYY - 1` |
| `year=YYYY&month=MM` | Bulan sebelumnya (Januari → Desember tahun sebelumnya) |

**`intents[]`**

| Field | Deskripsi |
| :--- | :--- |
| `intent` | Nama intent OJK |
| `count` | Jumlah chat dengan intent tersebut |
| `percentage` | Persentase dari total chat, dibulatkan 2 desimal |

**`trend[]` (per periode)**

| Field | Deskripsi |
| :--- | :--- |
| `trend[].period` | Label periode sesuai granularitas (lihat tabel Filter Waktu) |
| `trend[].totalChats` | Jumlah sesi chat pada periode tersebut |
| `trend[].completionRate` | Completion rate pada periode tersebut |
| `trend[].likePercentage` | Persentase *like* pada periode tersebut; `0` jika tidak ada feedback |

> **Catatan:** `trend` dibentuk dari penggabungan data chat dan feedback per periode. Periode yang memiliki data chat tetapi tidak ada feedback akan tetap muncul dengan `likePercentage: 0`.

---

## 2. GET `/api/dashboard/session-intent`

Mengambil distribusi intent, word cloud dari pesan pengguna, dan analisis pola sesi. Digunakan untuk memahami topik yang paling sering ditanyakan dan mengidentifikasi drop-off.

### Query Parameters

Menggunakan filter waktu standar di atas.

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
| `intent` | Nama intent OJK (lihat daftar di bawah) |
| `count` | Jumlah chat dengan intent tersebut |
| `percentage` | Persentase dari total chat, dibulatkan 2 desimal |

**`wordCloud[]`**

| Field | Deskripsi |
| :--- | :--- |
| `word` | Kata yang diekstrak dari pesan pengguna (`sender_type = 'user'`) |
| `count` | Frekuensi kemunculan dalam rentang waktu |

Word cloud diproses di sisi server: konten pesan pengguna ditokenisasi, *stop words* Bahasa Indonesia difilter, dan dikembalikan maksimal **50 kata teratas** berdasarkan frekuensi.

**`sessionAnalysis`**

| Field | Deskripsi |
| :--- | :--- |
| `totalSessions` | Total jumlah sesi chat |
| `withIntent` | Jumlah chat dengan intent terklasifikasi (bukan `'Lainnya'`) |
| `withContact` | Jumlah chat yang `is_resolved = true` — pengguna memperoleh kanal/kontak resmi OJK |
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

## 3. GET `/api/dashboard/feedback`

Mengambil data *Customer Satisfaction Score* (CSAT) secara keseluruhan, per intent, dan tren waktu. CSAT dihitung dari perbandingan *like* terhadap total *like + dislike*; feedback bernilai `'none'` tidak dihitung.

### Query Parameters

Menggunakan filter waktu standar di atas.

### Success Response — `200 OK`

```json
{
  "status": true,
  "message": "Berhasil mengambil data feedback",
  "data": {
    "csat": 84.21,
    "csatChange": 6.35,
    "totalFeedback": 76,
    "totalFeedbackChange": 22.58,
    "likes": 64,
    "dislikes": 12,
    "likeRate": 84.21,
    "dislikeRate": 15.79,
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

**Aggregate — CSAT**

| Field | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `csat` | `number` | CSAT keseluruhan: `likes / (likes + dislikes) × 100`, dibulatkan 2 desimal. `0` jika belum ada feedback |
| `csatChange` | `number \| null` | Perubahan relatif CSAT dibanding periode sebelumnya dalam persen, mis. `+6.35` = naik 6,35%. `null` jika CSAT periode sebelumnya = 0 |

**Aggregate — volume feedback**

| Field | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `totalFeedback` | `number` | Total feedback yang diberikan (`likes + dislikes`, tidak termasuk `'none'`) |
| `totalFeedbackChange` | `number \| null` | Perubahan relatif volume feedback dibanding periode sebelumnya. `null` jika periode sebelumnya tidak ada data |
| `likes` | `number` | Jumlah feedback *like* |
| `dislikes` | `number` | Jumlah feedback *dislike* |
| `likeRate` | `number` | Persentase *like* dari `totalFeedback`: `likes / (likes + dislikes) × 100` |
| `dislikeRate` | `number` | Persentase *dislike* dari `totalFeedback`: `dislikes / (likes + dislikes) × 100` |

> `likeRate + dislikeRate = 100`. Keduanya `0` jika `totalFeedback = 0`.

**`csatByIntent[]`**

| Field | Deskripsi |
| :--- | :--- |
| `intent` | Nama intent OJK, didapat dari join `message_feedbacks → messages → chats` |
| `likes` | Jumlah *like* untuk intent tersebut |
| `dislikes` | Jumlah *dislike* untuk intent tersebut |
| `total` | `likes + dislikes` untuk intent tersebut |
| `csat` | CSAT untuk intent tersebut, formula sama dengan `csat` keseluruhan |

**`trend[]`**

| Field | Deskripsi |
| :--- | :--- |
| `period` | Label periode sesuai granularitas (lihat tabel Filter Waktu di atas) |
| `likes` | Jumlah *like* pada periode tersebut |
| `dislikes` | Jumlah *dislike* pada periode tersebut |

---

## 4. GET `/api/dashboard/performance`

Mengambil data performa teknis endpoint AI utama: waktu respons rata-rata (keseluruhan dan per endpoint), *error rate*, dan tren waktu. Digunakan untuk memantau kesehatan sistem dan mengidentifikasi degradasi performa.

### Query Parameters

Menggunakan filter waktu standar di atas.

### Success Response — `200 OK`

```json
{
  "status": true,
  "message": "Berhasil mengambil data performa",
  "data": {
    "summary": {
      "totalRequests": 318,
      "avgResponseMs": 1240,
      "p50Ms": 980,
      "p95Ms": 3850,
      "errorCount": 7,
      "errorRate": 2.20
    },
    "byEndpoint": [
      {
        "endpoint": "new_chat",
        "label": "Chat Baru",
        "totalRequests": 142,
        "avgResponseMs": 1580,
        "p95Ms": 4200,
        "errorCount": 3,
        "errorRate": 2.11
      },
      {
        "endpoint": "existing_chat",
        "label": "Chat Lanjutan",
        "totalRequests": 98,
        "avgResponseMs": 1320,
        "p95Ms": 3600,
        "errorCount": 2,
        "errorRate": 2.04
      },
      {
        "endpoint": "quiz",
        "label": "Quiz",
        "totalRequests": 44,
        "avgResponseMs": 920,
        "p95Ms": 2100,
        "errorCount": 1,
        "errorRate": 2.27
      },
      {
        "endpoint": "summary",
        "label": "Ringkasan",
        "totalRequests": 34,
        "avgResponseMs": 740,
        "p95Ms": 1800,
        "errorCount": 1,
        "errorRate": 2.94
      }
    ],
    "trend": [
      {
        "period": "2026-04-23",
        "avgResponseMs": 1150,
        "requestCount": 18,
        "errorCount": 0,
        "errorRate": 0.00
      },
      {
        "period": "2026-04-24",
        "avgResponseMs": 1380,
        "requestCount": 21,
        "errorCount": 1,
        "errorRate": 4.76
      }
    ]
  }
}
```

### Keterangan Field

**`summary` (agregat keseluruhan)**

| Field | Deskripsi |
| :--- | :--- |
| `totalRequests` | Total request yang dicatat dalam rentang waktu |
| `avgResponseMs` | Rata-rata waktu respons seluruh endpoint dalam milidetik |
| `p50Ms` | Persentil ke-50 (median) waktu respons dalam milidetik |
| `p95Ms` | Persentil ke-95 waktu respons dalam milidetik — indikator kasus lambat |
| `errorCount` | Jumlah request yang menghasilkan status HTTP 5xx |
| `errorRate` | Persentase error: `errorCount / totalRequests × 100`, dibulatkan 2 desimal. `0` jika belum ada request |

**`byEndpoint[]` (per endpoint)**

| Field | Deskripsi |
| :--- | :--- |
| `endpoint` | Kunci internal endpoint (lihat tabel di bawah) |
| `label` | Nama tampilan endpoint dalam Bahasa Indonesia |
| `totalRequests` | Total request untuk endpoint tersebut |
| `avgResponseMs` | Rata-rata waktu respons untuk endpoint tersebut dalam milidetik |
| `p95Ms` | Persentil ke-95 waktu respons untuk endpoint tersebut |
| `errorCount` | Jumlah request error untuk endpoint tersebut |
| `errorRate` | Persentase error untuk endpoint tersebut, formula sama dengan `summary.errorRate` |

**Endpoint yang dipantau:**

| `endpoint` | `label` | Catatan durasi |
| :--- | :--- | :--- |
| `chat` | Chat | Durasi = TTFB (waktu hingga stream dimulai, bukan selesai). Mencakup POST `/api/chats` (chat baru) dan POST `/api/chats/[id]` (chat lanjutan) |
| `quiz` | Quiz | Durasi = waktu pemrosesan penuh hingga respons selesai |
| `summary` | Ringkasan | Durasi = waktu pemrosesan penuh hingga respons selesai |

**`trend[]` (per periode)**

| Field | Deskripsi |
| :--- | :--- |
| `period` | Label periode sesuai granularitas (lihat tabel Filter Waktu di atas) |
| `avgResponseMs` | Rata-rata waktu respons semua endpoint pada periode tersebut |
| `requestCount` | Total request pada periode tersebut |
| `errorCount` | Jumlah request error pada periode tersebut |
| `errorRate` | Persentase error pada periode tersebut |

> **Catatan durasi:** Untuk endpoint streaming (`chat`), `duration_ms` mencatat *Time to First Byte* (TTFB) — yaitu waktu dari request masuk hingga stream pertama dikirim ke klien, bukan hingga seluruh stream selesai. Untuk endpoint non-streaming (`quiz`, `summary`), `duration_ms` mencatat waktu pemrosesan penuh.

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
