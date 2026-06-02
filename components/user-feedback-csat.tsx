"use client"

import { useState, useEffect, useCallback } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import {
  LineChart, Line, CartesianGrid,
} from "recharts"

type CsatByIntent = {
  intent: string
  likes: number
  dislikes: number
  total: number
  csat: number
}

type TrendItem = {
  period: string
  likes: number
  dislikes: number
}

type FeedbackApiData = {
  csat: number
  totalFeedback: number
  likes: number
  dislikes: number
  csatByIntent: CsatByIntent[]
  trend: TrendItem[]
}

const Skeleton = ({ h = 100 }: { h?: number }) => (
  <div style={{
    height: h, borderRadius: 8,
    background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
    backgroundSize: "200% 100%",
    animation: "uf-shimmer 1.4s infinite",
  }} />
)

export default function UserFeedbackCSATPage() {
  const [feedbackData, setFeedbackData] = useState<FeedbackApiData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchFeedback = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/feedback?days=30`)
      const json = await res.json()
      if (json.status) setFeedbackData(json.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFeedback() }, [fetchFeedback])

  const totalFeedback = feedbackData?.totalFeedback ?? 0
  const totalLikes    = feedbackData?.likes ?? 0
  const totalDislikes = feedbackData?.dislikes ?? 0
  const csatPct       = feedbackData?.csat ?? 0
  const likesPct      = totalFeedback > 0 ? Math.round(totalLikes / totalFeedback * 100) : 0
  const dislikesPct   = totalFeedback > 0 ? Math.round(totalDislikes / totalFeedback * 100) : 0

  const csatPerIntent = (feedbackData?.csatByIntent ?? []).map(item => ({
    name: item.intent,
    pct: Math.round(item.csat),
    color: "#06b6d4",
  }))

  const trendData = (feedbackData?.trend ?? []).map(item => {
    const total = item.likes + item.dislikes
    const puasPct  = total > 0 ? Math.round(item.likes / total * 100) : 0
    const tidakPct = total > 0 ? Math.round(item.dislikes / total * 100) : 0
    const d = new Date(item.period)
    const label = isNaN(d.getTime())
      ? item.period
      : d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
    return { date: label, Puas: puasPct, TidakPuas: tidakPct }
  })

  return (
    <div style={{ minHeight: "calc(100vh - 110px)" }}>
      <style>{`
        @keyframes uf-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .uf-stat-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        .uf-stat-card {
          background: #fff;
          border-radius: 12px;
          padding: 18px 20px 14px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.07);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .uf-stat-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .uf-stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #8C0000;
          line-height: 1;
        }
        .uf-stat-sub {
          font-size: 12px;
          color: #16a34a;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .uf-stat-sub.red { color: #dc2626; }
        .uf-charts-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .uf-card {
          background: #fff;
          border-radius: 12px;
          padding: 20px 22px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.07);
        }
        .uf-card-title {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 16px;
        }
        .trend-legend {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 8px;
          justify-content: flex-end;
        }
        .trend-legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: #374151;
          font-weight: 500;
        }
        .trend-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        @media (max-width: 900px) {
          .uf-stat-row { grid-template-columns: 1fr 1fr; }
          .uf-charts-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .uf-stat-row { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Stat cards row */}
      <div className="uf-stat-row">
        {/* Overall CSAT */}
        <div className="uf-stat-card">
          <div className="uf-stat-label">Overall CSAT</div>
          {loading ? <Skeleton h={40} /> : (
            <>
              <div className="uf-stat-value">{Number(csatPct).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</div>
              <div className="uf-stat-sub">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                6,1% vs sebelumnya
              </div>
            </>
          )}
        </div>

        {/* Total Feedback */}
        <div className="uf-stat-card">
          <div className="uf-stat-label">Total Feedback</div>
          {loading ? <Skeleton h={40} /> : (
            <>
              <div className="uf-stat-value">{totalFeedback.toLocaleString("id-ID")}</div>
              <div className="uf-stat-sub">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                15,4% vs sebelumnya
              </div>
            </>
          )}
        </div>

        {/* Puas */}
        <div className="uf-stat-card">
          <div className="uf-stat-label">
            <img
              src="/like.png"
              alt="like"
              style={{
                width: 18,
                height: 18,
                objectFit: "contain",
              }}
            />
            Puas
          </div>
          {loading ? <Skeleton h={40} /> : (
            <>
              <div className="uf-stat-value" style={{ color: "#111827" }}>{totalLikes.toLocaleString("id-ID")}</div>
              <div className="uf-stat-sub">({likesPct}%)</div>
            </>
          )}
        </div>

        {/* Tidak Puas */}
        <div className="uf-stat-card">
          <div className="uf-stat-label">
            <img
              src="/dislike.png"
              alt="dislike"
              style={{
                width: 18,
                height: 18,
                objectFit: "contain",
              }}
            />
            Tidak Puas
          </div>
          {loading ? <Skeleton h={40} /> : (
            <>
              <div className="uf-stat-value" style={{ color: "#111827" }}>{totalDislikes.toLocaleString("id-ID")}</div>
              <div className="uf-stat-sub red">({dislikesPct}%)</div>
            </>
          )}
        </div>
      </div>

      {/* Charts row */}
      <div className="uf-charts-row">
        {/* CSAT per Intent */}
        <div className="uf-card">
          <div className="uf-card-title">CSAT per Intent</div>
          {loading ? <Skeleton h={320} /> : csatPerIntent.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={csatPerIntent}
                layout="vertical"
                margin={{ top: 0, right: 55, left: 10, bottom: 0 }}
                barCategoryGap="20%"
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: "#6b7280", fontWeight: 700, }}
                  tickLine={false}
                  axisLine={{
                    stroke: "#d1d5db",
                    strokeWidth: 1,
                  }}
                  ticks={[0, 20, 40, 60, 80, 100]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={180}
                  tick={{ fontSize: 11, fill: "#374151", fontWeight: 500,  }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, "CSAT"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  cursor={false}
                />
                <Bar
                  dataKey="pct"
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                  background={false}
                  label={{
                    position: "right",
                    fontSize: 11,
                    fontWeight: 600,
                    fill: "#374151",
                    formatter: (v: unknown) => `${Number(v)}%`,
                  }}
                >
                  {csatPerIntent.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
              Belum ada data
            </div>
          )}
        </div>

        {/* CSAT Trend */}
        <div className="uf-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div className="uf-card-title" style={{ marginBottom: 0 }}>CSAT Trend (Like vs Dislike)</div>
            <div className="trend-legend">
              <div className="trend-legend-item">
                <div className="trend-legend-dot" style={{ background: "#16a34a" }} />
                Puas
              </div>
              <div className="trend-legend-item">
                <div className="trend-legend-dot" style={{ background: "#dc2626" }} />
                Tidak Puas
              </div>
            </div>
          </div>

          {loading ? <Skeleton h={300} /> : trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#6b7280", fontWeight: 700, }}
                  tickLine={false}
                  axisLine={false}
                  dy={13}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: "#6b7280", fontWeight: 700, }}
                  tickLine={false}
                  axisLine={false}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, ""]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Line
                  type="monotone"
                  dataKey="Puas"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#16a34a" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="TidakPuas"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#dc2626" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
              Belum ada data
            </div>
          )}
        </div>
      </div>
    </div>
  )
}