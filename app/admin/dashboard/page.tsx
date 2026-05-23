"use client"

import { useState, useEffect, useCallback } from "react"
import SidebarExpanded from "@/components/sidebar-expanded"
import IntentSesiChatPage from "@/components/intent-sesi-chat"
import UserFeedbackCSATPage from "@/components/user-feedback-csat"
import DokumenPage from "@/components/dokumen-page"
import WordCloud from "@/components/word-cloud"
import Image from "next/image"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts"

// Types
type OverviewIntent = {
  intent: string
  count: number
  percentage: number
}

type OverviewTrend = {
  period: string
  totalChats: number
  completionRate: number
  likePercentage: number
}

type OverviewData = {
  totalChats: number
  completionRate: number
  likePercentage: number
  intents: OverviewIntent[]
  trend: OverviewTrend[]
}

// Constants
const SIDEBAR_ICONS = [
  { icon: "grid", label: "Overview", enabled: true },
  { icon: "chat", label: "Intent dan Sesi Chat", enabled: true },
  { icon: "heart", label: "User Feedback dan CSAT", enabled: true },
  { icon: "doc", label: "Dokumen", enabled: true },
  { icon: "pie", label: "Performa dan Teknis", enabled: false },
]

const INTENT_COLORS = ["#3B82F6", "#22C55E", "#F97316", "#D1D5DB"]

// Helpers
function fmtNum(n: number) {
  if (n >= 1000) return (n / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "k"
  return n.toLocaleString("id-ID")
}

// Sub-components
function SidebarIcon({ icon, active, onClick, disabled, label }: { icon: string; active?: boolean; onClick?: () => void; disabled?: boolean; label?: string }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const icons: Record<string, React.ReactElement> = {
    grid: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    chat: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    heart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    pie: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>,
    doc: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  }
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        position: "relative",
        width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
        color: active ? "#8C0000" : "#9ca3af",
        background: active ? "#fef2f2" : "transparent",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
        transition: "all 0.15s",
      }}
    >
      {icons[icon]}
      {showTooltip && label && (
        <div style={{
          position: "absolute",
          left: "calc(100% + 10px)",
          top: "50%",
          transform: "translateY(-50%)",
          background: "#1f2937",
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 6,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 9999,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}>
          {label}
          <div style={{
            position: "absolute",
            right: "100%",
            top: "50%",
            transform: "translateY(-50%)",
            width: 0, height: 0,
            borderTop: "4px solid transparent",
            borderBottom: "4px solid transparent",
            borderRight: "4px solid #1f2937",
          }} />
        </div>
      )}
    </div>
  )
}

function StatCard({
  label, value, badge, badgeType, sub1, sub2, children,
}: {
  label: string; value: string; badge?: React.ReactNode; badgeType?: "positive" | "negative" | "neutral"
  sub1?: string; sub2?: string; children?: React.ReactNode
}) {
  const badgeColor = badgeType === "positive" ? "#16a34a" : badgeType === "negative" ? "#dc2626" : "#6b7280"
  const badgeBg = badgeType === "positive" ? "#f0fdf4" : badgeType === "negative" ? "#fef2f2" : "#f9fafb"

return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "16px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.07)", flex: 1, minWidth: 0,
      display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 130,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{label}</span>
        {badge && (
  <span
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: badgeColor,
      background: badgeBg,
      padding: "2px 8px",
      borderRadius: 20,
      display: "flex",
      alignItems: "center",
      gap: 4,
    }}
  >
    {badge}
  </span>
)}
      </div>
      <div
  style={{
    fontSize: 28,
    fontWeight: 700,
    color: "#8C0000",
    lineHeight: 1.1,
    marginTop: label === "Persentase Berhasil" ? 6 : 0,
  }}
>
  {value}
