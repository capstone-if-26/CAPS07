"use client"

const WORD_COLORS = ["#8C0000", "#2563eb", "#16a34a", "#ca8a04", "#7c3aed", "#0891b2"]

export default function WordCloud({ words }: { words: { text: string; count: number }[] }) {
  if (words.length === 0) return (
    <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 13 }}>
      Belum ada data
    </div>
  )
  const max = Math.max(...words.map(w => w.count))
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 10,
      alignItems: "center", justifyContent: "center",
      padding: "24px 16px", minHeight: 180,
    }}>
      {words.slice(0, 20).map((w, i) => {
        const scale = 0.7 + (w.count / max) * 1.4
        return (
          <span key={i} style={{
            fontSize: Math.round(12 * scale),
            fontWeight: scale > 1.4 ? 800 : scale > 1 ? 700 : 500,
            color: WORD_COLORS[i % WORD_COLORS.length],
            cursor: "default",
            lineHeight: 1.4,
            transition: "opacity 0.2s",
          }}>
            {w.text}
          </span>
        )
      })}
    </div>
  )
}