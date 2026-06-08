"use client"

import { useState, useEffect } from "react"
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"

// Types
type PerformaSummary = {
  totalRequests: number
  avgResponseMs: number
  p50Ms: number
  p95Ms: number
  errorCount: number
  errorRate: number
}

type PerformaByEndpoint = {
  endpoint: string
  label: string
  totalRequests: number
  avgResponseMs: number
  p95Ms: number
  errorCount: number
  errorRate: number
}

type PerformaTrend = {
  period: string
  avgResponseMs: number
  requestCount: number
  errorCount: number
  errorRate: number
}

type PerformaData = {
  summary: PerformaSummary
  byEndpoint: PerformaByEndpoint[]
  trend: PerformaTrend[]
}

// Tick style
const tickStyle = { fontSize: 11, fill: "#374151", fontWeight: 500 }

// Custom tooltip
function CustomTooltip({ active, payload, label, suffix = "" }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  suffix?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 8, padding: "8px 12px", fontSize: 12,
      boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
    }}>
      <div style={{ color: "#6b7280", marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700, color: "#111827" }}>
        {payload[0].value.toLocaleString("id-ID")}{suffix}
      </div>
    </div>
  )
}

// Legend item
function LegendLine({ color, label, isBar }: { color: string; label: string; isBar?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, fontSize: 11.5, color: "#6b7280", fontWeight: 500 }}>
      {isBar ? (
        <div style={{ width: 14, height: 14, borderRadius: 3, background: color, flexShrink: 0 }} />
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
          {/* garis kiri */}
          <div style={{ width: 14, height: 2, background: color }} />
          {/* bulatan */}
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: color, border: `2px solid ${color}`,
            flexShrink: 0,
          }} />
          {/* garis kanan */}
          <div style={{ width: 14, height: 2, background: color }} />
        </div>
      )}
      <span>{label}</span>
    </div>
  )
}

