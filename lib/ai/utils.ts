import { ScoredPineconeRecord, RecordMetadata } from '@pinecone-database/pinecone';
import { formatSourceListingLine } from '@/lib/format-source-title';
import { Chats } from '@/modules/chats/type';
import type {
  AgenticQuestion,
  AgenticRagStreamEvent,
  AgenticKnowledgeDocument,
  RetrievedMatch,
} from './type';

// ─── Namespace helpers ──────────────────────────────────────────────

export function normalizeNamespaces(values: string[]): string[] {
  return Array.from(new Set(values.map(v => v.trim()).filter(Boolean)));
}

// ─── Match helpers ──────────────────────────────────────────────────

export function dedupeMatches(matches: RetrievedMatch[]): RetrievedMatch[] {
  const byId = new Map<string, RetrievedMatch>();

  for (const match of matches) {
    const existing = byId.get(match.id);
    if (!existing || match.score > existing.score) {
      byId.set(match.id, match);
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.score - a.score);
}

// ─── Context formatting ────────────────────────────────────────────

export function formatRetrievedContext(
  matches: ScoredPineconeRecord<RecordMetadata>[],
  maxCharsPerChunk: number = 1800,
  citationIndexByChunkId?: Map<string, number>
): string {
  return matches
    .map((m, index) => {
      const md = m.metadata || {};
      const score = (m.score || 0).toFixed(4);

    const text = String(md.text || '').substring(0, maxCharsPerChunk);

      const sourceBits: string[] = [];

    const keysToExtract = ["document_name", "section_path", "chunk_type", "effective_date"];
    for (const key of keysToExtract) {
      if (md[key]) {
        sourceBits.push(`${key}=${md[key]}`);
      }
    }

    const citationNumber = citationIndexByChunkId?.get(m.id) || (index + 1);

    return `[${citationNumber}] score=${score}\nchunk_id=${m.id}\n${sourceBits.join(' | ')}\n${text}`;
  }).join('\n\n');
}

// ─── Reference appendix ────────────────────────────────────────────

export function buildReferenceAppendix(
  answerText: string,
  citationMatchMap: Map<number, RetrievedMatch>
): string {
  if (/(^|\n)Referensi\s*:/i.test(answerText) && /-\s*\[\d+\]/.test(answerText)) {
    return answerText;
  }

  const citationRegex = /\[(\d+)\]/g;
  const citedNumbers = new Set<number>();

  for (const match of answerText.matchAll(citationRegex)) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) {
      citedNumbers.add(parsed);
    }
  }

  const sortedCitations = Array.from(citedNumbers).sort((a, b) => a - b);
  if (sortedCitations.length === 0) {
    return answerText;
  }

  const referenceLines = sortedCitations
    .map((citationNumber) => {
      const match = citationMatchMap.get(citationNumber);
      if (!match) return null;

      const documentName = String(match.metadata.document_name || 'Dokumen Internal OJK');
      const sectionPath = String(match.metadata.section_path || '-');
      const chunkType = String(match.metadata.chunk_type || '-');

      return `- [${citationNumber}] ${documentName} | section: ${sectionPath} | type: ${chunkType}`;
    })
    .filter(Boolean)
    .join('\n');

  if (!referenceLines) {
    return answerText;
  }

  return `${answerText.trim()}\n\nReferensi:\n${referenceLines}`;
}

// ─── Catalog & memory formatting ────────────────────────────────────

export function buildDocsCatalog(docs: AgenticKnowledgeDocument[]): string {
  if (docs.length === 0) {
    return '- Belum ada dokumen yang terdaftar.';
  }

  return docs
    .map((doc, index) => {
      return `${index + 1}. namespace=${doc.namespace}\n   name=${doc.name}\n   description=${doc.description}`;
    })
    .join('\n');
}

export function buildShortTermMemoryString(shortTermMemory: Chats[] | []): string {
  if (!shortTermMemory.length) {
    return 'Belum ada pesan terbaru.';
  }

  return shortTermMemory
    .map((message) => `${message.senderType ?? 'unknown'}: ${message.content ?? ''}`)
    .join('\n');
}

