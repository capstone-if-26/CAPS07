"use client";

import React, { useState, useEffect, useCallback } from "react";

// Types

type Dokumen = {
  id: string;
  name: string;
  namespace: string;
  documentType: string;
  totalChunks: number;
  fileName: string;
  statusDocument: string;
  version: string;
  effectiveDate: string | null;
  processingStatus: string;
  createdAt: string;
  description?: string;
  errorMessage?: string | null;
  updatedAt?: string;
};

type Meta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ToastState = { message: string; type: "success" | "error" } | null;
type ModalState = { type: "detail" | "status" | "hapus"; doc: Dokumen } | null;

// Helpers

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d
    .toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "/");
};

const getStatusDocBadge = (status: string) => {
  const s = status?.toLowerCase();
  if (s === "berlaku")
    return { label: "Berlaku", bg: "#dcfce7", color: "#15803d" };
  if (s === "dicabut")
    return { label: "Dicabut", bg: "#fee2e2", color: "#dc2626" };
  return { label: status || "—", bg: "#f3f4f6", color: "#6b7280" };
};

const getStatusProsessBadge = (status: string) => {
  const s = status?.toLowerCase();
  if (s === "completed")
    return { label: "Selesai", bg: "#dcfce7", color: "#15803d" };
  if (s === "processing")
    return { label: "Proses", bg: "#fef9c3", color: "#b45309" };
  if (s === "failed")
    return { label: "Gagal", bg: "#fee2e2", color: "#dc2626" };
  return { label: status || "—", bg: "#f3f4f6", color: "#6b7280" };
};

// Toast

function Toast({
  message,
  type,
  onDone,
}: {
  message: string;
  type: "success" | "error";
  onDone: () => void;
}) {
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2800);
    const t2 = setTimeout(() => onDone(), 3100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: "translateX(-50%)",
        background: type === "error" ? "#dc2626" : "#111827",
        color: "#fff",
        padding: "13px 22px",
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: 500,
        boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        whiteSpace: "nowrap",
        opacity: exiting ? 0 : 1,
        transition: exiting ? "opacity 0.3s ease" : "none",
      }}
    >
      {type === "success" ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4ade80"
          strokeWidth="2.5"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      {message}
    </div>
  );
}

