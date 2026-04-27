import { generateText } from 'ai';
import { model, routingModel } from '@/lib/openrouter';
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

function buildShortTermMemoryString(shortTermMemory: Chats[] | []): string {
  if (!shortTermMemory.length) {
    return 'Belum ada pesan terbaru.';
  }

  return shortTermMemory
    .map((message) => `${message.senderType ?? 'unknown'}: ${message.content ?? ''}`)
    .join('\n');
}

function heuristicClassification(question: string): IntentClassification {
  const q = question.toLowerCase();

  if (/(tabung|deposito|giro|kpr|kredit bank|produk bank)/.test(q)) {
    return {
      intent: 'Panduan Produk Bank',
      isOjkRelevant: true,
      confidence: 0.7,
      reason: 'Detected bank product keywords',
    };
  }

  if (/(slik|riwayat kredit|bi checking)/.test(q)) {
    return {
      intent: 'Cek SLIK / Riwayat Kredit',
      isOjkRelevant: true,
      confidence: 0.8,
      reason: 'Detected SLIK keywords',
    };
  }

  if (/(pinjol|pinjaman online|legalitas investasi|investasi legal)/.test(q)) {
    return {
      intent: 'Cek Legalitas Pinjol/Investasi',
      isOjkRelevant: true,
      confidence: 0.8,
      reason: 'Detected legality keywords',
    };
  }

  if (/(kripto|crypto|investasi aman|profil risiko)/.test(q)) {
    return {
      intent: 'Panduan Investasi & Kripto Aman',
      isOjkRelevant: true,
      confidence: 0.75,
      reason: 'Detected investment/crypto keywords',
    };
  }

  if (/(penipuan|scam|phishing|modus)/.test(q)) {
    return {
      intent: 'Kenali Modus Penipuan',
      isOjkRelevant: true,
      confidence: 0.7,
      reason: 'Detected fraud keywords',
    };
  }

  if (/(iasc|anti-scam|rekening tujuan|transfer tertipu)/.test(q)) {
    return {
      intent: 'IASC — Anti-Scam Centre',
      isOjkRelevant: true,
      confidence: 0.8,
      reason: 'Detected IASC keywords',
    };
  }

  if (/(hak konsumen|pengaduan|komplain|sengketa)/.test(q)) {
    return {
      intent: 'Hak Saya sebagai Konsumen',
      isOjkRelevant: true,
      confidence: 0.7,
      reason: 'Detected consumer rights keywords',
    };
  }

  if (/(literasi|tips keuangan|budget|anggaran)/.test(q)) {
    return {
      intent: 'Literasi & Tips Keuangan',
      isOjkRelevant: true,
      confidence: 0.65,
      reason: 'Detected financial literacy keywords',
    };
  }

  if (/(rumus|silinder|integral|fisika|coding|programming|game|anime|resep)/.test(q)) {
    return {
      intent: 'Lainnya',
      isOjkRelevant: false,
      confidence: 0.9,
      reason: 'Detected clearly out-of-domain topic',
    };
  }

  return {
    intent: 'Lainnya',
    isOjkRelevant: true,
    confidence: 0.4,
    reason: 'Fallback to general OJK assistant intent',
  };
}

export async function classifyIntentAndRelevance(
  question: string,
  shortTermMemory: Chats[] | []
): Promise<IntentClassification> {
  const memoryText = buildShortTermMemoryString(shortTermMemory);

  const systemPrompt = `You classify OJK chatbot user intent.

Return JSON only with this schema:
{
  "intent": "${OJK_INTENTS.join('" | "')}",
  "isOjkRelevant": boolean,
  "confidence": number,
  "reason": string
}

Rules:
- Mark isOjkRelevant=false only when the user request is clearly unrelated to OJK/financial consumer domain (e.g., math formula, coding, general science).
- General stories or casual chat should still be treated as relevant and mapped to "Lainnya".
- Choose exactly one intent from allowed values.`;

  const userPrompt = `Recent context:\n${memoryText}\n\nCurrent question:\n${question}`;

  try {
    const { text } = await generateText({
      model: routingModel,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.1,
      topP: 0.9,
    });

    const parsed = safeJsonParse(text) as Partial<IntentClassification>;

    const intent = OJK_INTENTS.includes(parsed.intent as OjkIntent)
      ? (parsed.intent as OjkIntent)
      : 'Lainnya';

    return {
      intent,
      isOjkRelevant: Boolean(parsed.isOjkRelevant),
      confidence: clampConfidence(Number(parsed.confidence)),
      reason: String(parsed.reason || 'No reason provided by classifier'),
    };
  } catch {
    return heuristicClassification(question);
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
- Output in Markdown.
- Keep only information explicitly present in the conversation.
- Do not invent missing details.
- If a required point is missing, skip it.
- Use bullet list format with bold point names.
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
Create markdown summary. Include only points that have evidence in the conversation.`;

  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.1,
      topP: 0.9,
    });

    const summary = text.trim();
    return summary || 'Ringkasan belum tersedia.';
  } catch {
    return 'Ringkasan belum dapat dibuat saat ini. Silakan coba lagi.';
  }
}

export function getOffTopicTemplate(): string {
  return OFF_TOPIC_TEMPLATE;
}
