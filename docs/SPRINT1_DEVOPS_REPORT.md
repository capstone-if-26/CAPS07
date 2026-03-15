# Laporan Sprint 1 — DevOps

**Proyek:** Chatbot Edukasi OJK  
**Tim:** CAPS07  
**Role:** System Architect / DevOps  
**Tanggal:** 15 Maret 2026

---

## Goal

Analisis kebutuhan dan uji coba arsitektur sistem untuk memastikan pilihan teknologi yang telah ditetapkan tim kompatibel dan siap digunakan untuk development.

---

## Stack yang Dianalisis

| Komponen           | Teknologi            | Versi  |
| ------------------ | -------------------- | ------ |
| Frontend + Backend | Next.js (App Router) | 16.1.6 |
| AI Orchestration   | Vercel AI SDK        | Latest |
| LLM Provider       | OpenRouter           | -      |
| Relational DB      | Neon (PostgreSQL)    | 17.8   |
| Vector DB          | Pinecone             | -      |
| Hosting            | Vercel               | -      |

---

## Hasil Verifikasi Koneksi

| Komponen                             | Status      | Keterangan                        |
| ------------------------------------ | ----------- | --------------------------------- |
| Next.js → Vercel AI SDK → OpenRouter | ✅ Berhasil | Response streaming berfungsi      |
| Next.js → Neon PostgreSQL            | ✅ Berhasil | Query `SELECT version()` berhasil |
| Next.js → Pinecone Vector DB         | ✅ Berhasil | Index stats berhasil diambil      |
| Deploy ke Vercel                     | ✅ Berhasil | URL public dapat diakses          |

---

## Keputusan Arsitektur

### LLM Provider — OpenRouter

- OpenRouter dipilih sebagai gateway LLM karena mendukung multi-model routing
- Model untuk **development:** `nvidia/nemotron-3-super-120b-a12b:free`
- Model untuk **production:** disarankan menggunakan model berbayar (mis. `google/gemini-flash-1.5`)
- Integrasi menggunakan `@ai-sdk/openai` dengan custom `baseURL` ke OpenRouter

### Database — Neon (PostgreSQL)

- Database name: `ojk-chatbot`
- Region: Singapore (ap-southeast-1)
- PostgreSQL versi 17.8 aktif dan terkoneksi

### Vector Database — Pinecone

- Index name: `ojk-chatbot`
- Dimensi: `1536` — sesuai model embedding `text-embedding-3-small`
- Metric: `cosine`, Mode: Serverless
- Region: AWS ap-southeast-1 (Singapore)
- Index siap diisi embeddings di Sprint 2

### Hosting — Vercel

- Repo di-deploy dari organisasi GitHub `capstone-if-26`
- Project name di Vercel: `caps-07`

---

## Environment Variables

```env
# LLM Provider
OPENROUTER_API_KEY=*****
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free

# Database (Neon PostgreSQL)
DATABASE_URL=*****

# Vector Database (Pinecone)
PINECONE_API_KEY=*****
PINECONE_INDEX_NAME=ojk-chatbot

# App
NEXT_PUBLIC_APP_ENV=production
```

---

## File yang Ditambahkan ke Repo

| File                               | Keterangan                                      |
| ---------------------------------- | ----------------------------------------------- |
| `.env.example`                     | Template environment variables tanpa nilai asli |
| `app/api/chat/route.ts`            | API route untuk chat dengan LLM via OpenRouter  |
| `app/api/health/route.ts`          | API route untuk test koneksi Neon PostgreSQL    |
| `app/api/pinecone-health/route.ts` | API route untuk test koneksi Pinecone           |
| `docs/SPRINT1_DEVOPS_REPORT.md`    | Laporan ini                                     |

---

## Output Sprint 1

- ✅ Semua komponen stack sudah diverifikasi kompatibel
- ✅ Koneksi ke semua service berhasil (OpenRouter, Neon, Pinecone)
- ✅ Aplikasi berhasil di-deploy ke Vercel dan dapat diakses publik
- ✅ URL Production: https://caps-07-61ch07myn-thutabalian30-6804s-projects.vercel.app
- ✅ Tim siap melanjutkan ke Task 2 (Staging & Production Environment)
