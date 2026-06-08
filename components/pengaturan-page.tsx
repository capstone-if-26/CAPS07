"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"

// ─── Types ───────────────────────────────────────────────────────────────────

type UserData = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: string
  updatedAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

/** Resize & center-crop image to 128×128, returns JPEG base64 data URL. */
function resizeAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      const SIZE = 128
      const canvas = document.createElement("canvas")
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext("2d")!
      const scale = Math.max(SIZE / img.width, SIZE / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/jpeg", 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Gagal membaca gambar")) }
    img.src = url
  })
}

function passwordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: "", color: "#e5e7eb" }
  let score = 0
  if (pw.length >= 8)  score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw))   score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { level: 1, label: "Lemah", color: "#dc2626" }
  if (score === 2) return { level: 2, label: "Sedang", color: "#f59e0b" }
  return { level: 3, label: "Kuat", color: "#16a34a" }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pg-card">
      <div className="pg-card-title">{title}</div>
      {children}
    </div>
  )
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="pg-label">{label}</label>
      {children}
      {hint && <div className="pg-hint">{hint}</div>}
    </div>
  )
}

function Alert({ type, message }: { type: "success" | "error" | "info"; message: string }) {
  const map = {
    success: { bg: "#f0fdf4", color: "#16a34a", icon: "M20 6L9 17l-5-5" },
    error:   { bg: "#fef2f2", color: "#dc2626", icon: "M18 6L6 18M6 6l12 12" },
    info:    { bg: "#eff6ff", color: "#2563eb", icon: "M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
  }
  const s = map[type]
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 8, background: s.bg, marginTop: 10 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
        <path d={s.icon} />
      </svg>
      <span style={{ fontSize: 12.5, color: s.color, fontWeight: 500 }}>{message}</span>
    </div>
  )
}

// ─── Avatar Upload ─────────────────────────────────────────────────────────────

function AvatarUpload({ user, onSaved }: { user: UserData; onSaved: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const initials = user.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatus({ type: "error", msg: "Hanya file gambar yang diizinkan (JPG, PNG, WebP)." })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ type: "error", msg: "Ukuran file maksimal 5 MB." })
      return
    }
    setStatus(null)
    try {
      const dataUrl = await resizeAvatar(file)
      setPreview(dataUrl)
    } catch {
      setStatus({ type: "error", msg: "Gagal memproses gambar. Coba file lain." })
    }
  }, [])

  const handleSave = async () => {
    if (!preview) return
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch("/api/auth/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      })
      if (!res.ok) throw new Error()
      onSaved(preview)
      setPreview(null)
      setStatus({ type: "success", msg: "Foto profil berhasil diperbarui." })
    } catch {
      setStatus({ type: "error", msg: "Gagal menyimpan foto. Coba lagi." })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch("/api/auth/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: null }),
      })
      if (!res.ok) throw new Error()
      onSaved("")
      setPreview(null)
      setStatus({ type: "success", msg: "Foto profil berhasil dihapus." })
    } catch {
      setStatus({ type: "error", msg: "Gagal menghapus foto." })
    } finally {
      setSaving(false)
    }
  }

  const currentImage = preview ?? user.image ?? null

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      {/* Avatar */}
      <div
        className="pg-avatar-ring"
        style={{ cursor: "pointer", position: "relative" }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
      >
        <div
          className="pg-avatar"
          style={{
            outline: dragOver ? "3px solid #8C0000" : "3px solid transparent",
            transition: "outline 0.15s",
          }}
        >
          {currentImage ? (
            <Image
              src={currentImage}
              alt={user.name}
              width={88}
              height={88}
              style={{ objectFit: "cover", width: "100%", height: "100%", borderRadius: "50%" }}
              unoptimized
            />
          ) : (
            <span style={{ fontSize: 30, fontWeight: 700, color: "#fff", userSelect: "none" }}>{initials}</span>
          )}
        </div>
        {/* Camera overlay */}
        <div className="pg-avatar-overlay">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }}
      />

      <div style={{ fontSize: 11.5, color: "#9ca3af", textAlign: "center" }}>
        Klik avatar atau seret gambar ke sini<br />
        <span style={{ fontSize: 11 }}>JPG / PNG / WebP · maks 5 MB · akan diubah ke 128×128 px</span>
      </div>

      {/* Actions */}
      {preview ? (
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <button className="pg-btn-outline" onClick={() => { setPreview(null); setStatus(null) }} disabled={saving} style={{ flex: 1 }}>
            Batal
          </button>
          <button className="pg-btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
            {saving ? "Menyimpan…" : "Simpan Foto"}
          </button>
        </div>
      ) : user.image ? (
        <button className="pg-btn-ghost-danger" onClick={handleRemove} disabled={saving}>
          {saving ? "Menghapus…" : "Hapus Foto"}
        </button>
      ) : null}

      {status && <Alert type={status.type} message={status.msg} />}
    </div>
  )
}

