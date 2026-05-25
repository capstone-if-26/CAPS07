# API Message Feedback Documentation

Dokumen ini menjelaskan endpoint API spesifik yang digunakan untuk menangkap respons *feedback* pengguna terhadap suatu pesan AI (contoh: *Like* atau *Dislike*).

## Base URL
`/api/messages`

---

## 1. Submit / Update Message Feedback

Memberikan status penilaian (*feedback*) pada satu pesan. Apabila *user* sebelumnya sudah memberikan *feedback* pada pesan yang sama, sistem akan secara otomatis menimpa/memperbarui (*upsert*) ke nilai yang baru. Endpoint ini **tidak memerlukan autentikasi**.

- **URL:** `/api/messages/[id]/feedback`
- **Method:** `POST`

### URL Parameters
| Parameter | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | `uuid` (string) | **[Required]** ID spesifik dari `messages` yang ingin dinilai. |

### Request Body (JSON)
| Field | Tipe | Atribut | Deskripsi |
| :--- | :--- | :--- | :--- |
| `feedback` | `string` | **[Required]** | Jenis penilaian pesan. Harus bernilai salah satu dari: `"like"`, `"dislike"`, `"none"`. |

#### Contoh Request:
```json
{
  "feedback": "like"
}
```

### Success Response
- **Code:** 200 OK
- **Content:**
  ```json
  {
    "status": true,
    "message": "Feedback pesan berhasil diperbarui",
    "data": {
      "feedbackId": "uuid-balikan-db-xxx",
      "status": "like"
    }
  }
  ```

### Error Responses

#### Kasus: ID Pesan Tidak Ditemukan
- **Code:** 404 Not Found
- **Content:**
  ```json
  {
    "status": false,
    "message": "Pesan tidak ditemukan",
    "error": null
  }
  ```

#### Kasus: Format Feedback Tidak Sesuai
- **Code:** 400 Bad Request
- **Content:**
  ```json
  {
    "status": false,
    "message": "Field feedback harus bernilai 'like', 'dislike', atau 'none'",
    "error": null
  }
  ```
