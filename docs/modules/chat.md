# Dokumentasi API — Chats (Agentic RAG)

Dokumen ini memetakan endpoint percakapan (chat) yang menggunakan arsitektur **Agentic RAG Pipeline**. Pipeline ini memanfaatkan Vercel AI SDK dan Pinecone Vector DB untuk menghasilkan jawaban berbasis konteks, serta dapat menghasilkan output dinamis melalui *Tool Calls* yang di-*stream* menggunakan metode **Server-Sent Events (SSE)**.

---

## Format Response: Server-Sent Events (SSE)

Respon dari endpoint `/api/chats` dikembalikan sebagai *stream* menggunakan header:
```http
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
```
Setiap *chunk* diawali dengan prefix `data: ` diikuti oleh JSON string dari *Event Object*, dan diakhiri dengan dua baris baru (`\n\n`).

### Macam-Macam Event (AgenticRagStreamEvent)

Terdapat 4 format event yang mungkin diterima oleh client selama stream berlangsung:

#### 1. Task Event (`type: "task"`)
Mengindikasikan status proses atau *tool call* yang sedang berjalan di background. Digunakan untuk menampilkan indikator loading/langkah proses di UI.
```json
{
  "type": "task",
  "status": "running" | "done" | "error",
  "title": "Sedang berpikir",
  "detail": "\"kata kunci pencarian\"" // (Opsional)
}
```
**Contoh Title yang dihasilkan:**
- *Sedang berpikir* (Inisialisasi)
- *Mencari dokumen* (Saat tool `retrieve_policy_context` dipanggil)
- *Membaca dokumen* (Saat hasil dokumen ditemukan)
- *Menyiapkan pertanyaan* (Saat tool `ask_user_question` dipanggil)
- *Membuat jawaban* (Saat AI mulai merangkai teks akhir)

#### 2. Source Event (`type: "source"`)
Mengirimkan informasi dokumen referensi yang berhasil ditemukan dan sedang dibaca oleh AI. Event ini muncul setelah *Task: Mencari dokumen* selesai.
```json
{
  "type": "source",
  "source": {
    "title": "Peraturan OJK Nomor 1 Tahun 2026",
    "href": "#"
  }
}
```

#### 3. Text Event (`type: "text"`)
Mengirimkan potongan teks dari jawaban AI secara progresif (*streaming*). Client harus menggabungkan nilai `text` ini secara sekuensial.
```json
{
  "type": "text",
  "text": "Berdasarkan "
}
```

#### 4. Question Event (`type: "question"`)
**[SPECIAL TOOL CALL]** Dikirimkan ketika AI memutuskan bahwa ia tidak memiliki cukup konteks dan perlu **bertanya kembali kepada user**. Alih-alih memberikan jawaban teks, AI akan mengembalikan event ini yang berisi opsi interaktif.
```json
{
  "type": "question",
  "question": {
    "id": "q-12345678",
    "question": "Apakah Anda merujuk pada nasabah perorangan atau korporasi?",
    "options": [
      {
        "id": "opt-1",
        "label": "Perorangan"
      },
      {
        "id": "opt-2",
        "label": "Korporasi"
      }
    ],
    "customOptionLabel": "Lainnya (Ketikan sendiri)"
  }
}
```
*Catatan: Jika Event Question diterima, stream akan dihentikan (stop), dan client harus menampilkan UI Pilihan Ganda (Interactive Options) kepada user sebelum melanjutkan percakapan ke endpoint `POST /api/chats/[id]`.*

---

## Endpoint API

### 1. Inisiasi Percakapan Baru

**Endpoint:** `POST /api/chats`

Memulai sesi percakapan RAG baru.

#### Request:
```json
{
  "question": "Apa syarat pendaftaran lembaga fintech?"
}
```

#### Response Sukses (`200 OK` - SSE Stream):
```text
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
x-chat-id: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d

data: {"type":"task","status":"running","title":"Sedang berpikir"}

data: {"type":"task","status":"running","title":"Mencari dokumen","detail":"\"syarat daftar fintech\""}

data: {"type":"task","status":"done","title":"Membaca dokumen"}

data: {"type":"source","source":{"title":"POJK 10 - Fintech Lending","href":"#"}}

data: {"type":"task","status":"running","title":"Membuat jawaban"}

data: {"type":"text","text":"Syarat pendaftaran meliputi:\n1. ..."}
```
> Header `x-chat-id` disertakan pada respon awal. Client wajib menyimpan `chatId` ini untuk melanjutkan obrolan di masa mendatang.

