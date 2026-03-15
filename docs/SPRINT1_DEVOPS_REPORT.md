# Laporan Sprint 1 — DevOps

**Proyek:** Chatbot Edukasi OJK  
**Tim:** CAPS07  
**Role:** System Architect / DevOps  
**Tanggal:** 15 Maret 2026

---

## Goal

Analisis kebutuhan dan uji coba arsitektur sistem untuk memastikan pilihan teknologi yang telah ditetapkan tim kompatibel, mengetahui batasan, kendala, dan kesiapan untuk development.

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
- Model untuk **production:** TBD — disarankan menggunakan model berbayar (mis. `google/gemini-flash-1.5`) karena model free tier rentan rate-limit
- Integrasi menggunakan `@ai-sdk/openai` dengan custom `baseURL` ke OpenRouter

### Database — Neon (PostgreSQL)

- Neon dibuat via Vercel Integration (bukan standalone) karena akun Neon terhubung ke Vercel
- Database name: `ojk-chatbot`
- Region: Singapore (ap-southeast-1) — dipilih karena paling dekat dari Indonesia
- PostgreSQL versi 17.8 terdeteksi aktif
- Branching untuk staging akan dikonfigurasi di Task 2

### Vector Database — Pinecone

- Index name: `ojk-chatbot`
- Dimensi: `1536` — sesuai model embedding `text-embedding-3-small`
- Metric: `cosine`
- Mode: Serverless
- Region: AWS ap-southeast-1 (Singapore)
- Index kosong (totalRecordCount: 0) — siap diisi embeddings di Sprint 2

### Hosting — Vercel

- Repo di-deploy dari organisasi GitHub `capstone-if-26`
- Deployment Protection dimatikan agar URL dapat diakses publik tanpa login Vercel
- Project name di Vercel: `caps-07`

---

## Kendala & Solusi

| Kendala                                                              | Solusi                                                           |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Model free tier OpenRouter sering rate-limit (429)                   | Ganti model, gunakan model berbayar di production                |
| Beberapa model free tier sudah tidak tersedia (404)                  | Cek ketersediaan model di openrouter.ai/models sebelum digunakan |
| Vercel Hobby plan tidak bisa deploy dari private GitHub organization | Repo dijadikan public oleh PM                                    |
| Neon tidak bisa buat project standalone (terhubung ke Vercel)        | Buat project via Vercel Storage Integration                      |
| Vercel otomatis mengaktifkan Deployment Protection                   | Dimatikan manual di Settings → Deployment Protection             |

---

## Catatan Penting untuk Sprint Berikutnya

- **Reset password Neon** sesegera mungkin — connection string sempat terekspos
- **Production harus pakai model berbayar** di OpenRouter — model free tier tidak reliable untuk production
- **Branching Neon** (staging vs production) perlu dikonfigurasi di Task 2
- **GitHub Student Pack** sedang pending review — jika disetujui, dapat digunakan untuk klaim domain gratis dan upgrade Vercel Pro

---

## Environment Variables yang Digunakan

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

> ⚠️ Nilai asli API key disimpan di password manager tim. Jangan pernah commit nilai asli ke repo.

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
- ✅ URL Production: `https://caps-07-[hash]-thutabalian30-6804s-projects.vercel.app`
- ✅ Tim siap melanjutkan ke Task 2 (Staging & Production Environment)
