# Dokumentasi API - OJK Chatbot (RAG Pipeline)

Dokumen ini memetakan seluruh API yang berada di bawah `/api/chats`, mulai dari level rute (endpoint) hingga eksekusi logic di level _Service_ (`modules/chats/service.ts`) dan _AI/RAG Core_ (`lib/ai/rag.ts`). 

Dokumentasi di bawah ini telah dilengkapi dengan contoh **Input** dan **Output** untuk masing-masing API.

---

## 1. Memulai Sesi Percakapan Baru (Agentic RAG)

**Endpoint:** `POST /api/chats`

Endpoint ini digunakan untuk memulai percakapan baru dengan AI menggunakan RAG Pipeline (Vercel AI SDK + Pinecone).

### Contoh Request (Input):
```json
{
  "question": "Apa saja syarat pembuatan dokumen reksa dana menurut peraturan terbaru OJK?"
}
```

### Contoh Response (Output - Server-Sent Events):
```text
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
x-chat-id: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d

data: {"type": "task", "status": "running", "title": "Mencari dokumen", "detail": "\"syarat dokumen reksa dana\""}
data: {"type": "task", "status": "done", "title": "Membaca dokumen"}
data: {"type": "task", "status": "running", "title": "Membuat jawaban"}
data: {"type": "text", "text": "Syarat "}
data: {"type": "text", "text": "pembuatan "}
...
```

### Alur Eksekusi:
1. **API Route**: Mengambil `question` dari _body_ dan mendapatkan `userId` melalui **Better Auth**. Mengembalikan respon SSE dan menyematkan Header `x-chat-id`.
2. **Service Layer**: Membuat record `Chat` dan `Message` awal (user) di database. Memanggil `buildAgenticStreamSession`.
3. **AI Core**: Mencari referensi dari Vector DB (Pinecone) via Tool `retrieve_policy_context`, menganalisa, dan melakukan _streaming_ kembali ke pengguna.

---

## 2. Melanjutkan Percakapan yang Ada (Reply)

**Endpoint:** `POST /api/chats/[chatId]`

Melanjutkan percakapan yang sudah ada, AI akan mempertimbangkan konteks percakapan (memori) sebelumnya.

### Contoh Request (Input):
```json
{
  "messages": [
    {
      "role": "user", 
      "content": "Bisa tolong jelaskan lebih spesifik mengenai pasal 5?"
    }
  ]
}
```

### Contoh Response (Output - Server-Sent Events):
```text
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
x-chat-id: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d

data: {"type": "task", "status": "running", "title": "Sedang berpikir"}
data: {"type": "text", "text": "Pada "}
data: {"type": "text", "text": "Pasal 5 "}
...
```

### Alur Eksekusi:
Sama dengan endpoint inisiasi percakapan baru, namun menyertakan data memori (Summary) dan 10 chat histori terakhir.

---

## 3. Mengambil Histori Percakapan

**Endpoint:** `GET /api/chats/[chatId]`

Mengambil seluruh histori pesan dari sebuah sesi chat.

### Contoh Request:
Tidak membutuhkan Body. ID disematkan pada parameter URL.

### Contoh Response (Output):
```json
{
  "status": true,
  "message": "Histori chat berhasil diambil",
  "data": {
    "chatId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "messages": [
      {
        "id": "c1f7a0b5-...",
        "chatId": "9b1deb4d-...",
        "senderType": "user",
        "content": "Apa saja syarat pembuatan dokumen reksa dana menurut peraturan terbaru OJK?",
        "modelName": null,
        "metadata": null,
        "createdAt": "2026-05-04T10:00:00.000Z",
        "updatedAt": "2026-05-04T10:00:00.000Z"
      },
      {
        "id": "d2f8b1c6-...",
        "chatId": "9b1deb4d-...",
        "senderType": "assistant",
        "content": "Syaratnya meliputi: 1. Dokumen A, 2. Dokumen B...",
        "modelName": "nvidia/nemotron-3-nano-30b-a3b:free",
        "metadata": "{\"matches\": [...] }",
        "createdAt": "2026-05-04T10:00:05.000Z",
        "updatedAt": "2026-05-04T10:00:05.000Z"
      }
    ]
  }
}
```

### Alur Eksekusi:
Menggunakan `getMessagesByChatId(chatId)` pada _repository layer_ untuk mengambil data histori secara _ascending_ berdasarkan waktu buat (`createdAt`).