// Popup aksi
function AksiPopup({
  top,
  right,
  onClose,
  onDetail,
  onUpdateStatus,
  onHapus,
}: {
  top: number;
  right: number;
  onClose: () => void;
  onDetail: () => void;
  onUpdateStatus: () => void;
  onHapus: () => void;
}) {
  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    width: "100%",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: 13,
    color: "#374151",
    textAlign: "left",
    fontFamily: "inherit",
  };
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 998 }}
      />
      <div
        style={{
          position: "fixed",
          top: top,
          right: right,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 6px 24px rgba(0,0,0,0.13)",
          zIndex: 9999,
          minWidth: 185,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px 10px",
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
            Aksi
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9ca3af",
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Lihat detail */}
        <button
          style={itemStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          onClick={() => {
            onDetail();
            onClose();
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Lihat Detail
        </button>

        {/* Update status */}
        <button
          style={itemStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          onClick={() => {
            onUpdateStatus();
            onClose();
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Update Status
        </button>

        {/* Hapus dokumen */}
        <button
          style={{ ...itemStyle, color: "#dc2626" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          onClick={() => {
            onHapus();
            onClose();
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          Hapus Dokumen
        </button>
      </div>
    </>
  );
}

// Modal detail
function DetailModal({
  doc: initialDoc,
  onClose,
}: {
  doc: Dokumen;
  onClose: () => void;
}) {
  const [doc, setDoc] = useState<Dokumen>(initialDoc);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/documents/${initialDoc.id}`);
        const json = await res.json();
        if (json.status && json.data) setDoc(json.data);
        else setError(json.message ?? "Gagal mengambil detail dokumen");
      } catch {
        setError("Terjadi kesalahan jaringan");
      } finally {
        setLoading(false);
      }
    })();
  }, [initialDoc.id]);

  const statusDoc = getStatusDocBadge(doc.statusDocument);
  const statusProses = getStatusProsessBadge(doc.processingStatus);

  const rows: [string, React.ReactNode][] = [
    ["Nama", doc.name],
    ["Namaspace", doc.namespace],
    ["Deskripsi", doc.description ?? "—"],
    ["Tipe Dokumen", doc.documentType],
    ["Total Chunks", doc.totalChunks?.toLocaleString("id-ID") ?? "—"],

    [
      "Status Dokumen",
      <span
        key="status-doc"
        style={{
          background: statusDoc.bg,
          color: statusDoc.color,
          padding: "2px 10px",
          borderRadius: 20,
          fontSize: 11.5,
          fontWeight: 600,
        }}
      >
        {statusDoc.label}
      </span>,
    ],

    ["Version", doc.version ?? "—"],
    ["Tanggal Berlaku", formatDate(doc.effectiveDate)],

    [
      "Status Pemrosesan",
      <span
        key="status-proses"
        style={{
          background: statusProses.bg,
          color: statusProses.color,
          padding: "2px 10px",
          borderRadius: 20,
          fontSize: 11.5,
          fontWeight: 600,
        }}
      >
        {statusProses.label}
      </span>,
    ],

    ["Tanggal Diunggah", formatDate(doc.createdAt)],
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "28px 28px 24px",
          width: 520,
          maxWidth: "95vw",
          position: "relative",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 16,
          }}
        >
          Detail Dokumen
        </div>
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9ca3af",
            display: "flex",
            padding: 4,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #111827",
            margin: "0 0 20px",
          }}
        />

        {error ? (
          <div
            style={{
              color: "#dc2626",
              fontSize: 13,
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            {error}
          </div>
        ) : loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              rowGap: 16,
              columnGap: 12,
            }}
          >
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 13,
                  borderRadius: 4,
                  background:
                    "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "dok-shimmer 1.4s infinite",
                  width: i % 2 === 0 ? "65%" : "88%",
                }}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              rowGap: 14,
              columnGap: 12,
              fontSize: 13,
            }}
          >
            {rows.map(([label, value], i) => (
              <React.Fragment key={i}>
                <div style={{ color: "#6b7280", fontWeight: 500 }}>{label}</div>
                <div
                  style={{
                    color: "#111827",
                    fontWeight: 500,
                    wordBreak: "break-word",
                  }}
                >
                  {value}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Modal update status
function UpdateStatusModal({
  doc,
  onClose,
  onSaved,
}: {
  doc: Dokumen;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState(doc.statusDocument ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimpan = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_status: selected }),
      });
      const json = await res.json();
      if (json.status) {
        onSaved();
        onClose();
      } else setError(json.message ?? "Gagal memperbarui status");
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  const options = [
    { label: "Berlaku", color: "#15803d" },
    { label: "Dicabut", color: "#dc2626" },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "28px 28px 24px",
          width: 380,
          maxWidth: "95vw",
          position: "relative",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 20,
          }}
        >
          Update Status Dokumen
        </div>
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9ca3af",
            display: "flex",
            padding: 4,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 6,
          }}
        >
          Status Dokumen <span style={{ color: "#dc2626" }}>*</span>
        </div>

        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={loading}
          style={{
            width: "100%",
            padding: "9px 32px 9px 12px",
            border: "1.5px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 13,
            color: "#374151",
            background: "#fff",
            fontFamily: "inherit",
            cursor: "pointer",
            outline: "none",
            appearance: "none",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
          }}
        >
          <option value="" disabled>
            Pilih Status Dokumen
          </option>
          {options.map((o) => (
            <option key={o.label} value={o.label}>
              {o.label}
            </option>
          ))}
        </select>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {options.map((o) => (
            <div
              key={o.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
                color: "#374151",
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: o.color,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {o.label}
            </div>
          ))}
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              color: "#dc2626",
              fontSize: 12.5,
              background: "#fef2f2",
              padding: "8px 12px",
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleSimpan}
          disabled={loading || !selected}
          style={{
            marginTop: 20,
            width: "100%",
            padding: "10px",
            background: loading || !selected ? "#f87171" : "#8C0000",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: loading || !selected ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {loading && (
            <span
              style={{
                width: 14,
                height: 14,
                border: "2px solid rgba(255,255,255,0.4)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
                display: "inline-block",
              }}
            />
          )}
          {loading ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}

// Modal hapus
function HapusModal({
  doc,
  onClose,
  onDeleted,
}: {
  doc: Dokumen;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleHapus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status) {
        onDeleted();
        onClose();
      } else setError(json.message ?? "Gagal menghapus dokumen");
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={loading ? undefined : onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "28px 28px 24px",
          width: 360,
          maxWidth: "95vw",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#9e0404",
              marginBottom: 12,
            }}
          >
            Hapus Dokumen
          </div>
          <div
            style={{
              background: "#fef2f2",
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 4,
            }}
          >
            <p
              style={{
                fontSize: 13.5,
                color: "#374151",
                lineHeight: 1.6,
                margin: "0 0 6px",
              }}
            >
              Yakin ingin menghapus dokumen{" "}
              <strong>&ldquo;{doc.name}&rdquo;</strong>?
            </p>
            <p
              style={{
                fontSize: 12.5,
                color: "#ba0e0e",
                margin: 0,
                fontWeight: 500,
              }}
            >
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              color: "#ba0e0e",
              fontSize: 12.5,
              background: "#fef2f2",
              padding: "8px 12px",
              borderRadius: 8,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: 10,
              background: "#fff",
              color: "#374151",
              border: "1.5px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Batal
          </button>
          <button
            onClick={handleHapus}
            disabled={loading}
            style={{
              flex: 1,
              padding: 10,
              background: loading ? "#fca5a5" : "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading && (
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                  display: "inline-block",
                }}
              />
            )}
            {loading ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Tambah dokumen
function TambahDokumenModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (name: string) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    documentType: "",
    namespace: "",
    description: "",
    version: "",
    language: "",
    effectiveDate: "",
    statusDocument: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAllowedFileTypes = (docType: string) => {
    if (docType === "faq" || docType === "legal_document") {
      return { accept: ".pdf,.docx", label: "PDF, DOCX" }
    }
    if (docType) {
      return { accept: ".txt,.md", label: "TXT, MD" }
    }
    return { accept: ".pdf,.docx,.txt,.md", label: "PDF, DOCX, TXT, MD" }
  }

  const TIPE_OPTIONS = [
    "legal_document",
    "procedure_sop",
    "educational_material",
    "faq",
    "news_event",
    "circular_letter",
    "attachment",
  ];
  const STATUS_OPTIONS = ["Berlaku", "Dicabut"];

  const handleFile = (f: File) => setFile(f);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSimpan = async () => {
    if (
      !form.name ||
      !form.documentType ||
      !form.namespace ||
      !form.description
    ) {
      setError("Nama, Tipe Dokumen, Namespace, dan Deskripsi wajib diisi.");
      return;
    }
    if (!file) {
      setError("File wajib diunggah.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("documentName", form.name);
      fd.append("documentType", form.documentType);
      fd.append("namespaceName", form.namespace);
      fd.append("description", form.description);
      if (form.version) fd.append("documentVersion", form.version);
      if (form.language) fd.append("language", form.language);
      if (form.effectiveDate) fd.append("effectiveDate", form.effectiveDate);
      if (form.statusDocument) fd.append("statusDocument", form.statusDocument);
      fd.append("file", file);

      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const json = await res.json();
      if (json.status) {
        onAdded(form.name);
        onClose();
      } else setError(json.message ?? "Gagal menambahkan dokumen");
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: "1.5px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 13,
    color: "#374151",
    background: "#fff",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 4,
    display: "block",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "24px 28px",
          width: 580,
          maxWidth: "95vw",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>
            Tambah Dokumen
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9ca3af",
              display: "flex",
              padding: 4,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px 20px",
          }}
        >
          {/* Nama dokumen */}
          <div>
            <label style={labelStyle}>
              Nama Dokumen <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              style={inputStyle}
              placeholder="Masukkan nama dokumen"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* Versi */}
          <div>
            <label style={labelStyle}>Versi (opsional)</label>
            <input
              style={inputStyle}
              placeholder="Contoh: 1.0"
              value={form.version}
              onChange={(e) =>
                setForm((p) => ({ ...p, version: e.target.value }))
              }
            />
          </div>

          {/* Tipe dokumen */}
          <div>
            <label style={labelStyle}>
              Tipe Dokumen <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              style={{
                ...inputStyle,
                appearance: "none",
                cursor: "pointer",
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                paddingRight: 32,
              }}
              value={form.documentType}
              onChange={(e) =>
                setForm((p) => ({ ...p, documentType: e.target.value }))
              }
            >
              <option value="" disabled>
                Pilih tipe dokumen
              </option>
              {TIPE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* Bahasa */}
          <div>
            <label style={labelStyle}>Bahasa (opsional)</label>
            <select
              style={{
                ...inputStyle,
                appearance: "none",
                cursor: "pointer",
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                paddingRight: 32,
              }}
              value={form.language}
              onChange={(e) =>
                setForm((p) => ({ ...p, language: e.target.value }))
              }
            >
              <option value="">Pilih Bahasa</option>
              <option value="id">Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Namespace */}
          <div>
            <label style={labelStyle}>
              Namespace <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              style={inputStyle}
              placeholder="Masukkan namespace"
              value={form.namespace}
              onChange={(e) =>
                setForm((p) => ({ ...p, namespace: e.target.value }))
              }
            />
          </div>

          {/* Tanggal berlaku */}
          <div>
            <label style={labelStyle}>Tanggal Berlaku (opsional)</label>
            <input
              style={inputStyle}
              type="date"
              placeholder="dd/mm/yyyy"
              value={form.effectiveDate}
              onChange={(e) =>
                setForm((p) => ({ ...p, effectiveDate: e.target.value }))
              }
            />
          </div>

          {/* Deskripsi */}
          <div>
            <label style={labelStyle}>
              Deskripsi <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              style={inputStyle}
              placeholder="Masukkan namespace"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>

          {/* File upload */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>
              File <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() =>
                document.getElementById("tambah-doc-file")?.click()
              }
              style={{
                border: `2px dashed ${dragOver ? "#8C0000" : "#e5e7eb"}`,
                borderRadius: 10,
                padding: "20px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                background: dragOver ? "#fef2f2" : "#fafafa",
                transition: "all 0.15s",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="1.5"
              >
                <polyline points="16 16 12 12 8 16" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              </svg>
              {file ? (
                <span
                  style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}
                >
                  {file.name}
                </span>
              ) : (
                <>
                  <span style={{ fontSize: 13, color: "#374151" }}>
                    Drag & drop file atau
                  </span>
                  <span
                    style={{ fontSize: 13, color: "#8C0000", fontWeight: 600 }}
                  >
                    Pilih file ({getAllowedFileTypes(form.documentType).label})
                  </span>
                </>
              )}
            </div>
            <input
              id="tambah-doc-file"
              type="file"
              accept={getAllowedFileTypes(form.documentType).accept}
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 14,
              color: "#dc2626",
              fontSize: 12.5,
              background: "#fef2f2",
              padding: "8px 12px",
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 20,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "9px 20px",
              background: "#fff",
              color: "#374151",
              border: "1.5px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSimpan}
            disabled={loading}
            style={{
              padding: "9px 24px",
              background: loading ? "#f87171" : "#8C0000",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {loading && (
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                  display: "inline-block",
                }}
              />
            )}
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Page
export default function DokumenPage() {
  const [docs, setDocs] = useState<Dokumen[]>([]);
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });
  const [modal, setModal] = useState<ModalState>(null);
  const [showTambah, setShowTambah] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/documents?${params}`);
      const json = await res.json();
      if (json.status) {
        setDocs(json.data.documents);
        setMeta(json.data.metadata);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const getPaginationPages = () => {
    const total = meta.totalPages;
    const cur = meta.page;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (cur > 3) pages.push("...");
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++)
      pages.push(i);
    if (cur < total - 2) pages.push("...");
    pages.push(total);
    return pages;
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Modals */}
      {modal?.type === "detail" && (
        <DetailModal doc={modal.doc} onClose={() => setModal(null)} />
      )}
      {modal?.type === "status" && (
        <UpdateStatusModal
          doc={modal.doc}
          onClose={() => setModal(null)}
          onSaved={() => {
            showToast(
              `Status dokumen "${modal.doc.name}" berhasil diperbarui!`,
            );
            fetchDocs();
          }}
        />
      )}
      {modal?.type === "hapus" && (
        <HapusModal
          doc={modal.doc}
          onClose={() => setModal(null)}
          onDeleted={() => {
            showToast(`Dokumen "${modal.doc.name}" berhasil dihapus!`);
            fetchDocs();
          }}
        />
      )}

      {showTambah && (
        <TambahDokumenModal
          onClose={() => setShowTambah(false)}
          onAdded={(name) => {
            showToast(`Dokumen "${name}" berhasil ditambahkan!`);
            fetchDocs();
          }}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dok-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        .dok-topbar {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .dok-search-wrap {
          display: flex;
          align-items: center;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 7px 12px;
          gap: 8px;
          min-width: 200px;
        }
        .dok-search-wrap input {
          border: none;
          outline: none;
          font-size: 13px;
          color: #374151;
          background: transparent;
          width: 100%;
          font-family: inherit;
        }
        .dok-search-wrap input::placeholder { color: #9ca3af; }
        .dok-btn-filter {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          font-family: inherit;
          transition: border-color 0.15s;
        }
        .dok-btn-filter:hover { border-color: #8C0000; color: #8C0000; }
        .dok-btn-add {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          background: #8C0000;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s;
          white-space: nowrap;
        }
        .dok-btn-add:hover { background: #6e0000; }
        .dok-table-wrap {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.07);
          overflow: hidden;
          width: 100%;
        }
        .dok-title {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          padding: 20px 24px 16px;
        }
        .dok-table {
          min-width: 1000px;
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }
        .dok-table th {
          padding: 10px 14px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          border-bottom: 1.5px solid #e5e7eb;
          white-space: nowrap;
          background: #fff;
        }
        .dok-table td {
          padding: 13px 14px;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
          font-size: 12.5px;
          vertical-align: middle;
        }
        .dok-table tr:last-child td { border-bottom: none; }
        .dok-table tr:hover td { background: #fafafa; }
        .status-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11.5px;
          font-weight: 600;
          white-space: nowrap;
        }
        .dok-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          border-top: 1px solid #f3f4f6;
          flex-wrap: wrap;
          gap: 8px;
        }
        .dok-pag-info { font-size: 12px; color: #6b7280; }
        .dok-pag-btns { display: flex; align-items: center; gap: 4px; }
        .dok-pag-btn {
          width: 30px; height: 30px;
          border-radius: 6px; border: none;
          background: transparent;
          font-size: 12.5px; font-weight: 500; color: #374151;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; font-family: inherit;
        }
        .dok-pag-btn:hover { background: #f3f4f6; }
        .dok-pag-btn.active { background: #8C0000; color: #fff; font-weight: 700; }
        .dok-pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .dok-table-scroll { width: 100%; overflow-x: auto; overflow-y: hidden; }
        .skeleton-row td { padding: 13px 14px; border-bottom: 1px solid #f3f4f6; }
        .skeleton-cell {
          height: 14px; border-radius: 4px;
          background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
          background-size: 200% 100%;
          animation: dok-shimmer 1.4s infinite;
        }
        .dok-aksi-wrap { position: relative; display: inline-block; }
        .dok-aksi-btn {
          background: none; border: none; cursor: pointer;
          font-size: 18px; color: #6b7280; padding: 4px 8px;
          letter-spacing: 2px; border-radius: 6px; line-height: 1;
          display: flex; align-items: center;
        }
        .dok-aksi-btn:hover { background: #f3f4f6; }
        @media (max-width: 900px) { .dok-topbar { justify-content: flex-start; } }
      `}</style>

      {/* Top bar */}
      <div className="dok-topbar">
        <div className="dok-search-wrap">
          <input
            type="text"
            placeholder="Cari Dokumen"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <svg
            onClick={handleSearch}
            style={{ cursor: "pointer", flexShrink: 0 }}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <button className="dok-btn-filter">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filter
        </button>
        <button className="dok-btn-add" onClick={() => setShowTambah(true)}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Dokumen
        </button>
      </div>

      {/* Table */}
      <div
        className="dok-table-wrap"
        onClick={() => setOpenMenu(null)}
        style={{ width: "100%", overflow: "hidden" }}
      >
        <div className="dok-title">Dokumen</div>
        <div className="dok-table-scroll">
          <table className="dok-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Namaspace</th>
                <th>Tipe Dokumen</th>
                <th>Total Chunks</th>
                <th>Nama File</th>
                <th>Status Dokumen</th>
                <th>Version</th>
                <th>Tanggal Berlaku</th>
                <th>Status Pemrosesan</th>
                <th>Tanggal Diunggah</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    {[...Array(11)].map((_, j) => (
                      <td key={j}>
                        <div
                          className="skeleton-cell"
                          style={{ width: j === 0 ? 160 : j === 10 ? 40 : 80 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : docs.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    style={{
                      textAlign: "center",
                      color: "#9ca3af",
                      padding: 40,
                      fontSize: 13,
                    }}
                  >
                    Tidak ada dokumen ditemukan
                  </td>
                </tr>
              ) : (
                docs.map((doc) => {
                  const statusDoc = getStatusDocBadge(doc.statusDocument);
                  const statusProses = getStatusProsessBadge(
                    doc.processingStatus,
                  );
                  return (
                    <tr key={doc.id}>
                      <td
                        style={{
                          fontWeight: 500,
                          color: "#111827",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {doc.name}
                      </td>
                      <td style={{ color: "#6b7280" }}>{doc.namespace}</td>
                      <td style={{ color: "#6b7280" }}>{doc.documentType}</td>
                      <td style={{ textAlign: "center" }}>
                        {doc.totalChunks?.toLocaleString("id-ID") ?? "—"}
                      </td>
                      <td style={{ color: "#6b7280" }}>{doc.fileName}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            background: statusDoc.bg,
                            color: statusDoc.color,
                          }}
                        >
                          {statusDoc.label}
                        </span>
                      </td>
                      <td>{doc.version ?? "—"}</td>
                      <td>{formatDate(doc.effectiveDate)}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            background: statusProses.bg,
                            color: statusProses.color,
                          }}
                        >
                          {statusProses.label}
                        </span>
                      </td>
                      <td>{formatDate(doc.createdAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="dok-aksi-wrap">
                          <button
                            className="dok-aksi-btn"
                            onClick={(e) => {
                              const rect = (
                                e.currentTarget as HTMLElement
                              ).getBoundingClientRect();
                              const popupHeight = 160;
                              const spaceBelow =
                                window.innerHeight - rect.bottom;
                              const top =
                                spaceBelow < popupHeight
                                  ? rect.top - popupHeight - 4
                                  : rect.bottom + 4;
                              setPopupPos({
                                top,
                                right: window.innerWidth - rect.right,
                              });
                              setOpenMenu(openMenu === doc.id ? null : doc.id);
                            }}
                          >
                            •••
                          </button>
                          {openMenu === doc.id && (
                            <AksiPopup
                              top={popupPos.top}
                              right={popupPos.right}
                              onClose={() => setOpenMenu(null)}
                              onDetail={() => {
                                setModal({ type: "detail", doc });
                                setOpenMenu(null);
                              }}
                              onUpdateStatus={() => {
                                setModal({ type: "status", doc });
                                setOpenMenu(null);
                              }}
                              onHapus={() => {
                                setModal({ type: "hapus", doc });
                                setOpenMenu(null);
                              }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="dok-pagination">
          <span className="dok-pag-info">
            Menampilkan {Math.min((meta.page - 1) * meta.limit + 1, meta.total)}{" "}
            - {Math.min(meta.page * meta.limit, meta.total)} dari {meta.total}{" "}
            data
          </span>
          <div className="dok-pag-btns">
            <button
              className="dok-pag-btn"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            {getPaginationPages().map((p, i) =>
              p === "..." ? (
                <span
                  key={i}
                  className="dok-pag-btn"
                  style={{ cursor: "default" }}
                >
                  ...
                </span>
              ) : (
                <button
                  key={i}
                  className={`dok-pag-btn${meta.page === p ? " active" : ""}`}
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </button>
              ),
            )}
            <button
              className="dok-pag-btn"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
