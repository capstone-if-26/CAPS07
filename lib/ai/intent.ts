import { generateText } from 'ai';
import { model, routingModel } from '@/lib/openrouter';
import { stripSummaryMarkdownArtifacts } from '@/lib/format-plain-summary';
import { Chats } from '@/modules/chats/type';
import { readFile } from 'fs/promises';
import path from 'path';
import { getClassifyIntentAndRelevancePrompt, getGenerateIntentBasedSummaryPrompt } from './prompts';

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
  'edukasi tentang hak dan pelindungan konsumen di sektor jasa keuangan, termasuk jalur pengaduan melalui APPK/Kontak OJK 157': 'Hak Saya sebagai Konsumen',
  'panduan agar masyarakat terhindar dari investasi ilegal dan aset kripto yang tidak berizin, serta belajar mengenali entitas yang resmi diawasi OJK untuk aset keuangan digital dan kripto.': 'Panduan Investasi & Kripto Aman',
  'materi literasi keuangan umum agar masyarakat lebih paham produk, risiko, dan pengelolaan keuangan.': 'Literasi & Tips Keuangan',
  'cek apakah pinjaman online/fintech lending berizin atau ilegal, biasanya dengan merujuk ke daftar penyelenggara resmi OJK dan peringatan terhadap pinjol ilegal.': 'Cek Legalitas Pinjol/Investasi',
  'edukasi tentang pola-pola scam yang sering dipakai pelaku, termasuk penipuan digital, impersonation scam, dan modus investasi/kripto ilegal.': 'Kenali Modus Penipuan',
  'informasi dasar tentang produk perbankan seperti giro, tabungan, deposito, serta kredit/pembiayaan.': 'Panduan Produk Bank',
  'kanal khusus untuk laporan penipuan keuangan melalui Indonesia Anti-Scam Centre (IASC).': 'IASC — Anti-Scam Centre',
  'layanan pengaduan konsumen OJK melalui APPK/Kontak 157, termasuk telepon, WhatsApp, email, dan portal online; untuk kasus scam keuangan, laporan juga bisa diarahkan ke IASC.': 'Lapor Penipuan (OJK / IASC)',
  'pengecekan riwayat kredit/debitur atau iDeb melalui SLIK, yang digunakan lembaga jasa keuangan untuk menilai kelayakan kredit/pembiayaan.': 'Cek SLIK / Riwayat Kredit',
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
  const { systemPrompt, userPrompt } = getClassifyIntentAndRelevancePrompt(intentList, memoryText, question);

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

  const requiredPointsText = requiredPoints.length > 0
    ? requiredPoints.map((point) => `- ${point}`).join('\n')
    : '- Ringkasan percakapan utama';

  const { systemPrompt, userPrompt } = getGenerateIntentBasedSummaryPrompt(intent, requiredPointsText, conversation);

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