---

## 4. Mengambil Detail Pesan Spesifik

**Endpoint:** `GET /api/chats/[messageId]/messages`

*Catatan: Parameter path pertama pada rute ini difungsikan sebagai `messageId` berdasarkan implementasi saat ini.*

### Contoh Request:
Tidak membutuhkan Body. Menggunakan `messageId` di URL.

### Contoh Response (Output):
```json
{
  "status": true,
  "message": "Pesan berhasil diambil",
  "data": {
    "message": {
      "id": "d2f8b1c6-...",
      "chatId": "9b1deb4d-...",
      "senderType": "assistant",
      "content": "Syaratnya meliputi: 1. Dokumen A, 2. Dokumen B...",
      "modelName": "nvidia/nemotron-3-nano-30b-a3b:free",
      "metadata": "{\"matches\": [...] }",
      "createdAt": "2026-05-04T10:00:05.000Z",
      "updatedAt": "2026-05-04T10:00:05.000Z"
    }
  }
}
```

---

## 5. Ringkasan Intent Percakapan (Topic Classification)

**Endpoint:** `POST /api/chats/[chatId]/summary`

Endpoint ini digunakan untuk mengklasifikasikan "Niat" (Intent) pengguna dan merangkum topik spesifik percakapan.

### Contoh Request (Input):
_(Input `messages` bersifat opsional, berguna jika data lokal frontend belum tersinkronisasi ke DB)_
```json
{
  "messages": [
    {
      "id": "c1f7a0b5-...",
      "role": "user",
      "content": "Saya ingin melaporkan kasus penipuan asuransi jiwa yang saya alami minggu lalu."
    }
  ]
}
```

### Contoh Response (Output):
```json
{
  "status": true,
  "message": "Ringkasan intent berhasil dibuat",
  "data": {
    "chatId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "intent": "Pengaduan",
    "summary": "Pengguna melaporkan adanya dugaan kasus penipuan terkait produk asuransi jiwa."
  }
}
```

### Alur Eksekusi:
Memanggil `classifyIntentAndRelevance` menggunakan Model LLM di AI Core, menghasilkan objek klasifikasi (contoh intent: `Pengaduan`, `Informasi`, `Lainnya`). Hasilnya dirangkum dan metadatanya disimpan kembali ke DB.

---

## 6. Membuat Kuis dari Konteks Percakapan

**Endpoint:** `GET /api/chats/[chatId]/quiz`

Menghasilkan kuis pilihan ganda berdasarkan seluruh isi percakapan yang telah berlangsung.

### Contoh Request:
Tidak membutuhkan Body. ID disematkan pada parameter URL.

### Contoh Response (Output):
```json
{
  "status": true,
  "message": "Quiz berhasil dibuat",
  "data": {
    "quiz": [
      {
        "question": "Apa yang harus dimiliki oleh pelapor untuk mendaftar iDebKu?",
        "options": [
          "Sumber daya manusia, struktur organisasi, perangkat komputer, dan persetujuan Otoritas Jasa Keuangan",
          "Akses ke data pribadi dan daftar kontak",
          "Bunga transparan maksimal 0,8%/hari",
          "Alamat kantor fisik yang jelas"
        ],
        "answer": "Sumber daya manusia, struktur organisasi, perangkat komputer, dan persetujuan Otoritas Jasa Keuangan",
        "reason": "Chatbot menyebutkan persyaratan...",
      },
      {
        "question": "Apa definisi fintech lending sesuai chat?",
        "options": [
          "Transaksi pinjam meminjam melalui sistem teknologi informasi tanpa pertemuan langsung",
          "Pinjaman dengan bunga tinggi dan dana terbatas",
          "Layanan keuangan yang tidak diawasi OJK",
          "Peminjaman melalui bank fisik dengan persetujuan langsung"
        ],
        "answer": "Transaksi pinjam meminjam melalui sistem teknologi informasi tanpa pertemuan langsung",
        "reason": "Chatbot menyebutkan persyaratan...",
      },
    ]
  }
}
```

### Alur Eksekusi:
Mengambil histori melalui `getMessagesByChatId`, melakukan `flattening` teks percakapan, kemudian menyuntikkan ke dalam Prompt khusus Kuis ke model LLM.
