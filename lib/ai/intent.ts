import { generateText } from 'ai';
import { model, routingModel } from '@/lib/openrouter';
import { stripSummaryMarkdownArtifacts } from '@/lib/format-plain-summary';
import { Chats } from '@/modules/chats/type';
import { readFile } from 'fs/promises';
import path from 'path';

export const OJK_INTENTS = [
  'Cek Legalitas Pinjol/Investasi',
  'Lapor Penipuan (OJK / IASC)',
  'Kenali Modus Penipuan',
  'Cek SLIK / Riwayat Kredit',
  'IASC — Anti-Scam Centre',
  'Panduan Produk Bank',
  'Hak Saya sebagai Konsumen',
  'Panduan Investasi & Kripto Aman',
  'Literasi & Tips Keuangan',
  'Lainnya',
] as const;

export type OjkIntent = (typeof OJK_INTENTS)[number];

export type IntentClassification = {
  intent: OjkIntent;
  isOjkRelevant: boolean;
  confidence: number;
  reason: string;
};

type IntentRequirementsMap = Record<OjkIntent, string[]>;

const OFF_TOPIC_TEMPLATE = 'Maaf, saya hanya dapat membantu pertanyaan yang relevan dengan OJK, layanan keuangan, perlindungan konsumen, perbankan, investasi, pinjol, SLIK, dan penipuan keuangan. Silakan ajukan pertanyaan yang terkait topik tersebut.';

const SUMMARY_HEADING_TO_INTENT: Record<string, OjkIntent> = {
  'hak konsumen': 'Hak Saya sebagai Konsumen',
  'investasi dan kripto aman': 'Panduan Investasi & Kripto Aman',
  'literasi keuangan': 'Literasi & Tips Keuangan',
  'legalitas pinjol': 'Cek Legalitas Pinjol/Investasi',
  'modus penipuan': 'Kenali Modus Penipuan',
  'produk bank': 'Panduan Produk Bank',
  'penipuan (iasc)': 'IASC — Anti-Scam Centre',
  'pengaduan konsumen': 'Lapor Penipuan (OJK / IASC)',
  'cek slik': 'Cek SLIK / Riwayat Kredit',
};