// ─── Email Verification ────────────────────────────────────────────────────────

function EmailVerification({ user }: { user: UserData }) {
  const [cooldown, setCooldown] = useState(0)
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  if (user.emailVerified) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>Email Terverifikasi</div>
          <div style={{ fontSize: 11.5, color: "#16a34a", marginTop: 1 }}>{user.email}</div>
        </div>
      </div>
    )
  }

  const handleResend = async () => {
    setSending(true)
    setStatus(null)
    try {
      const res = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      })
      if (!res.ok) throw new Error()
      setCooldown(60)
      setStatus({ type: "success", msg: `Email verifikasi telah dikirim ke ${user.email}. Periksa kotak masuk atau folder spam Anda.` })
    } catch {
      setStatus({ type: "error", msg: "Gagal mengirim email. Coba lagi beberapa saat." })
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "#fefce8", borderRadius: 10, border: "1px solid #fde68a", marginBottom: 12 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>Email Belum Terverifikasi</div>
          <div style={{ fontSize: 12, color: "#b45309", marginTop: 2 }}>
            Beberapa fitur mungkin terbatas. Verifikasi <strong>{user.email}</strong> untuk akses penuh.
          </div>
        </div>
      </div>

      <button
        className="pg-btn-outline"
        onClick={handleResend}
        disabled={sending || cooldown > 0}
        style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: 8 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        {sending ? "Mengirim…" : cooldown > 0 ? `Kirim ulang dalam ${cooldown}s` : "Kirim Ulang Email Verifikasi"}
      </button>

      {status && <Alert type={status.type} message={status.msg} />}
    </div>
  )
}

// ─── Change Password ───────────────────────────────────────────────────────────

function ChangePassword() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" })
  const [show, setShow] = useState({ current: false, next: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  const strength = passwordStrength(form.next)
  const match = form.confirm.length > 0 && form.next === form.confirm
  const mismatch = form.confirm.length > 0 && form.next !== form.confirm
  const canSubmit = form.current && form.next.length >= 8 && match && !saving

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data?.message ?? "Gagal mengubah password."
        const isWrong = msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("wrong") || msg.toLowerCase().includes("incorrect")
        setStatus({ type: "error", msg: isWrong ? "Password saat ini tidak sesuai." : msg })
        return
      }
      setForm({ current: "", next: "", confirm: "" })
      setStatus({ type: "success", msg: "Password berhasil diubah." })
    } catch {
      setStatus({ type: "error", msg: "Tidak dapat terhubung ke server." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      {/* Current password */}
      <FieldGroup label="Password Saat Ini">
        <div className="pg-input-wrap">
          <input
            className="pg-input-inner"
            type={show.current ? "text" : "password"}
            value={form.current}
            onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
            placeholder="Masukkan password saat ini"
            autoComplete="current-password"
          />
          <button type="button" className="pg-eye-btn" onClick={() => setShow(s => ({ ...s, current: !s.current }))}>
            <EyeIcon open={show.current} />
          </button>
        </div>
      </FieldGroup>

      {/* New password */}
      <FieldGroup label="Password Baru">
        <div className="pg-input-wrap">
          <input
            className="pg-input-inner"
            type={show.next ? "text" : "password"}
            value={form.next}
            onChange={e => setForm(f => ({ ...f, next: e.target.value }))}
            placeholder="Minimal 8 karakter"
            autoComplete="new-password"
          />
          <button type="button" className="pg-eye-btn" onClick={() => setShow(s => ({ ...s, next: !s.next }))}>
            <EyeIcon open={show.next} />
          </button>
        </div>
        {/* Strength bar */}
        {form.next.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              {([1, 2, 3] as const).map(lvl => (
                <div key={lvl} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: strength.level >= lvl ? strength.color : "#e5e7eb",
                  transition: "background 0.2s",
                }} />
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: strength.color, fontWeight: 600 }}>{strength.label}</div>
          </div>
        )}
        <div className="pg-hint">Minimal 8 karakter, disarankan huruf besar, angka, dan simbol.</div>
      </FieldGroup>

      {/* Confirm */}
      <FieldGroup label="Konfirmasi Password Baru">
        <div className={`pg-input-wrap${mismatch ? " error" : match ? " success" : ""}`}>
          <input
            className="pg-input-inner"
            type={show.confirm ? "text" : "password"}
            value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            placeholder="Ulangi password baru"
            autoComplete="new-password"
          />
          {form.confirm.length > 0 && (
            <span style={{ color: match ? "#16a34a" : "#dc2626", flexShrink: 0 }}>
              {match
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              }
            </span>
          )}
          <button type="button" className="pg-eye-btn" onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))}>
            <EyeIcon open={show.confirm} />
          </button>
        </div>
        {mismatch && <div style={{ fontSize: 11.5, color: "#dc2626", marginTop: 4 }}>Password tidak cocok.</div>}
      </FieldGroup>

      <button type="submit" className="pg-btn-primary" disabled={!canSubmit} style={{ width: "100%" }}>
        {saving ? "Menyimpan…" : "Ubah Password"}
      </button>
      {status && <Alert type={status.type} message={status.msg} />}
    </form>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