// ─── Question tool helpers ──────────────────────────────────────────

export function shouldForceQuestionTool(question: string): boolean {
  const normalizedQuestion = question.toLowerCase();

  if (/^jawaban untuk pertanyaan\b/i.test(normalizedQuestion)) {
    return false;
  }

  const personalCasePattern =
    /\b(rekening saya|akun saya|uang saya|data saya|korban|kena tipu|kena penipuan|ditipu|tertipu|tipu|penipuan|scam|fraud|bodong|dibobol|uang hilang|hilang uang|rugi|kerugian|mau lapor|ingin lapor|bagaimana melapor|tidak tahu mau bagaimana|nggak tahu mau bagaimana|gak tahu mau bagaimana|tolong bantu|bantu saya|pinjol meneror|diteror|ancaman|transaksi mencurigakan|salah transfer)\b/i;
  const generalExplanationPattern =
    /\b(apa itu|jelaskan|definisi|contoh modus|tips|edukasi|literasi|peraturan|regulasi|pasal|syarat|prosedur umum)\b/i;

  return personalCasePattern.test(normalizedQuestion) && !generalExplanationPattern.test(normalizedQuestion);
}

export function createQuestionId(question: string): string {
  const slug = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);

  return `question-${slug || 'follow-up'}-${Date.now().toString(36)}`;
}

export function normalizeQuestionToolInput(input: unknown): AgenticQuestion | null {
  if (typeof input !== 'object' || input === null) return null;

  const value = input as {
    question?: unknown;
    options?: unknown;
    customOptionLabel?: unknown;
  };
  const question = String(value.question || '').trim();
  if (!question) return null;

  const options = Array.isArray(value.options)
    ? value.options
        .map((option, index) => ({
          id: `option-${index + 1}`,
          label: String(option || '').trim(),
        }))
        .filter((option) => option.label.length > 0)
        .slice(0, 4)
    : [];

  if (options.length === 0) return null;

  const customOptionLabel = String(value.customOptionLabel || 'Tulis jawaban kamu').trim();

  return {
    id: createQuestionId(question),
    question,
    options,
    customOptionLabel: customOptionLabel || 'Tulis jawaban kamu',
  };
}

// ─── SSE event formatting ───────────────────────────────────────────

const encoder = new TextEncoder();

export function formatAgenticEvent(event: AgenticRagStreamEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export function getToolQuery(input: unknown): string {
  if (typeof input === 'object' && input !== null && 'query' in input) {
    return String((input as { query?: unknown }).query || '');
  }

  return '';
}

export function getQuestionEvent(input: unknown): AgenticRagStreamEvent | null {
  const question = normalizeQuestionToolInput(input);
  if (!question) return null;

  return {
    type: 'question',
    question,
  };
}

export function getSourceEvents(output: unknown): AgenticRagStreamEvent[] {
  if (typeof output !== 'object' || output === null || !('sources' in output)) {
    return [];
  }

  const sources = (output as { sources?: unknown }).sources;
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources.flatMap((source) => {
    if (typeof source !== 'object' || source === null) return [];

    const item = source as {
      citation?: unknown;
      documentName?: unknown;
      sectionPath?: unknown;
      chunkType?: unknown;
      chunkIndex?: unknown;
      textPreview?: unknown;
    };
    const citation = String(item.citation || '');
    const documentName = String(item.documentName || 'Dokumen Internal OJK');
    const sectionPath = String(item.sectionPath || '');
    const chunkType = String(item.chunkType || '');
    const chunkIndex = item.chunkIndex;
    const textPreview = String(item.textPreview || '');

    return [{
      type: 'source' as const,
      source: {
        href: '#',
        title: formatSourceListingLine(citation, {
          documentName,
          sectionPath,
          chunkType,
          chunkIndex: chunkIndex as string | number | null | undefined,
          textPreview,
        }),
      },
    }];
  });
}
