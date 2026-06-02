"use client"

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts"

// ── Dummy Data ────────────────────────────────────────────────────────────────

const DUMMY_RESPONSE_TIME = [
  { date: "1 Okt", value: 1200 },
  { date: "6 Okt", value: 1100 },
  { date: "11 Okt", value: 1350 },
  { date: "16 Okt", value: 1050 },
  { date: "21 Okt", value: 1180 },
  { date: "26 Okt", value: 1300 },
  { date: "30 Okt", value: 1240 },
]

const DUMMY_REQUEST_COUNT = [
  { date: "1 Okt",  value: 28 },
  { date: "3 Okt",  value: 32 },
  { date: "5 Okt",  value: 30 },
  { date: "7 Okt",  value: 35 },
  { date: "9 Okt",  value: 38 },
  { date: "11 Okt", value: 50 },
  { date: "13 Okt", value: 42 },
  { date: "15 Okt", value: 38 },
  { date: "17 Okt", value: 45 },
  { date: "19 Okt", value: 40 },
  { date: "21 Okt", value: 36 },
  { date: "23 Okt", value: 30 },
  { date: "25 Okt", value: 42 },
  { date: "27 Okt", value: 35 },
  { date: "30 Okt", value: 32 },
]

const DUMMY_ERROR_RATE = [
  { date: "1 Okt",  value: 2.1 },
  { date: "6 Okt",  value: 1.8 },
  { date: "11 Okt", value: 5.0 },
  { date: "16 Okt", value: 2.5 },
  { date: "18 Okt", value: 3.2 },
  { date: "21 Okt", value: 2.8 },
  { date: "23 Okt", value: 3.0 },
  { date: "26 Okt", value: 2.9 },
  { date: "28 Okt", value: 3.1 },
  { date: "30 Okt", value: 2.8 },
]

const DUMMY_STAT_CARDS = [
  { label: "Total Permintaan", value: "318",   sub: "Permintaan", color: "#8C0000" },
  { label: "Rata-rata Waktu Respons", value: "1,240", sub: "ms", color: "#8C0000" },
  { label: "P50 Waktu Respon", value: "980",   sub: "ms", color: "#8C0000" },
  { label: "P95 Waktu Respon", value: "3,850", sub: "ms", color: "#8C0000" },
  { label: "Jumlah Error",     value: "7",     sub: "Error", color: "#8C0000" },
  { label: "Tingkat Error",    value: "2.20",  sub: "%", color: "#8C0000" },
]