// ─── Profile Info Form ─────────────────────────────────────────────────────────

function ProfileInfo({ user, onSaved }: { user: UserData; onSaved: (name: string) => void }) {
  const [name, setName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const dirty = name.trim() !== user.name && name.trim().length > 0

  const handleSave = async () => {
    if (!dirty) return
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch("/api/auth/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) throw new Error()
      onSaved(name.trim())
      setStatus({ type: "success", msg: "Nama berhasil diperbarui." })
      setTimeout(() => setStatus(null), 3000)
    } catch {
      setStatus({ type: "error", msg: "Gagal menyimpan. Coba lagi." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <FieldGroup label="Nama Lengkap">
        <input className="pg-input" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
      </FieldGroup>
      <FieldGroup label="Email" hint="Email tidak dapat diubah melalui halaman ini.">
        <input className="pg-input" value={user.email} disabled />
      </FieldGroup>
      {dirty && (
        <button className="pg-btn-primary" onClick={handleSave} disabled={saving} style={{ width: "100%" }}>
          {saving ? "Menyimpan…" : "Simpan Perubahan"}
        </button>
      )}
      {status && <Alert type={status.type} message={status.msg} />}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PengaturanPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/auth/get-session")
      .then(r => r.json())
      .then(data => { if (data?.user) setUser(data.user) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[300, 240, 260].map((h, i) => (
          <div key={i} className="pg-skeleton" style={{ height: h, borderRadius: 14 }} />
        ))}
      </div>
    )
  }

  if (!user) {
    return <Alert type="error" message="Gagal memuat data pengguna. Silakan muat ulang halaman." />
  }

  return (
    <>
      <style>{`
        .pg-title   { font-size: 22px; font-weight: 700; color: #111827; }
        .pg-subtitle { font-size: 13px; color: #9ca3af; margin-top: 2px; }

        .pg-card {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
          padding: 24px;
        }
        .pg-card-title {
          font-size: 14px; font-weight: 700; color: #111827;
          margin-bottom: 18px; padding-bottom: 12px;
          border-bottom: 1px solid #f3f4f6;
        }

        .pg-avatar {
          width: 88px; height: 88px; border-radius: 50%;
          background: linear-gradient(135deg, #8C0000, #c0392b);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0;
        }
        .pg-avatar-ring { position: relative; display: inline-block; }
        .pg-avatar-overlay {
          position: absolute; inset: 0; border-radius: 50%;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.15s;
        }
        .pg-avatar-ring:hover .pg-avatar-overlay { opacity: 1; }

        .pg-label {
          display: block; font-size: 12.5px; font-weight: 600;
          color: #374151; margin-bottom: 5px;
        }
        .pg-hint { font-size: 11.5px; color: #9ca3af; margin-top: 4px; }

        .pg-input {
          width: 100%; padding: 9px 12px;
          border: 1.5px solid #e5e7eb; border-radius: 8px;
          font-size: 13.5px; color: #111827; background: #fafafa;
          outline: none; font-family: 'DM Sans', sans-serif;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .pg-input:focus { border-color: #8C0000; background: #fff; box-shadow: 0 0 0 3px rgba(140,0,0,0.07); }
        .pg-input:disabled { background: #f3f4f6; color: #9ca3af; cursor: not-allowed; }

        .pg-input-wrap {
          display: flex; align-items: center; gap: 6px;
          border: 1.5px solid #e5e7eb; border-radius: 8px;
          padding: 0 10px 0 0; background: #fafafa;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .pg-input-wrap:focus-within { border-color: #8C0000; background: #fff; box-shadow: 0 0 0 3px rgba(140,0,0,0.07); }
        .pg-input-wrap.error:focus-within { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
        .pg-input-wrap.success:focus-within { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.08); }
        .pg-input-inner {
          flex: 1; padding: 9px 12px; border: none; outline: none;
          font-size: 13.5px; color: #111827; background: transparent;
          font-family: 'DM Sans', sans-serif;
        }
        .pg-eye-btn {
          background: none; border: none; cursor: pointer; padding: 2px;
          color: #9ca3af; display: flex; align-items: center; flex-shrink: 0;
          transition: color 0.15s;
        }
        .pg-eye-btn:hover { color: #374151; }

        .pg-btn-primary {
          padding: 10px 18px; border: none; border-radius: 8px;
          background: linear-gradient(135deg, #a01010, #8C0000, #6e0000);
          color: #fff; font-size: 13.5px; font-weight: 600;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all 0.18s;
          box-shadow: 0 2px 8px rgba(140,0,0,0.25);
        }
        .pg-btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #b01818, #9a0000, #7a0000);
          transform: translateY(-1px); box-shadow: 0 4px 14px rgba(140,0,0,0.35);
        }
        .pg-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .pg-btn-outline {
          padding: 9px 16px; border: 1.5px solid #e5e7eb; border-radius: 8px;
          background: #fff; color: #374151; font-size: 13.5px; font-weight: 600;
          cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s;
        }
        .pg-btn-outline:hover:not(:disabled) { border-color: #8C0000; color: #8C0000; }
        .pg-btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }

        .pg-btn-ghost-danger {
          background: none; border: none; font-size: 12.5px; font-weight: 600;
          color: #dc2626; cursor: pointer; font-family: 'DM Sans', sans-serif;
          padding: 4px 8px; border-radius: 6px; transition: background 0.15s;
        }
        .pg-btn-ghost-danger:hover { background: #fef2f2; }
        .pg-btn-ghost-danger:disabled { opacity: 0.5; cursor: not-allowed; }

        .pg-info-row {
          display: flex; flex-direction: column; gap: 4;
          padding: 14px 0; border-bottom: 1px solid #f3f4f6;
        }
        .pg-info-row:last-child { border-bottom: none; padding-bottom: 0; }
        .pg-info-row:first-child { padding-top: 0; }
        .pg-info-label { font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; }
        .pg-info-value { font-size: 13.5px; color: #111827; font-weight: 500; word-break: break-all; }
        .pg-id-box {
          font-family: monospace; font-size: 11.5px; color: #6b7280;
          background: #f9fafb; border: 1px solid #e5e7eb;
          padding: 8px 10px; border-radius: 6px; word-break: break-all;
        }

        .pg-skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .pg-layout {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 18px;
          align-items: start;
        }
        @media (max-width: 860px) {
          .pg-layout { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="pg-title">Pengaturan Akun</div>
        <div className="pg-subtitle">Kelola profil, keamanan, dan informasi akun Anda</div>
      </div>

      <div className="pg-layout">
        {/* Kolom kiri */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Foto Profil */}
          <SectionCard title="Foto Profil">
            <AvatarUpload
              user={user}
              onSaved={url => setUser(u => u ? { ...u, image: url || null } : u)}
            />
          </SectionCard>

          {/* Info akun (readonly) */}
          <SectionCard title="Informasi Akun">
            <div className="pg-info-row">
              <span className="pg-info-label">ID Pengguna</span>
              <div className="pg-id-box">{user.id}</div>
            </div>
            <div className="pg-info-row">
              <span className="pg-info-label">Bergabung Sejak</span>
              <span className="pg-info-value">{formatDate(user.createdAt)}</span>
            </div>
            <div className="pg-info-row">
              <span className="pg-info-label">Terakhir Diperbarui</span>
              <span className="pg-info-value">{formatDate(user.updatedAt)}</span>
            </div>
          </SectionCard>

        </div>

        {/* Kolom kanan */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Edit profil */}
          <SectionCard title="Edit Profil">
            <ProfileInfo
              user={user}
              onSaved={name => setUser(u => u ? { ...u, name } : u)}
            />
          </SectionCard>

          {/* Verifikasi email */}
          <SectionCard title="Verifikasi Email">
            <EmailVerification user={user} />
          </SectionCard>

          {/* Keamanan */}
          <SectionCard title="Ubah Password">
            <ChangePassword />
          </SectionCard>

        </div>
      </div>
    </>
  )
}
