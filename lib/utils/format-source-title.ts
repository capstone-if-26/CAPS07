const PREVIEW_MAX = 240

const CHUNK_TYPE_LABELS: Record<string, string> = {
  article: "Pasal / artikel",
  preambule: "Pembukaan",
  policy_clause: "Klausul kebijakan",
  qna_pair: "FAQ (tanya-jawab)",
  general_section: "Bagian dokumen",
  semantic_block: "Cuplikan semantik",
  concept_explanation: "Penjelasan konsep",
  article_body: "Isi pasal",
}

function labelChunkType(raw: string): string {
  const key = raw.trim().toLowerCase()
  return CHUNK_TYPE_LABELS[key] || raw.replace(/_/g, " ")
}

function normalizeWhitespace(s: string) {
  return s.replace(/\s+/g, " ").trim()
}

export type SourceTitleFields = {
  documentName: string
  sectionPath: string
  chunkType?: string
  chunkIndex?: number | string | null
  textPreview?: string
}

/**
 * Single citation line for UI + optional quoted excerpt from the retrieved chunk
 * so users can locate content when section_path is only a code (e.g. Q002).
 */
export function formatSourceListingLine(
  citation: string,
  fields: SourceTitleFields
): string {
  const doc = normalizeWhitespace(fields.documentName) || "Dokumen Internal OJK"
  const section = normalizeWhitespace(fields.sectionPath)
  const chunkType = normalizeWhitespace(fields.chunkType || "")
  const previewRaw = normalizeWhitespace(fields.textPreview || "")
  const preview =
    previewRaw.length > PREVIEW_MAX
      ? `${previewRaw.slice(0, PREVIEW_MAX)}…`
      : previewRaw

  const metaParts: string[] = []

  if (section && section !== "-") {
    if (section === "SEMANTIC_INFERRED") {
      metaParts.push("Letak: cuplikan semantik (tanpa hierarki pasal tetap di metadata)")
    } else if (/^Q\d+$/i.test(section)) {
      metaParts.push(`Entri FAQ: ${section}`)
    } else {
      metaParts.push(section)
    }
  }

  if (chunkType && chunkType !== "-" && chunkType !== "semantic_block") {
    metaParts.push(labelChunkType(chunkType))
  } else if (chunkType === "semantic_block" && section === "SEMANTIC_INFERRED") {
    metaParts.push(labelChunkType("semantic_block"))
  }

  const idx = fields.chunkIndex
  if (idx !== undefined && idx !== null && idx !== "") {
    metaParts.push(`Potongan ke-${idx}`)
  }

  const head = `${citation} ${doc}`
  const detail = metaParts.length > 0 ? ` — ${metaParts.join(" · ")}` : ""

  if (preview) {
    return `${head}${detail}\n"${preview}"`
  }

  return `${head}${detail}`
}
