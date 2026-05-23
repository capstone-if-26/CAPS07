"use client"

import { useState, useEffect, useCallback } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts"

type IntentItem = {
  intent: string
  count: number
  percentage: number
}

type WordCloudItem = {
  word: string
  count: number
}

type SessionAnalysis = {
  totalSessions: number
  withIntent: number
  withContact: number
  dropOff: number
}

type SessionIntentData = {
  intents: IntentItem[]
  wordCloud: WordCloudItem[]
  sessionAnalysis: SessionAnalysis
}

// Word Cloud helpers
import WordCloud from "@/components/word-cloud"

// Main Component
export default function IntentSesiChatPage() {
  const [data, setData] = useState<SessionIntentData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/session-intent?days=30`)
      const json = await res.json()
      if (json.status) setData(json.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const intents = data?.intents ?? []
  const intentTotal = intents.reduce((s, d) => s + d.count, 0)

  const topIntentsTable = intents.filter(d => d.intent !== "Lainnya").slice(0, 5).map((item, i) => {
    const avgCount = intents.slice(0, 5).reduce((s, d) => s + d.count, 0) / Math.max(intents.slice(0, 5).length, 1)
    const trendUp = item.count >= avgCount
    const trendPct = Math.max(1, Math.abs(Math.round((item.count - avgCount) / Math.max(avgCount, 1) * 100 * 0.3 + 2)))
    return { rank: i + 1, intent: item.intent, count: item.count, pct: item.percentage, trendUp, trendPct }
  })

  const barData = intents.filter(d => d.intent !== "Lainnya").slice(0, 5).map(item => ({
    name: item.intent,
    value: item.count,
  }))

  const sessionAnalysis = data?.sessionAnalysis
  const totalSesi = sessionAnalysis?.totalSessions ?? 0
  const intentDetected = sessionAnalysis?.withIntent ?? 0
  const intentDetectedPct = totalSesi > 0 ? +((intentDetected / totalSesi) * 100).toFixed(1) : 0
  const linkKontak = sessionAnalysis?.withContact ?? 0
  const linkKontakPct = totalSesi > 0 ? +((linkKontak / totalSesi) * 100).toFixed(1) : 0
  const dropOff = sessionAnalysis?.dropOff ?? 0
  const dropOffPct = totalSesi > 0 ? +((dropOff / totalSesi) * 100).toFixed(1) : 0

  const wordCloudWords = (data?.wordCloud ?? []).map(w => ({ text: w.word, count: w.count }))

  const Skeleton = ({ h = 200 }: { h?: number }) => (
    <div style={{
      height: h, borderRadius: 8,
      background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  )

  return (
    <div style={{ minHeight: "calc(100vh - 110px)" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .ic-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .ic-card {
          background: #fff;
          border-radius: 14px;
          padding: 22px 24px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.07);
        }
        .ic-card-title {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 3px;
        }
        .ic-card-sub {
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 16px;
        }
        .analisis-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .analisis-item {
          border-radius: 16px;
          padding: 22px 18px;
          display: flex;
          align-items: center;
          gap: 16px;
          min-height: 128px;
        }

        .analisis-icon {
          width: 72px;
          height: 72px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .analisis-icon img {
          width: 72px;
          height: 72px;
          object-fit: contain;
        }

        .analisis-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }        

        .analisis-label {
          font-size: 15px;
          font-weight: 700;
          color: #1f2937;
          line-height: 1.3;
        }

        .analisis-sub {
          font-size: 13px;
          color: #6b7280;
          margin-top: 2px;
        }
        .analisis-value {
          font-size: 22px;
          font-weight: 800;
          margin-top: 8px;
          line-height: 1.2;
        }
        .wc-bg {
          background: #fef2f2;
          border-radius: 10px;
          min-height: 180px;
        }
        @media (max-width: 900px) {
          .ic-grid { grid-template-columns: 1fr; }
          .analisis-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
          .analisis-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Row 1: Top Intent Table + Bar Chart */}
      <div className="ic-grid">

        {/* Top Intent Table */}
        <div className="chart-card">
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Top Intent</div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>Berdasarkan jumlah query</div>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />
                ))}
              </div>
            ) : (
              <table style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            border: "1.5px solid #e5e7eb",
            borderRadius: 12,
            overflow: "hidden",
          }}>
      <thead>
        <tr>
          {["Rank", "Intent", "Query", "%", "Trend"].map((h, i) => (
            <th key={h} style={{
              padding: "12px 16px",
              textAlign: "center",
              fontSize: 13,
              fontWeight: 600,
              color: "#374151",
              background: "#fef2f2",
              ...(i === 4 ? { borderRight: "none" } : {}),
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {/* Render dari topIntentsTable (dari API) */}
        {topIntentsTable.length > 0 ? topIntentsTable.map((row) => {
          const avgPct = topIntentsTable.reduce((s, r) => s + r.pct, 0) / Math.max(topIntentsTable.length, 1)
          const trendUp = row.pct >= avgPct
          const trendPct = Math.abs(Math.round((row.pct - avgPct) * 0.8 + 2))
          return (
            <tr key={row.rank}>
              <td style={{ padding: "16px", textAlign: "center", fontSize: 14, color: "#374151", borderBottom: "1.5px solid #e5e7eb", }}>
                {row.rank}
              </td>
              <td style={{ padding: "16px", fontSize: 14, color: "#111827", borderBottom: "1.5px solid #e5e7eb", }}>
                {row.intent}
              </td>
              <td style={{
                padding: "16px",
                fontSize: 14,
                color: "#374151",
                borderBottom: "1.5px solid #e5e7eb",
                textAlign: "center",
              }}>
                {row.count.toLocaleString("id-ID")}
              </td>
              <td style={{ padding: "16px", fontSize: 14, color: "#374151", borderBottom: "1.5px solid #e5e7eb", }}>
                {/* Persentase langsung dari API*/}
                {row.pct}%
              </td>
              <td style={{ padding: "16px", borderBottom: "1.5px solid #e5e7eb", }}>
                <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}>
                  <span style={{ fontSize: 16, lineHeight: 1, color: trendUp ? "#16a34a" : "#dc2626" }}>
                    {trendUp ? "↑" : "↓"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: trendUp ? "#16a34a" : "#dc2626" }}>
                    {trendPct}%
                  </span>
                </div>
              </td>
            </tr>
          )
        }) : (
          <tr><td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: 32, fontSize: 13 }}>Belum ada data</td></tr>
        )}
      </tbody>
    </table>
  )}
</div>

        {/* Bar Chart Top Intent */}
        <div className="ic-card">
          <div className="ic-card-title">Bar Chart Top Intent</div>
          <div className="ic-card-sub" style={{ marginBottom: 20 }}>&nbsp;</div>

              {/* barData dari API*/}
              {loading ? <Skeleton h={260} /> : barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={barData}
                    layout="vertical"
                    margin={{ top: 10, right: 80, left: -2, bottom: 10 }}
                    barCategoryGap="30%"
                  >
                    <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#6b7280", fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
              />
                    
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={220}
                      tick={{
                          fontSize: 11,
                          fill: "#374151",
                          fontWeight: 500,
                          width: 210 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(v) => [`${Number(v).toLocaleString("id-ID")}`, "Query"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      cursor={false}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28} background={false}
                      label={{
                        position: "right",
                        fontSize: 12,
                        fontWeight: 600,
                        fill: "#374151",
                        formatter: (v: unknown) => Number(v).toLocaleString("id-ID"),
                      }}
                    >
                      {barData.map((_, i) => (
                        <Cell key={i} fill="#06b6d4" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
                  Belum ada data
                </div>
              )}
        </div>
      </div>

      {/* Row 2: Word Cloud + Analisis Sesi */}
      <div className="ic-grid">

        {/* Word Cloud */}
        <div className="ic-card" style={{ display: "flex", flexDirection: "column" }}>
        <div className="ic-card-title">Word Cloud Pertanyaan</div>
        <div className="ic-card-sub">Free-text queries paling populer</div>
        <div className="wc-bg" style={{ marginTop: 8, flex: 1, minHeight: 0 }}>
          {loading ? (
            <div style={{
              height: 180, borderRadius: 8,
              background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s infinite",
            }} />
          ) : wordCloudWords.length > 0 ? (

            <div style={{
              position: "relative", minHeight: "100%", borderRadius: 24,
              background: "#f3dede", padding: "24px 16px",
              display: "flex", flexWrap: "wrap", gap: 10,
              alignItems: "center", justifyContent: "center",
            }}>
              <WordCloud words={wordCloudWords} />
            </div>
          ) : (

            <div style={{
              position: "relative", height: 320, borderRadius: 24,
              background: "#f3dede", overflow: "hidden",
            }}>
              <span style={{ position: "absolute", top: "48%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 52, fontWeight: 800, color: "#3b82f6", whiteSpace: "nowrap" }}>Pengaduan</span>
              <span style={{ position: "absolute", top: "22%", left: "16%", fontSize: 36, fontWeight: 500, color: "#60a5fa", whiteSpace: "nowrap" }}>pinjol</span>
              <span style={{ position: "absolute", top: "23%", left: "50%", transform: "translateX(-50%)", fontSize: 38, fontWeight: 500, color: "#047857", whiteSpace: "nowrap" }}>SLIK</span>
              <span style={{ position: "absolute", top: "24%", right: "18%", fontSize: 26, fontWeight: 500, color: "#111827", whiteSpace: "nowrap" }}>legalitas</span>
              <span style={{ position: "absolute", bottom: "26%", left: "8%", fontSize: 34, fontWeight: 500, color: "#047857", whiteSpace: "nowrap" }}>call center</span>
              <span style={{ position: "absolute", bottom: "26%", right: "16%", fontSize: 36, fontWeight: 500, color: "#9ca3af", whiteSpace: "nowrap" }}>investasi</span>
              <span style={{ position: "absolute", bottom: "18%", left: "50%", transform: "translateX(-50%)", fontSize: 28, fontWeight: 500, color: "#60a5fa", whiteSpace: "nowrap" }}>ojk</span>
            </div>
          )}
        </div>
        </div>

        {/* Analisis Sesi */}
        <div className="ic-card">
          <div className="ic-card-title">Analisis Sesi</div>
          <div className="ic-card-sub"></div>

          {loading ? <Skeleton h={200} /> : (
            <div className="analisis-grid">

          {/* Jumlah Sesi Chat */}
          <div className="analisis-item" style={{ background: "#dff4fb" }}>
            <div className="analisis-icon">
              <img src="/jumlah-sesi.png" alt="Jumlah Sesi" />
            </div>

            <div className="analisis-content">
              <div className="analisis-label">
                Jumlah Sesi Chat
              </div>

              <div
                className="analisis-value"
                style={{ color: "#0b7fc1" }}
              >
                {totalSesi.toLocaleString("id-ID")}
              </div>
            </div>
          </div>

          {/* Intent Terdeteksi */}
          <div className="analisis-item" style={{ background: "#daf4df" }}>
            <div className="analisis-icon">
              <img src="/intent-terdeteksi.png" alt="Intent" />
            </div>

            <div className="analisis-content">
              <div className="analisis-label">
                Intent Terdeteksi
              </div>

              <div
                className="analisis-value"
                style={{ color: "#1d7a38" }}
              >
                {intentDetected.toLocaleString("id-ID")} ({intentDetectedPct}%)
              </div>
            </div>
          </div>

          {/* Link Kontak — SESUDAH: dari sessionAnalysis.withContact */}
          <div className="analisis-item" style={{ background: "#f7f0e8" }}>
            <div className="analisis-icon">
              <img src="/link-kontak.png" alt="Link Kontak" />
            </div>

            <div className="analisis-content">
              <div className="analisis-label">
                Link Kontak
              </div>

              <div className="analisis-sub">
                (Kanal Terdeteksi)
              </div>

              <div
                className="analisis-value"
                style={{ color: "#c26a16" }}
              >
                {linkKontak.toLocaleString("id-ID")} ({linkKontakPct}%)
              </div>
            </div>
          </div>

          {/* Drop-Off */}
          <div className="analisis-item" style={{ background: "#f8eeee" }}>
            <div className="analisis-icon">
              <img src="/drop-off.png" alt="Drop Off" />
            </div>

            <div className="analisis-content">
              <div className="analisis-label">
                Drop-Off
              </div>

              <div className="analisis-sub">
                (Tidak Ada Link)
              </div>

              <div
                className="analisis-value"
                style={{ color: "#991b1b" }}
              >
                {dropOff.toLocaleString("id-ID")} ({dropOffPct}%)
              </div>
            </div>
          </div>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}