// Main Component
export default function PerformaTeknis() {
  const [data, setData] = useState<PerformaData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/dashboard/performance?days=14")
        const json = await res.json()
        if (json.status) setData(json.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Derived dari API
  const summary = data?.summary
  const statCards = summary ? [
    { label: "Total Permintaan",        value: summary.totalRequests.toLocaleString("id-ID"),  sub: "Permintaan" },
    { label: "Rata-rata Waktu Respons", value: summary.avgResponseMs.toLocaleString("id-ID"), sub: "ms" },
    { label: "P50 Waktu Respon",        value: summary.p50Ms.toLocaleString("id-ID"),          sub: "ms" },
    { label: "P95 Waktu Respon",        value: summary.p95Ms.toLocaleString("id-ID"),          sub: "ms" },
    { label: "Jumlah Error",            value: summary.errorCount.toLocaleString("id-ID"),     sub: "Error" },
    { label: "Tingkat Error",           value: summary.errorRate.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), sub: "%" },
  ] : []

  const responseTimeTrend = (data?.trend ?? []).map(d => ({
    date: (() => {
      const dt = new Date(d.period)
      return isNaN(dt.getTime()) ? d.period : dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
    })(),
    value: d.avgResponseMs,
  }))

  const requestCountTrend = (data?.trend ?? []).map(d => ({
    date: (() => {
      const dt = new Date(d.period)
      return isNaN(dt.getTime()) ? d.period : dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
    })(),
    value: d.requestCount,
  }))

  const errorRateTrend = (data?.trend ?? []).map(d => ({
    date: (() => {
      const dt = new Date(d.period)
      return isNaN(dt.getTime()) ? d.period : dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
    })(),
    value: d.errorRate,
  }))

  const tableData = (data?.byEndpoint ?? []).map(ep => ({
    fitur: ep.label,
    totalPermintaan: ep.totalRequests,
    avgWaktu: `${ep.avgResponseMs.toLocaleString("id-ID")} ms`,
    avgWaktuDetik: `${(ep.avgResponseMs / 1000).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} detik`,
    p95Waktu: `${ep.p95Ms.toLocaleString("id-ID")} ms`,
    p95WaktuDetik: `${(ep.p95Ms / 1000).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} detik`,
    jumlahError: ep.errorCount,
    tingkatError: `${ep.errorRate.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
  }))

  const Skeleton = ({ h = 200 }: { h?: number }) => (
    <div style={{
      height: h, borderRadius: 8,
      background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
      backgroundSize: "200% 100%",
      animation: "pt-shimmer 1.4s infinite",
    }} />
  )

  return (

    <div style={{ width: "100%", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes pt-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        .pt-stat-row {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 14px;
            margin-bottom: 24px;
        }
        .pt-stat-card {
            background: #fff;
            border-radius: 12px;
            padding: 16px 18px 14px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.07);
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-height: 110px;
            justify-content: space-between;
        }
        .pt-stat-label { font-size: 12px; color: #6b7280; font-weight: 500; line-height: 1.4; height: 34px; overflow: hidden; }
        .pt-stat-value { font-size: 32px; font-weight: 700; color: #8C0000; line-height: 1; margin: 4px 0; }
        .pt-stat-sub   { font-size: 11px; color: #9ca3af; font-weight: 400; }

        .pt-charts-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-bottom: 24px;
        }

        .pt-charts-row-bottom {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-bottom: 24px;
        }

        .pt-chart-card {
            background: #fff;
            border-radius: 12px;
            padding: 20px 20px 16px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }
        .pt-chart-title {
            font-size: 14px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 12px;
        }

        /* Tabel */
        .pt-table-section {
            background: #fff;
            border-radius: 12px;
            padding: 20px 24px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }
        .pt-table-title {
            font-size: 16px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 16px;
        }
        .pt-table-scroll {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }
        .pt-table-wrap {
            width: 100%;
            min-width: 600px;
            border-collapse: separate;
            border-spacing: 0;
            border: 1.5px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
            font-size: 13px;
        }
        .pt-table-wrap th {
            padding: 12px 16px;
            text-align: center;
            font-size: 13px;
            font-weight: 600;
            color: #374151;
            background: #f3f4f6;
            border-bottom: 1.5px solid #e5e7eb;
        }
        .pt-table-wrap th:first-child { text-align: left; }
        .pt-table-wrap td {
            padding: 14px 16px;
            border-bottom: 1.5px solid #e5e7eb;
            color: #374151;
            font-size: 13px;
            vertical-align: middle;
            text-align: center;
        }
        .pt-table-wrap td:first-child { text-align: left; color: #111827; font-weight: 500; }
        .pt-table-wrap tr:last-child td { border-bottom: none; }
        .pt-table-wrap tr:hover td { background: #fafafa; }

        @media (max-width: 1100px) {
            .pt-stat-row { grid-template-columns: repeat(3, 1fr); }
            .pt-charts-row { grid-template-columns: 1fr; }
            .pt-charts-row-bottom { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
            .pt-stat-row { grid-template-columns: 1fr 1fr; }
            .pt-stat-value { font-size: 24px; }
            .pt-charts-row { gap: 10px; grid-template-columns: 1fr; }
            .pt-charts-row-bottom { grid-template-columns: 1fr; gap: 10px; }
            .pt-chart-card { overflow: hidden; padding: 14px 12px 12px; }
            .pt-table-section { padding: 16px 12px; overflow: hidden; }
            .pt-table-wrap th,
            .pt-table-wrap td { padding: 10px 10px; font-size: 11.5px; }
            .pt-table-wrap { min-width: 480px; }
        `}</style>

      {/* Stat cards */}
      <div className="pt-stat-row">
        {loading ? (
            [...Array(6)].map((_, i) => (
                <div key={i} className="pt-stat-card">
                <Skeleton h={70} />
                </div>
            ))
            ) : statCards.map((card, i) => (
            <div key={i} className="pt-stat-card">
                <div className="pt-stat-label">{card.label}</div>
                <div className="pt-stat-value">{card.value}</div>
                <div className="pt-stat-sub">{card.sub}</div>
            </div>
            ))}
      </div>

      {/* Baris 1: Chart waktu respons + Chart tingkat kegagalan */}
      <div className="pt-charts-row">

        {/* Chart 1: Tren rata-rata waktu respons */}
        <div className="pt-chart-card">
          <div className="pt-chart-title">Tren Rata-Rata Waktu Respons</div>
          <div style={{ width: "100%", overflowX: "auto" }}>
              <ResponsiveContainer width="100%" minWidth={300} height={300}>            <LineChart data={responseTimeTrend} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" vertical={false} />
              <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={false} interval={0} />
              <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} domain={[0, "auto"]} width={36} />
              <Tooltip content={<CustomTooltip suffix=" ms" />} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#2563eb" }} />
            </LineChart>
          </ResponsiveContainer>
          </div>
          <LegendLine color="#2563eb" label="Rata-Rata Waktu Merespon" />
        </div>

        {/* Chart 3: Tren tingkat kegagalan */}
        <div className="pt-chart-card">
          <div className="pt-chart-title">Tren Tingkat Kegagalan</div>
          <div style={{ width: "100%", overflowX: "auto" }}>
            <ResponsiveContainer width="100%" minWidth={300} height={300}>
            <LineChart data={errorRateTrend} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" vertical={false} />
              <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={false} interval={0} />
              <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, "auto"]} ticks={undefined} width={32} />
              <Tooltip content={<CustomTooltip suffix="%" />} />
              <Line type="monotone" dataKey="value" stroke="#dc2626" strokeWidth={2} dot={{ r: 3, fill: "#dc2626", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#dc2626" }} />
            </LineChart>
          </ResponsiveContainer>
          </div>
          <LegendLine color="#dc2626" label="Tren Tingkat Kegagalan" />
        </div>

      </div>

      {/* Baris 2: Chart jumlah permintaan + Tabel */}
      <div className="pt-charts-row-bottom">

        {/* Chart 2: Tren jumlah permintaan */}
        <div className="pt-chart-card">
          <div className="pt-chart-title">Tren Jumlah Permintaan</div>
          <div style={{ width: "100%", overflowX: "auto" }}>
            <ResponsiveContainer width="100%" minWidth={300} height={300}>
            <BarChart data={requestCountTrend} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" vertical={false} />
              <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={false} interval={0} />
              <YAxis tick={tickStyle} tickLine={false} axisLine={false} domain={[0, "auto"]} width={28} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#f97316" radius={[3, 3, 0, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
          </div>
          <LegendLine color="#f97316" label="Tren Jumlah Peminatan" isBar />
        </div>

        {/* Tabel kinerja per layanan */}
        <div className="pt-table-section">
          <div className="pt-table-title">Kinerja per Layanan</div>
          <div className="pt-table-scroll">
            <table className="pt-table-wrap">
              <thead>
                <tr>
                  <th>Fitur</th>
                  <th>Total Permintaan</th>
                  <th>Rata-rata Waktu Respons</th>
                  <th>P95 Waktu Respon</th>
                  <th>Jumlah Error</th>
                  <th>Tingkat Error (%)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: 32, fontSize: 13 }}><Skeleton h={40} /></td></tr>
                ) : tableData.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: 32, fontSize: 13 }}>Belum ada data</td></tr>
                ) : tableData.map((row, i) => (
                  <tr key={i}>
                    <td>{row.fitur}</td>
                    <td>{row.totalPermintaan}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{row.avgWaktu}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>({row.avgWaktuDetik})</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{row.p95Waktu}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>({row.p95WaktuDetik})</div>
                    </td>
                    <td>{row.jumlahError}</td>
                    <td style={{ color: "#dc2626", fontWeight: 600 }}>{row.tingkatError}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}