let cachedRequirements: IntentRequirementsMap | null = null;

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeJsonParse(raw: string): unknown {
  const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

function inferIntentFromText(text: string): OjkIntent | null {
  const normalized = normalizeKey(text);

  if (/\b(slik|riwayat kredit|ideb|kolektibilitas|skor kredit)\b/.test(normalized)) {
    return 'Cek SLIK / Riwayat Kredit';
  }

  if (/\b(produk bank|panduan produk bank|tabungan|giro|deposito|kredit|kpr|perbankan)\b/.test(normalized)) {
    return 'Panduan Produk Bank';
  }

  if (/\b(legalitas|legal|terdaftar ojk|pinjol ilegal|investasi bodong|cek pinjol|cek investasi)\b/.test(normalized)) {
    return 'Cek Legalitas Pinjol/Investasi';
  }

  if (/\b(iasc|anti-scam centre|anti scam centre)\b/.test(normalized)) {
    return 'IASC — Anti-Scam Centre';
  }

  if (/\b(kena tipu|ditipu|tertipu|lapor penipuan|mau lapor|pengaduan penipuan|korban penipuan)\b/.test(normalized)) {
    return 'Lapor Penipuan (OJK / IASC)';
  }

  if (/\b(modus|ciri-ciri penipuan|cara kerja penipuan|menghindari penipuan|tips keamanan)\b/.test(normalized)) {
    return 'Kenali Modus Penipuan';
  }

  if (/\b(hak konsumen|perlindungan konsumen|pelanggaran|jalur pengaduan|pengaduan konsumen)\b/.test(normalized)) {
    return 'Hak Saya sebagai Konsumen';
  }

  if (/\b(investasi|kripto|crypto|saham|reksa dana|risiko investasi)\b/.test(normalized)) {
    return 'Panduan Investasi & Kripto Aman';
  }

  if (/\b(literasi|tips keuangan|edukasi keuangan|keuangan harian|menabung|anggaran)\b/.test(normalized)) {
    return 'Literasi & Tips Keuangan';
  }

  return null;
}

/** Keep classifier prompt small for latency (last turns only). */
const INTENT_CONTEXT_TURNS = 4;

function buildShortTermMemoryString(shortTermMemory: Chats[] | []): string {
  if (!shortTermMemory.length) {
    return 'Belum ada pesan terbaru.';
  }

  const recent = shortTermMemory.slice(-INTENT_CONTEXT_TURNS);

  return recent
    .map((message) => `${message.senderType ?? 'unknown'}: ${message.content ?? ''}`)
    .join('\n');
}

function intentClassifierFallback(): IntentClassification {
  return {
    intent: 'Lainnya',
    isOjkRelevant: true,
    confidence: 0,
    reason: 'Intent classifier request failed; defaulting to in-domain',
  };
}

export async function classifyIntentAndRelevance(
  question: string,
  shortTermMemory: Chats[] | []
): Promise<IntentClassification> {
  const memoryText = buildShortTermMemoryString(shortTermMemory);
  const inferredIntent = inferIntentFromText(`${memoryText}\n${question}`);

  const intentList = OJK_INTENTS.join(' | ');

  const systemPrompt = `OJK/financial consumer chatbot — classify conversation intent for summary generation only. Output JSON only, no markdown.
Schema: {"intent":string,"isOjkRelevant":boolean,"confidence":number,"reason":string}
intent must be exactly one of: ${intentList}
reason: at most 6 words.
Rules:
- Use the full context and latest user question.
- Bias isOjkRelevant=true for money, scams, tipu, banks, consumers, vague problems that may involve finance.
- false only for obvious off-topic (school math, coding tutorials, games/anime, recipes).
- Short follow-ups stay relevant if the thread is financial.
- If the user is a victim, needs help after being scammed, wants to report fraud, asks what to do after "kena tipu", or describes a personal fraud/complaint case, choose "Lapor Penipuan (OJK / IASC)".
- Choose "IASC — Anti-Scam Centre" only when the conversation explicitly asks about IASC/Indonesia Anti-Scam Centre itself or requirements/status for that channel.
- Choose "Kenali Modus Penipuan" for education about scam patterns, examples, prevention, or general explanation without an active personal case.`;

  const userPrompt = `Context:\n${memoryText}\n\nQuestion:\n${question}`;

  try {
    const { text } = await generateText({
      model: routingModel,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0,
      maxOutputTokens: 96,
    });

    const parsed = safeJsonParse(text) as Partial<IntentClassification>;

    const modelIntent = OJK_INTENTS.includes(parsed.intent as OjkIntent)
      ? (parsed.intent as OjkIntent)
      : 'Lainnya';
    const intent = inferredIntent || modelIntent;

    const rawRelevant = parsed.isOjkRelevant;
    const isOjkRelevant =
      typeof rawRelevant === 'boolean' ? rawRelevant : true;

    return {
      intent,
      isOjkRelevant,
      confidence: clampConfidence(Number(parsed.confidence)),
      reason: String(parsed.reason || 'No reason provided by classifier'),
    };
  } catch {
    const fallback = intentClassifierFallback();
    return inferredIntent ? { ...fallback, intent: inferredIntent, confidence: 0.6, reason: 'Heuristic intent match' } : fallback;
  }
}

function parseRequirementsMarkdown(markdown: string): IntentRequirementsMap {
  const result: IntentRequirementsMap = {
    'Cek Legalitas Pinjol/Investasi': [],
    'Lapor Penipuan (OJK / IASC)': [],
    'Kenali Modus Penipuan': [],
    'Cek SLIK / Riwayat Kredit': [],
    'IASC — Anti-Scam Centre': [],
    'Panduan Produk Bank': [],
    'Hak Saya sebagai Konsumen': [],
    'Panduan Investasi & Kripto Aman': [],
    'Literasi & Tips Keuangan': [],
    'Lainnya': [],
  };

  const lines = markdown.split(/\r?\n/).map((line) => line.trim());
  let currentIntent: OjkIntent | null = null;

  for (const line of lines) {
    if (!line) continue;

    const headingMatch = line.match(/^Intent\s+(.+?)(?::)?$/i);
    if (headingMatch) {
      const headingName = normalizeKey(headingMatch[1]);
      currentIntent = SUMMARY_HEADING_TO_INTENT[headingName] || null;
      continue;
    }

    if (currentIntent) {
      result[currentIntent].push(line);
    }
  }

  return result;
}

async function loadIntentRequirements(): Promise<IntentRequirementsMap> {
  if (cachedRequirements) return cachedRequirements;

  try {
    const filePath = path.join(process.cwd(), 'RANGKUMAN_REQ.md');
    const markdown = await readFile(filePath, 'utf8');
    cachedRequirements = parseRequirementsMarkdown(markdown);
    return cachedRequirements;
  } catch {
    cachedRequirements = {
      'Cek Legalitas Pinjol/Investasi': ['Nama platform', 'Status legalitas', 'Risiko', 'Langkah verifikasi'],
      'Lapor Penipuan (OJK / IASC)': ['Kronologi kejadian', 'Risiko', 'Tindakan mendesak', 'Channel resmi'],
      'Kenali Modus Penipuan': ['Jenis modus', 'Cara kerja', 'Cara menghindari', 'Arah tindakan'],
      'Cek SLIK / Riwayat Kredit': ['Status kredit', 'Dampak', 'Solusi', 'Cara akses'],
      'IASC — Anti-Scam Centre': ['Kronologi kejadian', 'Status transaksi', 'Dokumen yang diperlukan', 'Channel resmi'],
      'Panduan Produk Bank': ['Jenis produk', 'Perbedaan', 'Manfaat', 'Risiko'],
      'Hak Saya sebagai Konsumen': ['Jenis hak', 'Dasar hukum', 'Pelanggaran', 'Jalur pelaporan'],
      'Panduan Investasi & Kripto Aman': ['Instrumen', 'Risiko', 'Legalitas', 'Prinsip aman'],
      'Literasi & Tips Keuangan': ['Topik', 'Konsep utama', 'Manfaat', 'Tips'],
      'Lainnya': [],
    };

    return cachedRequirements;
  }
}

export async function getIntentRequirements(intent: OjkIntent): Promise<string[]> {
  const requirements = await loadIntentRequirements();
  return requirements[intent] || [];
}

function ensureRequiredSummaryPoints(summary: string, requiredPoints: string[]): string {
  if (requiredPoints.length === 0) {
    return summary;
  }

  const existing = summary.trim();
  const missingPoints = requiredPoints.filter((point) => {
    const escapedPoint = point.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(`(^|\\n)\\s*-?\\s*${escapedPoint}\\s*:`, 'i').test(existing);
  });

  if (missingPoints.length === 0) {
    return existing;
  }

  const additions = missingPoints
    .map((point) => `- ${point}: Tidak dibahas dalam percakapan.`)
    .join('\n');

  return existing ? `${existing}\n${additions}` : additions;
}

export async function generateIntentBasedSummary(
  intent: OjkIntent,
  conversation: string
): Promise<string> {
  const requiredPoints = await getIntentRequirements(intent);

  if (!conversation.trim()) {
    return 'Belum ada percakapan yang dapat dirangkum.';
  }

  const systemPrompt = `You generate concise Indonesian summaries for OJK chatbot conversations.

Rules:
- Output plain text only. No Markdown: no **, __, # headings, backticks, or link syntax.
- You may use simple line breaks. For lists, use a hyphen and space at the start of each line (e.g. "- Poin: teks").
- Keep only information explicitly present in the conversation.
- Do not invent missing details. If a required point is not present, still include that point and write "Tidak dibahas dalam percakapan."
- Include every required summary point exactly once. Do not skip any required point.
- Start each required point with its label, for example "- Jenis produk: ...".
- Do not put labels in quotes for emphasis; write normally.
- Keep it practical and concise.`;

  const requiredPointsText = requiredPoints.length > 0
    ? requiredPoints.map((point) => `- ${point}`).join('\n')
    : '- Ringkasan percakapan utama';

  const userPrompt = `Intent: ${intent}

Required summary points for this intent:
${requiredPointsText}

Conversation:
${conversation}

Instruction:
Write the summary in plain Indonesian text only. Include every required point above, in the same order. If there is no evidence for a point, write "Tidak dibahas dalam percakapan." for that point.`;

  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.1,
      topP: 0.9,
    });

    const summary = stripSummaryMarkdownArtifacts(text.trim());
    const completeSummary = ensureRequiredSummaryPoints(summary, requiredPoints);
    return completeSummary || 'Ringkasan belum tersedia.';
  } catch {
    return 'Ringkasan belum dapat dibuat saat ini. Silakan coba lagi.';
  }
}

export function getOffTopicTemplate(): string {
  return OFF_TOPIC_TEMPLATE;
}