</div>
      <div>
        {children}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {sub1 ? <span style={{ fontSize: 11, color: "#6b7280" }}>{sub1}</span> : <span />}
          {sub2 && (
            <span style={{
              fontSize: 11,
              color: sub2.includes("PendingMerah") ? "#db3737" : "#6b7280",
              fontWeight: sub2.includes("PendingMerah") ? 600 : 400,
            }}>
              {sub2.replace("PendingMerah:", "Pending: ")}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniBar({ data }: { data: number[] }) {
  const getColor = (value: number) => {
    if (value >= 85) return "#B00020"
    if (value >= 70) return "#D66B7A"
    return "#EBCDD2"
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        height: 52,
        marginTop: 10,
      }}
    >
      {data.map((value, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(value * 0.45, 10)}px`,
            background: getColor(value),
            borderRadius: 4,
            transition: "all 0.3s ease",
          }}
        />
      ))}
    </div>
  )
}

type SessionIntentData = {
  intents: { intent: string; count: number; percentage: number }[]
  wordCloud: { word: string; count: number }[]
  sessionAnalysis: {
    totalSessions: number
    withIntent: number
    withContact: number
    dropOff: number
  }
}

function SidebarBottomIcon({ src, alt, label }: { src: string; alt: string; label: string }) {
  const [show, setShow] = useState(false)
  return (
    <div
      style={{ position: "relative", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <Image src={src} alt={alt} width={22} height={22} />
      {show && (
        <div style={{
          position: "absolute",
          left: "calc(100% + 10px)",
          top: "50%",
          transform: "translateY(-50%)",
          background: "#1f2937",
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 6,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 9999,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}>
          {label}
          <div style={{
            position: "absolute",
            right: "100%",
            top: "50%",
            transform: "translateY(-50%)",
            width: 0, height: 0,
            borderTop: "4px solid transparent",
            borderBottom: "4px solid transparent",
            borderRight: "4px solid #1f2937",
          }} />
        </div>
      )}
    </div>
  )
}
// Main Page
export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [sessionIntent, setSessionIntent] = useState<SessionIntentData | null>(null)
  const [overviewTrend, setOverviewTrend] = useState<OverviewTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeMenu, setActiveMenu] = useState("Overview")

  const fetchAll = useCallback(async () => {
  setLoading(true)
  try {
    const [overviewRes, sessionRes] = await Promise.all([
      fetch(`/api/dashboard/overview?days=30`),
      fetch(`/api/dashboard/session-intent?days=30`),
    ])
    const [overviewJson, sessionJson] = await Promise.all([
      overviewRes.json(),
      sessionRes.json(),
    ])
    if (overviewJson.status) {
      setOverview(overviewJson.data)
      setOverviewTrend(overviewJson.data.trend ?? [])
    }
    if (sessionJson.status) setSessionIntent(sessionJson.data)
  } catch (e) {
    console.error("Failed to fetch dashboard data", e)
  } finally {
    setLoading(false)
  }
}, [])

useEffect(() => { fetchAll() }, [fetchAll])


  // Derived values
  const totalSesi = overview?.totalChats ?? 0
  const avgRate = overview?.completionRate ?? 0
  const csatPct = overview?.likePercentage ?? 0
  const resolvedTotal = Math.round(totalSesi * avgRate / 100)
  const unhandled = totalSesi - resolvedTotal
  const coveragePct = avgRate
  const trend = 12.5 // tidak tersedia dari overview, tetap dummy

  // Intent pie data
  // const intentMap: Record<string, number> = {}
  //stats?.topIntents?.forEach(d => {
    //intentMap[d.intent] = (intentMap[d.intent] ?? 0) + d.count
  //})
  //const intentTotal = Object.values(intentMap).reduce((s, v) => s + v, 0)
  //const intentEntries = Object.entries(intentMap).sort((a, b) => b[1] - a[1])
  //const pieData = intentEntries.slice(0, 3).map(([name, value]) => ({ name, value }))
  //const othersVal = intentEntries.slice(3).reduce((s, [, v]) => s + v, 0)
  //if (othersVal > 0) pieData.push({ name: "Lainnya", value: othersVal })
  // Intent pie data — DUMMY DATA
  const intents = overview?.intents ?? []
  const intentTotal = intents.reduce((s, d) => s + d.count, 0)

  const intentsFiltered = intents.filter(d => d.intent !== "Lainnya")
  const pieData = intentsFiltered.slice(0, 4).map(d => ({ name: d.intent, value: d.count }))

  const intentEntries: [string, number][] = intents.map(d => [d.intent, d.count])


  // Line chart data
  const formatPeriodLabel = (period: string) => {
    if (/^\d{4}-\d{2}$/.test(period)) {
      const [y, m] = period.split("-")
      return new Date(Number(y), Number(m) - 1).toLocaleDateString("id-ID", { month: "short", year: "numeric" })
    }
    const d = new Date(period)
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
  }

  const lineData = overviewTrend.map(d => ({
    date: formatPeriodLabel(d.period),
    Session: d.totalChats,
    Conversion: d.completionRate,
    CSAT: d.likePercentage,
  }))
  
  const topIntentsTable = intents.filter(d => d.intent !== "Lainnya").slice(0, 5).map((item, i) => {
  const avgCount = intents.slice(0, 5).reduce((s, d) => s + d.count, 0) / Math.max(intents.slice(0, 5).length, 1)
  const trendUp = item.count >= avgCount
  const trendPct = Math.max(1, Math.abs(Math.round((item.count - avgCount) / Math.max(avgCount, 1) * 100 * 0.3 + 2)))
  return { rank: i + 1, intent: item.intent, count: item.count, pct: item.percentage, trendUp, trendPct }
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #f4f5f7; }

        .dash-layout {
          display: flex;
          min-height: 100vh;
          background: #f4f5f7;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
        }

        /* Sidebar */
        .sidebar {
          width: 56px;
          background: #fff;
          border-right: 1px solid #f0f0f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 0;
          gap: 6px;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 100;
        }

        .sidebar-accent {
          position: absolute;
          left: 0;
          top: 88px;
          width: 3px;
          height: 36px;
          background: #8C0000;
          border-radius: 0 3px 3px 0;
        }

        .sidebar-bottom {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          padding-bottom: 8px;
        }

        /* Main */
        .main {
          margin-left: 56px;
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow-y: auto;
        }

        .content {
          padding: 24px 28px 60px;
          flex: 1;
          margin-top: 57px;
        }


        /* Topbar */
        .topbar {
          background: #fff;
          border-bottom: 1px solid #f0f0f0;
          padding: 14px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: fixed;
          top: 0;
          left: 56px;
          right: 0;
          z-index: 90;
          height: 57px;
        }

        .topbar-title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }

        .mobile-sidebar-btn {
          display: none;
          border: none;
          background: transparent;
          cursor: pointer;
          padding: 4px;
          align-items: center;
          justify-content: center;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .notif-btn {
          position: relative;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #6b7280;
        }

        .notif-dot {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 8px;
          height: 8px;
          background: #8C0000;
          border-radius: 50%;
          border: 1.5px solid #fff;
        }

        .user-pill {
          display: flex;
          align-items: center;
          gap: 18px;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 24px;
          transition: background 0.15s;
        }
        .user-pill:hover { background: #f9fafb; }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8C0000, #c0392b);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
        }

        /* Filter bar */
        .filter-bar {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filter-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: border-color 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .filter-btn:hover { border-color: #8C0000; color: #8C0000; }

        /* Stat cards row */
        .stat-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        /* Charts row */
        .charts-row {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 14px;
          margin-bottom: 20px;
        }

        .chart-card {
          background: #fff;
          border-radius: 12px;
          padding: 20px 22px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }

        .chart-card-highlighted {
          border: 2px solid #3B82F6;
        }

        .chart-title {
          font-size: 14px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 3px;
        }

        .chart-sub {
          font-size: 11.5px;
          color: #9ca3af;
          margin-bottom: 16px;
        }

        .chart-legend {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .legend-label {
          font-size: 11px;
          color: #6b7280;
          font-weight: 500;
        }

        /* Bottom row */
        .bottom-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        /* Intent table */
        .intent-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .intent-table th {
          text-align: left;
          padding: 8px 10px;
          background: #fef2f2;
          color: #8C0000;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .intent-table td {
          padding: 9px 10px;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
          font-size: 12.5px;
        }

        .intent-table tr:last-child td { border-bottom: none; }
        .intent-table tr:hover td { background: #fafafa; }

        .rank-badge {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fef2f2;
          color: #8C0000;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .wc-bg {
          background: #fef2f2;
          border-radius: 10px;
          min-height: 180px;
        }

        .view-all-link {
          color: #8C0000;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .view-all-link:hover { text-decoration: underline; }

        /* Skeleton */
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 6px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Pie legend */
        .pie-legend-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          margin-bottom: 6px;
        }
        .pie-legend-left {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #374151;
        }
        .pie-legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pie-legend-pct {
          font-weight: 600;
          color: #374151;
        }

        /* Feedback bar */
        .feedback-bar-wrap {
          margin-top: 10px;
        }
        .feedback-bar-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          font-size: 12px;
        }
        .feedback-bar-label { width: 60px; color: #6b7280; }
        .feedback-bar-track {
          flex: 1;
          height: 8px;
          background: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
        }
        .feedback-bar-fill { height: 100%; border-radius: 4px; }
        .feedback-bar-val { width: 32px; text-align: right; font-weight: 600; color: #374151; }

        /* Responsive — Tablet */
        @media (max-width: 1024px) {
          .charts-row { grid-template-columns: 1fr; }
          .bottom-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 900px) {
          .stat-row { grid-template-columns: 1fr 1fr; }
        }

        /* Responsive — Mobile */
        @media (max-width: 640px) {
          .sidebar { display: none; }
          .main { margin-left: 0; padding-bottom: 72px; }
          .content { padding: 12px 12px 16px; }
          .stat-row { grid-template-columns: 1fr; gap: 10px; margin-bottom: 14px; }
          .charts-row { grid-template-columns: 1fr; gap: 10px; margin-bottom: 10px; }
          .bottom-row { grid-template-columns: 1fr; gap: 10px; }
          .chart-card { padding: 14px 14px; }
          .topbar { padding: 10px 14px; gap: 8px; left: 0;}
          .topbar-title { font-size: 15px; }
          .user-pill-text { display: none; }
          .user-pill { padding: 4px; border: none; gap: 4px; }
          .notif-btn { padding: 2px; }
          .filter-bar { gap: 6px; margin-bottom: 14px; }
          .filter-btn { padding: 6px 10px; font-size: 12px; }
          .chart-legend { flex-wrap: wrap; gap: 6px; }
          .chart-title { font-size: 13px; }
          .mobile-nav { display: flex !important; }
          .mobile-sidebar-btn { display: flex; }
        }

        /* Mobile bottom nav */
        .mobile-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #fff;
          border-top: 1px solid #f0f0f0;
          z-index: 200;
          padding: 6px 0 10px;
          justify-content: space-around;
          align-items: center;
          box-shadow: 0 -2px 12px rgba(0,0,0,0.07);
        }
        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 4px 10px;
          cursor: pointer;
          color: #9ca3af;
          font-size: 10px;
          font-weight: 500;
          border: none;
          background: none;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.15s;
        }
        .mobile-nav-item.active { color: #8C0000; }
      `}</style>

      <div className="dash-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-accent" style={{
            top: (() => {
              const idx = SIDEBAR_ICONS.findIndex(s => s.label === activeMenu)
              return `${69 + idx * 42}px`
            })()
          }} />
          <div
            style={{ marginBottom: 16, cursor: "pointer", position: "relative" }}
            onClick={() => setSidebarOpen(true)}
            onMouseEnter={e => {
              const el = e.currentTarget.querySelector(".sidebar-tooltip") as HTMLElement
              if (el) el.style.display = "block"
            }}
            onMouseLeave={e => {
              const el = e.currentTarget.querySelector(".sidebar-tooltip") as HTMLElement
              if (el) el.style.display = "none"
            }}
          >
            
            <Image src="/ikon-sidebar.png" alt="menu" width={32} height={32} />
            <div className="sidebar-tooltip" style={{
              display: "none",
              position: "absolute",
              left: "calc(100% + 10px)",
              top: "50%",
              transform: "translateY(-50%)",
              background: "#1f2937",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 6,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 9999,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}>
              Buka Menu
              <div style={{
                position: "absolute",
                right: "100%",
                top: "50%",
                transform: "translateY(-50%)",
                width: 0, height: 0,
                borderTop: "4px solid transparent",
                borderBottom: "4px solid transparent",
                borderRight: "4px solid #1f2937",
              }} />
            </div>
          </div>

          {SIDEBAR_ICONS.map((s) => (
            <SidebarIcon
              key={s.icon}
              icon={s.icon}
              label={s.label}
              active={activeMenu === s.label}
              onClick={s.enabled ? () => setActiveMenu(s.label) : undefined}
              disabled={!s.enabled}
            />
          ))}

          <div className="sidebar-bottom">
            <SidebarBottomIcon src="/settings.png" alt="settings" label="Pengaturan" />
            <SidebarBottomIcon src="/logout.png" alt="logout" label="Keluar" />
          </div>
          </aside>

        <SidebarExpanded
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeMenu={activeMenu}
          onMenuClick={setActiveMenu}
        />

        {/* Main */}
        <div className="main">
          {/* Topbar */}
          <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Tombol sidebar mobile */}
            <button
              className="mobile-sidebar-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <Image
                src="/ikon-sidebar.png"
                alt="menu"
                width={24}
                height={24}
              />
            </button>

            <h1 className="topbar-title">Admin Dashboard</h1>
          </div>

          <div className="topbar-right">
              <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <div className="user-avatar" >MR</div>

          <div className="user-pill-text" style={{ marginLeft: 8 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#111827",
                lineHeight: 1.2,
              }}
            >
              Moni Roy
            </div>

            <div
              style={{
              fontSize: 11,
                color: "#9ca3af",
              }}
            >
              Admin
            </div>
          </div>

          <svg
            className="user-pill-text"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      </header>

          {/* Content */}
          <div className="content">
            {activeMenu === "Intent dan Sesi Chat" ? (
              <IntentSesiChatPage />
            ) : activeMenu === "User Feedback dan CSAT" ? (
              <UserFeedbackCSATPage />
            ) : activeMenu === "Dokumen" ? (
              <DokumenPage />
            ) : (
            <div style={{ minHeight: "calc(100vh - 110px)" }}>

            {/* Stat cards */}
            <div className="stat-row">
              {/* Total Sesi */}
              <StatCard
                label="Total Sesi"
                value={loading ? "—" : totalSesi.toLocaleString("id-ID")}
                badge={loading ? undefined : `+${trend}%`}
                badgeType="positive"
                sub1={loading ? undefined : `Resolved: ${fmtNum(resolvedTotal)}`}
                sub2={loading ? undefined : `Bulan ini: ${fmtNum(totalSesi)}`}
              >
                {loading ? (
                <div className="skeleton" style={{ height: 4, width: "100%", borderRadius: 2 }} />
              ) : (
                <div style={{ height: 4, width: "100%", background: "#e5e7eb", borderRadius: 2 }}>
                  <div style={{ height: "100%", background: "#8C0000", borderRadius: 2, width: `${Math.min(avgRate, 100)}%` }} />
                </div>
              )}
              </StatCard>

              {/* Persentase Berhasil */}
              <StatCard
                label="Persentase Berhasil"
                value={loading ? "—" : `${avgRate.toFixed(1)}%`}
                badge="+2.1%"
                badgeType="positive"
              >
                {loading ? (
                  <div className="skeleton" style={{ height: 8, width: "100%", marginBottom: 4 }} />
                ) : (
                  <MiniBar data={[55, 68, 48, 88]} />
                )}
              </StatCard>

              {/* Tingkat Kepuasan */}
              <StatCard
                label="Tingkat Kepuasan"
                value={loading ? "—" : `${csatPct.toFixed(1)}%`}
                badge={
                <>
                  <Image
                    src="/high.png"
                    alt="high"
                    width={10}
                    height={10}
                  />
                  Tinggi
                </>
              }
                badgeType="positive"
                sub1={loading ? undefined : "User puas terhadap layanan"}
              />

              {/* Cakupan Pertanyaan */}
              <StatCard
                label="Cakupan Pertanyaan"
                value={loading ? "—" : `${coveragePct}%`}
                badge="-0.4%"
                badgeType="negative"
                sub1={loading ? undefined : `Selesai: ${fmtNum(resolvedTotal)}`}
                sub2={loading ? undefined : `PendingMerah:${unhandled}`}
              />
            </div>

            {/* Charts row */}
            <div className="charts-row">
              {/* Line chart */}
            <div className="chart-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div>
                  <div className="chart-title" style={{ fontSize: 16, fontWeight: 700 }}>Trend line 30 hari terakhir</div>
                  <div className="chart-sub">Total sesi, Persentase Berhasil, dan Tingkat Kepuasan</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {[
                    { label: "Session",    bg: "#dbeafe", color: "#2563eb" },
                    { label: "Conversion", bg: "#dcfce7", color: "#16a34a" },
                    { label: "CSAT",       bg: "#fef9c3", color: "#ca8a04" },
                  ].map(l => (
                    <span key={l.label} style={{
                      padding: "3px 12px", borderRadius: 20,
                      background: l.bg, color: l.color,
                      fontSize: 11.5, fontWeight: 600,
                    }}>
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="skeleton" style={{ height: 280, width: "100%", borderRadius: 8 }} />
              ) : lineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>

            <LineChart
              data={lineData}
              margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={false}
                tickLine={false}
                axisLine={false}
                width={0}
              />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <Line type="monotone" dataKey="Session" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="Conversion" stroke="#ca8a04" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="CSAT" stroke="#16a34a" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
            </ResponsiveContainer>
              ) : (
                <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
                  Belum ada data untuk periode ini
                </div>
              )}
            </div>

              {/* Pie chart */}
              <div className="chart-card">
                <div className="chart-title">Pembagian Jenis Intent</div>
                <div className="chart-sub">Breakdown kategori intent utama</div>

                {loading ? (
                  <div className="skeleton" style={{ height: 160, width: 160, borderRadius: "50%", margin: "0 auto 16px" }} />
                ) : pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} dataKey="value" strokeWidth={2}>
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={INTENT_COLORS[i % INTENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`${v} sesi`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ marginTop: 8 }}>
                      {pieData.map((d, i) => (
                        <div className="pie-legend-row" key={i}>
                          <div className="pie-legend-left">
                            <div className="pie-legend-dot" style={{ background: INTENT_COLORS[i % INTENT_COLORS.length] }} />
                            <span>{d.name}</span>
                          </div>
                          <span className="pie-legend-pct">
                            {intentTotal > 0 ? Math.round(d.value / intentTotal * 100) : 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
                    Belum ada data intent
                  </div>
                )}
              </div>
            </div>

            {/* Bottom row */}
            <div className="bottom-row">
              {/* Top intents table */}
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
                    {topIntentsTable.length > 0 ? topIntentsTable.map((row, idx) => {
                      // simulasi trend: positif jika pct > rata-rata
                      const avg = topIntentsTable.reduce((s, r) => s + r.pct, 0) / topIntentsTable.length
                      const trendUp = row.pct >= avg
                      const trendPct = Math.abs(Math.round((row.pct - avg) * 0.8 + 2))
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

              {/* Word Cloud Pertanyaan */}
            <div className="chart-card" style={{ display: "flex", flexDirection: "column" }}>
              <div className="chart-title">Word Cloud Pertanyaan</div>
              <div className="chart-sub">Free-text queries paling populer</div>
              {(() => {
              const wordCloudWords = (sessionIntent?.wordCloud ?? []).map(w => ({ text: w.word, count: w.count }))
              return (
                <div className="wc-bg" style={{ marginTop: 8, flex: 1 }}>
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
                    <div style={{ position: "relative", height: 320, borderRadius: 24, background: "#f3dede", overflow: "hidden" }}>
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
              )
              })()} 
            </div>
            </div>
                 </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        {[
          { icon: "grid", label: "Dashboard", active: true },
          { icon: "chat", label: "Chat" },
          { icon: "heart", label: "Feedback" },
          { icon: "pie", label: "Analytics" },
          { icon: "doc", label: "Dokumen" },
        ].map((item) => (
          <button key={item.icon} className={`mobile-nav-item${item.active ? " active" : ""}`}>
            {item.icon === "grid" && <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>}
            {item.icon === "chat" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
            {item.icon === "heart" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
            {item.icon === "pie" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>}
            {item.icon === "doc" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}