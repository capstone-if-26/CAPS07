# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OJK Chatbot — an AI-powered chatbot for Indonesia's financial services authority (OJK). It helps users with financial literacy, fraud detection, consumer rights, credit checks, investment guidance, and reporting. Deployed at [caps-07.vercel.app](https://caps-07.vercel.app/).

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Jest (currently no tests; passes by default)
npx tsc --noEmit     # TypeScript type check

# Database (uses .env.local, not .env)
npx drizzle-kit generate   # Generate migration from schema changes
npx drizzle-kit migrate    # Apply migrations to DB
npx drizzle-kit studio     # Open Drizzle Studio UI
```

CI runs: `lint → tsc --noEmit → test → build` on every push/PR to `main`/`development`.

## Environment Variables

Copy `.env.example` to `.env.local` (drizzle.config.ts reads from `.env.local`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | NeonDB PostgreSQL (serverless) |
| `PINECONE_API_KEY` | Pinecone vector database |
| `PINECONE_INDEX_NAME` | Pinecone index name |
| `OPENROUTER_API_KEY` | LLM provider (OpenRouter) |
| `LLM_MODEL` | Main model name (e.g. `nvidia/nemotron-3-nano-30b-a3b:free`) |
| `ROUTING_LLM_MODEL` | Lightweight model for intent classification |
| `NEXT_PUBLIC_APP_URL` | App base URL |
| `RESEND_API_KEY` | Transactional email via Resend |

## Architecture

### Module Pattern

Business logic is split into feature modules under `modules/`. Each module follows:
- `repository.ts` — raw DB queries with Drizzle ORM
- `service.ts` — business logic that orchestrates repository + AI calls
- `type.ts` / `types.ts` — TypeScript types for that module

Modules: `auth`, `chats`, `dashboard`, `documents`, `messages`.

API routes in `app/api/` are thin — they parse the request, delegate to a service, and return the response. Route handlers do not contain business logic.

### Agentic RAG Pipeline (`lib/ai/`)

The core AI flow lives in `lib/ai/rag.ts`. When a user sends a question:

1. `createAgenticRagStream()` calls the LLM (via OpenRouter) with two tools:
   - `retrieve_policy_context` — vector search in Pinecone to pull relevant OJK document chunks
   - `ask_user_question` — forces a clarifying question back to the user (structured options)
2. The LLM can call these tools iteratively (up to 4 steps; 1 step if `ask_user_question` is forced).
3. The stream is piped through a `TransformStream` and emitted as **Server-Sent Events** (SSE) with custom event types: `task`, `text`, `source`, `question`.
4. After streaming finishes, `onFinish` persists the assistant message and triggers async: conversation summary update and intent classification.

**Memory model**: Each chat has `shortTermMemory` (last 10 messages from DB) and `longTermMemory` (compressed `chats.summary` string updated after each turn via `generateConversationSummary()`).

**Intent classification** (`lib/ai/intent.ts`): Uses `routingModel` (cheaper) to classify each question into one of 10 OJK-specific intents. Runs fire-and-forget after the stream finishes and updates `chats.intent`.

**Prompts** (`lib/ai/prompts.ts`): All system/user prompts are centralized here. `getAgenticRagPrompt()` is the main one.

### Document Ingestion Pipeline (`modules/documents/` + `lib/chunking/`)

Document upload is two-phase to avoid request timeouts:

- **Phase 1 (sync)**: Validate file → insert DB record with `processingStatus: "processing"` → return `202 Accepted` immediately.
- **Phase 2 (async)**: Next.js `after()` runs after response is sent — chunking + Pinecone upsert. Updates `processingStatus` to `"completed"` or `"failed"`.

**Chunker strategy** (selected by `documentType`):
- `legal_document` → `LegalRegexChunker` (PDF/DOCX)
- `faq` → `FAQRegexChunker` (PDF/DOCX)
- anything else → `AdaptiveSemanticChunker` (TXT/MD)

**Embedding**: Pinecone Inference API with `llama-text-embed-v2`. Each document gets its own Pinecone **namespace** (1:1 mapping with `documents.namespace`).

### Database (Drizzle + NeonDB)

Schema files in `lib/db/schema/`, re-exported via `lib/db/schema/index.ts`. Migration files in `lib/db/migrations/`. The `db` client uses `drizzle-orm/neon-http` (serverless HTTP driver, not connection pool).

Key schema notes:
- `chats.summary` — compressed long-term memory (plain text)
- `chats.intent` — classified OJK intent, used by dashboard analytics
- `chats.isResolved` — detected from LLM answer, used by dashboard
- `messages.parentMessage` — self-referencing FK for threaded replies
- `documents.namespace` — unique; maps 1:1 to Pinecone namespace

### Authentication (Better Auth)

`modules/auth/service.ts` exports `auth` (Better Auth instance). The catch-all `app/api/auth/[...all]/route.ts` delegates everything to `toNextJsHandler(auth)`. Email/password auth is enabled; email verification and password reset use Resend.

### API Endpoints Summary

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chats` | Start new chat → SSE stream |
| `GET` | `/api/chats/[id]` | Fetch chat message history |
| `POST` | `/api/chats/[id]` | Continue existing chat → SSE stream |
| `GET` | `/api/chats/[id]/messages` | Fetch messages (alternate) |
| `POST` | `/api/chats/[id]/summary` | Generate intent-based summary |
| `GET` | `/api/chats/[id]/quiz` | Generate quiz from conversation |
| `GET/POST` | `/api/documents` | List / upload documents |
| `GET/DELETE` | `/api/documents/[id]` | Get / delete document |
| `POST` | `/api/messages/[id]/feedback` | Submit like/dislike feedback |
| `GET` | `/api/dashboard/stats` | Analytics (completion rate, top intents, feedback) |
| `ALL` | `/api/auth/[...all]` | Better Auth handler |

### Guided Chat Flow (`lib/chatflow.ts`)

Static decision-tree flows for Quick Menu topics (legality checks, consumer rights, banking, SLIK, investment, financial literacy, complaint reporting). `getStep()` / `getResult()` are the main helpers. These run on the client side — not through the AI pipeline.

### Path Aliases

`@/*` maps to the repo root (e.g. `@/lib/db` → `./lib/db`).

### LLM Client (`lib/openrouter/`)

Two model instances exported:
- `model` — main answer generation model (set by `LLM_MODEL` env var)
- `routingModel` — lightweight classifier (set by `ROUTING_MODEL` env var, defaults to `openrouter/free`)

Both use the `@ai-sdk/openai` provider pointed at OpenRouter's base URL.