const DUMMY_TABLE = [
  {
    fitur: "Chat Baru",
    totalPermintaan: 142,
    avgWaktu: "1,580 ms",
    avgWaktuDetik: "1.58 detik",
    p95Waktu: "4,200 ms",
    p95WaktuDetik: "4.20 detik",
    jumlahError: 3,
    tingkatError: "2.11%",
  },
  {
    fitur: "Chat Lanjutan",
    totalPermintaan: 98,
    avgWaktu: "1,320 ms",
    avgWaktuDetik: "1.32 detik",
    p95Waktu: "3,600 ms",
    p95WaktuDetik: "3.60 detik",
    jumlahError: 2,
    tingkatError: "2.04%",
  },
  {
    fitur: "Kuis",
    totalPermintaan: 44,
    avgWaktu: "920 ms",
    avgWaktuDetik: "0.9 detik",
    p95Waktu: "2,100 ms",
    p95WaktuDetik: "2.10 detik",
    jumlahError: 1,
    tingkatError: "2.27%",
  },
  {
    fitur: "Chat Lanjutan",
    totalPermintaan: 34,
    avgWaktu: "740 ms",
    avgWaktuDetik: "0.7 detik",
    p95Waktu: "1,800 ms",
    p95WaktuDetik: "1.80 detik",
    jumlahError: 1,
    tingkatError: "2.94%",
  },
]

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
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

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PerformaTeknis() {
  return (
    <div style={{ width: "100%", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
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
        .pt-stat-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
          line-height: 1.4;
        }
        .pt-stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #8C0000;
          line-height: 1;
          margin: 4px 0;
        }
        .pt-stat-sub {
          font-size: 11px;
          color: #9ca3af;
          font-weight: 400;
        }
        .pt-charts-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
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
          margin-bottom: 16px;
        }
        .pt-chart-legend {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          font-size: 11.5px;
          color: #6b7280;
          font-weight: 500;
        }
        .pt-legend-line {
          width: 28px;
          height: 2px;
          border-radius: 2px;
        }
        .pt-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
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
        .pt-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .pt-table th {
          padding: 12px 16px;
          text-align: center;
          font-size: 12.5px;
          font-weight: 600;
          color: #374151;
          background: #f9fafb;
          border-bottom: 1.5px solid #e5e7eb;
          border-top: 1.5px solid #e5e7eb;
        }
        .pt-table th:first-child { text-align: left; }
        .pt-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
          font-size: 13px;
          vertical-align: middle;
          text-align: center;
        }
        .pt-table td:first-child { text-align: left; color: #111827; font-weight: 500; }
        .pt-table tr:last-child td { border-bottom: none; }
        .pt-table tr:hover td { background: #fafafa; }

        @media (max-width: 1100px) {
          .pt-stat-row { grid-template-columns: repeat(3, 1fr); }
          .pt-charts-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .pt-stat-row { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* Stat Cards */}
      <div className="pt-stat-row">
        {DUMMY_STAT_CARDS.map((card, i) => (
          <div key={i} className="pt-stat-card">
            <div className="pt-stat-label">{card.label}</div>
            <div className="pt-stat-value">{card.value}</div>
            <div className="pt-stat-sub">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* 3 Charts Row */}
      <div className="pt-charts-row">

        {/* Chart 1: Tren Rata-Rata Waktu Respons */}
        <div className="pt-chart-card">
          <div className="pt-chart-title">Tren Rata-Rata Waktu Respons</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={DUMMY_RESPONSE_TIME} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}K`}
                domain={[0, 5000]}
                ticks={[0, 1000, 2000, 3000, 4000, 5000]}
              />
              <Tooltip content={<CustomTooltip suffix=" ms" />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3, fill: "#2563eb" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="pt-chart-legend">
            <div className="pt-legend-line" style={{ background: "#2563eb" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div className="pt-legend-dot" style={{ background: "#2563eb", border: "2px solid #2563eb" }} />
              Rata-rata waktu merespon
            </div>
          </div>
        </div>

        {/* Chart 2: Tren Jumlah Permintaan */}
        <div className="pt-chart-card">
          <div className="pt-chart-title">Tren Jumlah Permintaan</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={DUMMY_REQUEST_COUNT} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                domain={[0, 60]}
                ticks={[0, 10, 20, 30, 40, 50, 60]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="value"
                fill="#f97316"
                radius={[3, 3, 0, 0]}
                barSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="pt-chart-legend">
            <div style={{ width: 14, height: 14, borderRadius: 3, background: "#f97316" }} />
            Tren Jumlah Peminatan
          </div>
        </div>

        {/* Chart 3: Tren Tingkat Kegagalan */}
        <div className="pt-chart-card">
          <div className="pt-chart-title">Tren Tingkat Kegagalan</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={DUMMY_ERROR_RATE} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v}%`}
                domain={[0, 6]}
                ticks={[0, 1, 2, 3, 4, 5, 6]}
              />
              <Tooltip content={<CustomTooltip suffix="%" />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#dc2626"
                strokeWidth={2}
                dot={{ r: 3, fill: "#dc2626" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="pt-chart-legend">
            <div className="pt-legend-line" style={{ background: "#dc2626" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div className="pt-legend-dot" style={{ background: "#dc2626", border: "2px solid #dc2626" }} />
              Tren Tingkat Kegagalan
            </div>
          </div>
        </div>

      </div>

      {/* Tabel Kinerja per Layanan */}
      <div className="pt-table-section">
        <div className="pt-table-title">Kinerja per Layanan</div>
        <table className="pt-table">
          <thead>
            <tr>
              <th>Fitur</th>
              <th>Total Permintaan</th>
              <th>Rata-rata Waktu Respons</th>
              <th>P95 Waktu Respon</th>
              <th>Jumlah Error</th>
              <th style={{ color: "#8C0000" }}>Tingkat Error (%)</th>
            </tr>
          </thead>
          <tbody>
            {DUMMY_TABLE.map((row, i) => (
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
  )
}