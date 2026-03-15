# Architecture Decision Record — Sprint 1

## Stack

| Komponen           | Teknologi               | Alasan                                |
| ------------------ | ----------------------- | ------------------------------------- |
| Frontend + Backend | Next.js 16 (App Router) | Full-stack, streaming support         |
| AI Orchestration   | Vercel AI SDK           | Native streaming, tool calling        |
| LLM Provider       | OpenRouter              | Multi-model routing, free tier        |
| Relational DB      | Neon (PostgreSQL 17)    | Serverless, branching per environment |
| Vector DB          | Pinecone                | Managed, serverless, 1536-dim support |
| Hosting            | Vercel                  | Native Next.js, preview deployments   |

## Model LLM

- Development: `nvidia/nemotron-3-super-120b-a12b:free`
- Production: TBD — rekomendasikan model berbayar (mis. google/gemini-flash-1.5)

## Catatan & Kendala

- Model free tier OpenRouter rentan rate-limit (429) — production wajib pakai model berbayar
- Neon dibuat via Vercel integration (bukan standalone) — branching dikelola lewat Vercel dashboard
- Pinecone free tier: maks 1 index, 100k vectors — cukup untuk development dan demo

## Koneksi yang Sudah Diverifikasi

- [x] Next.js → Vercel AI SDK → OpenRouter → LLM response
- [x] Next.js → Neon PostgreSQL → query berhasil (PostgreSQL 17.8)
- [x] Next.js → Pinecone → index stats berhasil (dimension: 1536)

```

---

**6c. Hapus API route test** yang sudah tidak diperlukan setelah dokumentasi selesai:
- `app/api/health/route.ts` → boleh dihapus atau dibiarkan (berguna untuk monitoring nanti)
- `app/api/pinecone-health/route.ts` → sama

Untuk sekarang **biarkan saja** — berguna untuk Task 2 nanti saat verifikasi staging environment.

---

**6d. Commit semua perubahan ke repo:**
```

git add .
git commit -m "feat: task 1 - architecture analysis and service connections verified"
git push origin main