---

### 2. Melanjutkan Percakapan (Reply)

**Endpoint:** `POST /api/chats/[id]`

Melanjutkan percakapan yang ada dengan ID `[id]`. Endpoint ini secara otomatis menyertakan histori memori dari chat tersebut.

#### Parameter:
- `id` (URL Parameter): ID percakapan (`chatId`).

#### Request:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Bisa jelaskan lebih rinci poin kedua?"
    }
  ]
}
```
*Catatan: Format request `messages` wajib berupa array object dengan minimal property `role` dan `content`.*

#### Response Sukses (`200 OK` - SSE Stream):
*(Format stream sama dengan POST /api/chats)*

---

### 3. Mengambil Detail & Histori Percakapan

**Endpoint:** `GET /api/chats/[id]`

Mengambil seluruh histori obrolan dari sesi tersebut berdasarkan ID.

#### Response Sukses (`200 OK`):
```json
{
  "status": true,
  "message": "Histori chat berhasil diambil",
  "data": {
    "chatId": "9b1deb4d-...",
    "messages": [
      {
        "id": "msg-1",
        "senderType": "user",
        "content": "Apa syarat pendaftaran lembaga fintech?",
        "createdAt": "2026-05-12T10:00:00Z"
      },
      {
        "id": "msg-2",
        "senderType": "assistant",
        "content": "Syarat pendaftaran meliputi...",
        "metadata": "{\"matches\": [...]}",
        "createdAt": "2026-05-12T10:00:15Z"
      }
    ]
  }
}
```

---

### 4. Ringkasan Topik & Intent (Summary)

**Endpoint:** `POST /api/chats/[id]/summary`

AI akan membaca memori chat dan mengklasifikasikan "Intent" serta membuat ringkasan singkat dari sesi tersebut.

#### Request (Opsional):
Bisa menyertakan `messages` array jika ada sinkronisasi lokal, jika tidak, sistem akan mengambil dari database.
```json
{}
```

#### Response Sukses (`200 OK`):
```json
{
  "status": true,
  "message": "Ringkasan intent berhasil dibuat",
  "data": {
    "chatId": "9b1deb4d-...",
    "intent": "Informasi Persyaratan",
    "summary": "Pengguna menanyakan informasi mengenai pendaftaran lembaga fintech."
  }
}
```

---

### 5. Membuat Kuis dari Konteks Chat

**Endpoint:** `GET /api/chats/[id]/quiz`

Menghasilkan soal pilihan ganda secara dinamis berdasarkan percakapan yang telah berlangsung.

#### Response Sukses (`200 OK`):
```json
{
  "status": true,
  "message": "Quiz berhasil dibuat",
  "data": {
    "quiz": [
      {
        "question": "Berapa lama masa berlaku izin fintech?",
        "options": ["1 Tahun", "5 Tahun", "Selamanya", "Tidak ada masa berlaku"],
        "answer": "Selamanya",
        "reason": "Berdasarkan penjelasan yang diberikan oleh AI di chat, izin fintech berlaku selamanya selama tidak ada pelanggaran."
      }
    ]
  }
}
```

---

## Ringkasan Tool Calls pada Agentic RAG

AI pada OJK Chatbot diperkuat dengan 2 *Tool* utama:

1. **`retrieve_policy_context`**: 
   - **Tujuan**: Mengambil informasi regulasi/dokumen relevan dari Vector DB (Pinecone).
   - **Trigger Event**: Men-trigger `task` event bertajuk *"Mencari dokumen"*.
2. **`ask_user_question`**: 
   - **Tujuan**: Memicu pertanyaan pilihan ganda yang diarahkan ke user saat informasi yang dibutuhkan kurang spesifik.
   - **Trigger Event**: Men-trigger `task` *"Menyiapkan pertanyaan"* dan langsung diikuti oleh `question` event. Mencegah AI untuk berhalusinasi dengan meminta kepastian dari user terlebih dahulu.
