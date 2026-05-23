"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"

type SidebarExpandedProps = {
  open: boolean
  onClose: () => void
  activeMenu?: string
  onMenuClick?: (menu: string) => void
}

const MENU_ITEMS = [
  { label: "Overview" },
  { label: "Intent dan Sesi Chat" },
  { label: "User Feedback dan CSAT" },
  { label: "Dokumen" },
  { label: "Performa dan Teknis" },
]

export default function SidebarExpanded({
  open,
  onClose,
  activeMenu = "Overview",
  onMenuClick,
}: SidebarExpandedProps) {
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", fn)
    return () => document.removeEventListener("keydown", fn)
  }, [onClose])

  return (
    <>
      <style>{`
        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.25);
          z-index: 150;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        .sidebar-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }

        .sidebar-drawer {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 220px;
          background: #fff;
          z-index: 160;
          display: flex;
          flex-direction: column;
          transform: translateX(-100%);
          transition: transform 0.22s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 4px 0 24px rgba(0,0,0,0.10);
        }
        .sidebar-drawer.open {
          transform: translateX(0);
        }

        .sdraw-logo {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 16px 12px 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .sdraw-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .sdraw-close:hover { background: #f3f4f6; color: #374151; }

        .sdraw-menu {
          flex: 1;
          padding: 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }

        .sdraw-item {
          display: flex;
          align-items: center;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          transition: background 0.15s, color 0.15s;
          font-family: inherit;
          position: relative;
        }
        .sdraw-item:hover {
          background: #fef2f2;
          color: #8C0000;
        }
        .sdraw-item.active {
          background: #8C0000;
          color: #fff;
          font-weight: 600;
        }
        .sdraw-item.active:hover {
          background: #7a0000;
          color: #fff;
        }

        .sdraw-bottom {
          border-top: 1px solid #f3f4f6;
          padding: 10px 10px 80px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sdraw-bottom-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          transition: background 0.15s, color 0.15s;
          font-family: inherit;
        }
        .sdraw-bottom-item:hover { background: #f9fafb; color: #111827; }
        .sdraw-bottom-item.danger { color: #6b7280; }
        .sdraw-bottom-item.danger:hover { background: #fef2f2; color: #8C0000; }
      `}</style>

      {/* Overlay */}
      <div
        className={`sidebar-overlay${open ? " open" : ""}`}
        onClick={onClose}
        style={{ background: "transparent" }}
      />

      {/* Drawer */}
      <div ref={sidebarRef} className={`sidebar-drawer${open ? " open" : ""}`}>
        {/* Logo + close button */}
        <div className="sdraw-logo">
          <Image src="/ojk-logo.png" alt="OJK" width={100} height={34} style={{ objectFit: "contain" }} />
          <button className="sdraw-close" onClick={onClose} aria-label="Tutup menu">
            <Image
              src="/ikon-sidebar.png"
              alt="close"
              width={28}
              height={28}
            />
          </button>
        </div>

        {/* Menu items */}
        <nav className="sdraw-menu">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.label}
              className={`sdraw-item${activeMenu === item.label ? " active" : ""}`}
              onClick={() => { onMenuClick?.(item.label); onClose() }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom: Pengaturan + Logout */}
        <div className="sdraw-bottom">
          <button className="sdraw-bottom-item">
            <Image src="/settings.png" alt="settings" width={18} height={18} />
            Pengaturan
          </button>

          <button className="sdraw-bottom-item danger">
            <Image src="/logout.png" alt="logout" width={18} height={18} />
            Keluar
          </button>
        </div>
      </div>
    </>
  )
}