# API Dashboard Documentation

Dokumen ini menjelaskan endpoint API yang digunakan untuk memberikan data statistik pada dashboard analitik OJK Chatbot. Endpoint ini mengembalikan matriks penting seperti persentase *completion rate*, daftar *top intent*, dan jumlah *feedback* (suka/tidak suka).

## Base URL
`/api/dashboard/stats`

---

## 1. Get Dashboard Statistics

Mengambil data analitik yang dapat diagregasi per bulan atau per tahun. Saat ini, endpoint ini dapat diakses secara publik (tanpa autentikasi).

- **URL:** `/api/dashboard/stats`
- **Method:** `GET`

### Query Parameters (Opsional)
| Parameter | Tipe | Deskripsi | Contoh |
| :--- | :--- | :--- | :--- |
| `year` | `string` | Filter data untuk satu tahun tertentu. | `2026` |
| `month` | `string` | Filter data untuk satu bulan tertentu (direkomendasikan dipakai bersama `year`). | `05` |
| `groupBy` | `string` | Granularitas pengelompokkan waktu. Nilai valid: `month`, `year`. Jika kosong, default adalah `month`. | `month` |

### Success Response
- **Code:** 200 OK
- **Content:**
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
          "rate": 70.0
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

### Error Response
- **Code:** 500 Internal Server Error
- **Content:**
  ```json
  {
    "status": false,
    "message": "Terjadi kesalahan internal",
    "error": "Detail pesan error..."
  }
  ```
