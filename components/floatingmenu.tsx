"use client"
import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import {
  startNewChat,
  continueChat,
  getChatHistory,
  saveChatId,
  getSavedChatId,
  clearChatId,
  type Message,
} from "@/lib/api/chat"

type UIMessage = { text: string; sender: "user" | "bot" }
type ChatHistory = { id: string; title: string }

// Menu cepat (shortcut pertanyaan)
const QUICK_MENU = [
  "Cek Legalitas Pinjol / Investasi",
  "Hak Saya sebagai Konsumen Keuangan",
  "Panduan Produk Bank (Tabungan, Kredit, KPR)",
  "Cek SLIK / Riwayat Kredit Saya",
  "Panduan Investasi & Kripto Aman",
  "Literasi & Tips Keuangan Harian",
  "Kenali Modus Penipuan Keuangan",
  "Cara Lapor / Pengaduan ke OJK",
]

// Tooltip component
function Tooltip({
  label,
  anchor = "center",
  dir = "up",
}: {
  label: string
  anchor?: "center" | "right" | "left"
  dir?: "up" | "down"
}) {
  const posStyle: React.CSSProperties =
    anchor === "right"
      ? { right: 0, left: "auto", transform: "none" }
      : anchor === "left"
      ? { left: 0, right: "auto", transform: "none" }
      : { left: "50%", transform: "translateX(-50%)" }

  const arrowLeft = anchor === "right" ? "auto" : anchor === "left" ? "10px" : "50%"
  const arrowRight = anchor === "right" ? "8px" : "auto"
  const arrowTransform = anchor === "center" ? "translateX(-50%)" : "none"

  const boxPos: React.CSSProperties =
    dir === "down"
      ? { top: "calc(100% + 6px)", bottom: "auto" }
      : { bottom: "calc(100% + 6px)", top: "auto" }

  return (
    <div style={{
      position: "absolute",
      ...boxPos,
      ...posStyle,
      background: "white",
      color: "#8C0000",
      fontSize: "9px",
      fontWeight: 600,
      padding: "3px 7px",
      borderRadius: "4px",
      whiteSpace: "nowrap",
      border: "0.5px solid #c21f26",
      pointerEvents: "none",
      zIndex: 9999,
      boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
    }}>
      {label}
      {dir === "down" ? (
        /* panah ke atas (tooltip di bawah elemen) */
        <span style={{
          position: "absolute", bottom: "100%",
          left: arrowLeft, right: arrowRight, transform: arrowTransform,
          width: 0, height: 0,
          borderLeft: "4px solid transparent", borderRight: "4px solid transparent",
          borderBottom: "4px solid #c21f26",
        }} />
      ) : (
        /* panah ke bawah (tooltip di atas elemen) */
        <span style={{
          position: "absolute", top: "100%",
          left: arrowLeft, right: arrowRight, transform: arrowTransform,
          width: 0, height: 0,
          borderLeft: "4px solid transparent", borderRight: "4px solid transparent",
          borderTop: "4px solid #c21f26",
        }} />
      )}
    </div>
  )
}

// Dropdown hapus
function HapusDropdown({
  itemId,
  btnRef,
  onHapus,
  onClose,
}: {
  itemId: string
  btnRef: React.RefObject<HTMLButtonElement>
  onHapus: (id: string) => void
  onClose: () => void
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({
        top: rect.top - 4,
        left: rect.right - 85,
      })
    }
  }, [btnRef])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [btnRef, onClose])

  if (!pos) return null

  return (
    <div
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        transform: "translateY(-100%)",
        background: "white",
        border: "0.8px solid #c21f26",
        borderRadius: "4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        minWidth: "85px",
        zIndex: 99999,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onHapus(itemId)
          onClose()
        }}
        className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-gray-900 hover:bg-red-50 flex items-center gap-1.5 transition"
      >
        <Image src="/ikon-hapus.png" alt="hapus" width={11} height={11} />
        Hapus
      </button>
    </div>
  )
}

// Item riwayat
function RiwayatItem({
  item,
  isActive,
  onToggleMenu,
  onHapus,
  onLoad,
  onCloseMenu,
}: {
  item: ChatHistory
  isActive: boolean
  onToggleMenu: (id: string) => void
  onHapus: (id: string) => void
  onLoad: (id: string) => void
  onCloseMenu: () => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null!)

  return (
    <div className="flex items-center justify-between px-3 py-1 hover:bg-red-50 transition group relative">
      <button
        onClick={() => onLoad(item.id)}
        className="flex-1 text-left text-[10px] font-semibold text-gray-800 truncate pr-2 group-hover:text-[#a11212] transition"
      >
        {item.title}
      </button>

      <div className="relative flex-shrink-0">
        <button
          ref={btnRef}
          onClick={() => onToggleMenu(item.id)}
          className="text-[#a11212] hover:opacity-70 text-[13px] font-bold px-1 leading-none transition"
        >
          ···
        </button>

        {/* Dropdown hapus*/}
        {isActive && (
          <HapusDropdown
            itemId={item.id}
            btnRef={btnRef}
            onHapus={onHapus}
            onClose={onCloseMenu}
          />
        )}
      </div>
    </div>
  )
}

export default function FloatingMenu() {
  const [openChat, setOpenChat] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const [showDotMenu, setShowDotMenu] = useState(false)
  const [showRiwayat, setShowRiwayat] = useState(false)
  const [riwayatList, setRiwayatList] = useState<ChatHistory[]>([])
  const [activeItemMenu, setActiveItemMenu] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  const [tooltipClose, setTooltipClose] = useState(false)
  const [tooltipDot, setTooltipDot] = useState(false)
  const [tooltipSalin, setTooltipSalin] = useState(false)
  const [tooltipKirim, setTooltipKirim] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dotMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { clearChatId(); setMessages([]) }, [])

  useEffect(() => {
    if (!openChat) return
    const chatId = getSavedChatId()
    if (!chatId) return
    getChatHistory(chatId)
      .then((res) => {
        if (res.status && res.data.messages.length > 0) {
          setMessages(res.data.messages.map((m: Message) => ({
            text: m.content,
            sender: m.senderType === "user" ? "user" : "bot",
          })))
        }
      })
      .catch(() => clearChatId())
  }, [openChat])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const el = chatContainerRef.current
    if (!el) return
    const fn = () => {
      setShowScrollBtn(el.scrollHeight > el.clientHeight && el.scrollHeight - el.scrollTop - el.clientHeight >= 10)
    }
    fn(); el.addEventListener("scroll", fn)
    return () => el.removeEventListener("scroll", fn)
  }, [messages])

  // close dot menu
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node)) {
        setShowDotMenu(false)
      }
    }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = textareaRef.current
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 62) + "px" }
  }

  const handleSend = async (customText?: string) => {
    const text = (customText ?? input).trim()
    if (!text || isLoading) return
    setMessages((p) => [...p, { text, sender: "user" }])
    if (!customText) { setInput(""); if (textareaRef.current) textareaRef.current.style.height = "auto" }
    setIsLoading(true)
    try {
      const chatId = getSavedChatId()
      let answer = ""
      if (!chatId) {
        const res = await startNewChat(text)
        if (res.status) {
          saveChatId(res.data.chatId); answer = res.data.answer
          setRiwayatList((p) => [{ id: res.data.chatId, title: text.length > 40 ? text.substring(0, 40) + "..." : text }, ...p])
        }
      } else {
        const res = await continueChat(chatId, text)
        if (res.status) answer = res.data.answer
      }
      setMessages((p) => [...p, { text: answer || "Maaf, terjadi kesalahan pada server.", sender: "bot" }])
    } catch {
      setMessages((p) => [...p, { text: "Maaf, tidak dapat terhubung ke server. Silakan coba beberapa saat lagi.", sender: "bot" }])
    } finally { setIsLoading(false) }
  }

  const handleChatBaru = () => { clearChatId(); setMessages([]); setShowDotMenu(false); setShowRiwayat(false) }

  // Toggle riwayat
  const handleHapusRiwayat = (id: string) => {
  setRiwayatList((prev) => {
    const updated = prev.filter((item) => item.id !== id)
    // Jika riwayat habis, otomatis tutup panel & reset chat
    if (updated.length === 0) {
      clearChatId()
      setMessages([])
      setShowRiwayat(false)
    }
    return updated
  })
  setActiveItemMenu(null)
}

  const handleLoadRiwayat = (id: string) => {
    saveChatId(id)
    getChatHistory(id).then((res) => {
      if (res.status && res.data.messages.length > 0)
        setMessages(res.data.messages.map((m: Message) => ({ text: m.content, sender: m.senderType === "user" ? "user" : "bot" })))
    }).catch(() => {})
    setShowRiwayat(false)
  }

  const handleCopy = () => {
    if (!messages.length) return
    navigator.clipboard.writeText(messages.map((m) => `${m.sender === "user" ? "Saya" : "ROJAK"}: ${m.text}`).join("\n\n"))
      .then(() => { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000) })
  }

  const handleToggleRiwayat = () => {
    if (showRiwayat) { setShowRiwayat(false) }
    else { setShowDotMenu(false); setShowRiwayat(true) }
  }

  return (
    <>
      <style>{`
        .chat-scroll::-webkit-scrollbar { display: none; }
        .chat-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        .dot-1 { animation: pulse-dot 1.2s infinite 0s; }
        .dot-2 { animation: pulse-dot 1.2s infinite 0.2s; }
        .dot-3 { animation: pulse-dot 1.2s infinite 0.4s; }
        .dot-menu-item:hover { background-color: rgba(140,0,0,0.08); color: #8C0000; }
        @keyframes slideInRiwayat {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Floating Button */}
      <div className="fixed right-4 bottom-4 flex flex-col gap-3 z-50">
        <div onClick={() => setOpenChat(!openChat)} className="w-10 h-10 rounded-full bg-[#a11212] flex items-center justify-center cursor-pointer shadow-md">
          <Image src="/avatar-botnew.png" alt="chatbot" width={39} height={39} />
        </div>
        <Image src="/ikon-wanew.png" alt="wa" width={39} height={39} />
        <Image src="/ikon-idnew.png" alt="id" width={39} height={39} />
        <Image src="/ikon-orangnew.png" alt="user" width={39} height={39} />
      </div>

      {/* Chat Window */}
      {openChat && (
        <div className="fixed inset-0 z-50 sm:bg-transparent sm:block sm:pointer-events-none flex flex-col">

          {/* Header Mobile (OJK) */}
          <div className="sm:hidden bg-white flex items-center justify-between px-6 py-3 relative w-full">
            <Image src="/ojk-logo.png" alt="ojk" width={120} height={38} />
            <Image src="/ikon-hamburger.png" alt="menu" width={24} height={24} onClick={() => setOpenMenu(!openMenu)} className="cursor-pointer translate-y-1" />
            {openMenu && (
              <div className="absolute top-full left-0 w-full bg-white border-t border-gray-200 shadow-md z-50">
                <ul className="flex flex-col text-[15px] font-bold text-gray-800 px-4 pt-2 pb-2">
                  {["Tentang OJK","Fungsi Utama","Publikasi","Regulasi","Statistik","Layanan","Kasir"].map((item) => (
                    <li key={item} className="cursor-pointer hover:text-red-700 py-3 border-b border-gray-100 last:border-0" onClick={() => setOpenMenu(false)}>{item}</li>
                  ))}
                </ul>

                {/* Search + ID */}
                <div className="px-4 pb-4 pt-2 flex items-center gap-3 border-t border-gray-100">
                  <div className="flex items-center bg-gray-100 rounded-full px-3 h-[34px] flex-1">
                    <Image src="/ikon-cari2.png" alt="search" width={14} height={14} className="opacity-50" />
                    <input type="text" className="bg-transparent outline-none ml-2 text-sm w-full" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">ID</div>
                </div>
              </div>
            )}
          </div>

          {/* Background merah */}
          <div className="bg-[#850C12] h-[100dvh] flex flex-col items-center justify-start pt-6 pb-6 sm:bg-transparent sm:block overflow-hidden">
            {/* card chat */}
            <div
                style={{ border: "1.5px solid #a11212" }}
                className="
                  chat-responsive
                  bg-[#f3f3f3]
                  shadow-[0_6px_18px_rgba(0,0,0,0.18)] 
    
                  w-[90vw] max-w-[380px]
                  h-full max-h-none min-h-0 
    
                  sm:fixed sm:right-18 sm:bottom-28
                  sm:w-[270px] sm:max-w-none sm:min-w-0
                  sm:h-[65vh] sm:max-h-none sm:min-h-0 
    
                  rounded-2xl flex flex-col
                  pointer-events-auto
                  overflow-hidden 
    
                  sm:shadow-[0_0_16px_2px_rgba(161,18,18,0.2),0_6px_18px_rgba(0,0,0,0.18)]
                "
            >

              {/* Header Chat */}
              <div
                className="bg-[#a11212] text-white px-3 py-1.5 flex items-center gap-2 font-semibold text-[13px] flex-shrink-0 relative"
                style={{ margin: "16px 16px 0 16px", borderRadius: showRiwayat ? "6px 6px 0 0" : "6px" }}
              >
                <Image src="/ikon-chtbotnew.png" alt="bot" width={19} height={19} />
                <span className="flex-1">Sahabat Keuangan</span>

                {/* Titik tiga */}
                <div ref={dotMenuRef} className="relative">
                  <div className="relative">
                    {tooltipDot && !showDotMenu && !showRiwayat && <Tooltip label="Menu" anchor="right" dir="down" />}
                    <button
                      onClick={() => {
                        if (showRiwayat) { setShowRiwayat(false); setTooltipDot(false) }
                        else { setShowDotMenu(!showDotMenu); setTooltipDot(false) }
                      }}
                      onMouseEnter={() => setTooltipDot(true)}
                      onMouseLeave={() => setTooltipDot(false)}
                      className="text-white font-bold text-[16px] px-1 hover:opacity-80 transition leading-none"
                    >⋮</button>
                  </div>
                  {showDotMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg z-50 overflow-hidden min-w-[130px]" style={{ border: "1px solid #e5e5e5" }}>
                      <button onClick={handleChatBaru} className="dot-menu-item w-full text-left px-3 py-2 text-[11px] font-semibold text-gray-800 transition">Chat Baru</button>
                      <div style={{ height: "1px", background: "#f0f0f0" }} />
                      <button onClick={handleToggleRiwayat} className="dot-menu-item w-full text-left px-3 py-2 text-[11px] font-semibold text-gray-800 transition">Riwayat Chat</button>
                    </div>
                  )}
                </div>

                {/* Tombol close */}
                <div className="relative">
                  {tooltipClose && <Tooltip label="Tutup" anchor="right" dir="down" />}
                  <Image
                    src="/ikon-closenew.png" alt="close" width={10} height={10}
                    onClick={() => { setOpenChat(false); setTooltipClose(false) }}
                    onMouseEnter={() => setTooltipClose(true)}
                    onMouseLeave={() => setTooltipClose(false)}
                    className="cursor-pointer hover:opacity-80 transition"
                  />
                </div>
              </div>

              {/* Panel Riwayat */}
              {showRiwayat && (
                <div
                  className="flex-shrink-0 z-30"
                  style={{
                    margin: "0 16px",
                    marginTop: "-1px",
                    background: "white",
                    boxShadow: "0 4px 12px rgba(140,0,0,0.10)",
                    border: "1px solid rgba(194,31,38,0.18)",
                    borderTop: "none",
                    borderRadius: "0 0 6px 6px",
                    animation: "slideInRiwayat 0.15s ease",
                  }}
                >
                  {/* Judul */}
                  <div
                    className="text-center font-bold text-[11px] py-2"
                    style={{ color: "#8C0000", borderBottom: "1px solid #eee" }}
                  >
                    Riwayat Chat
                  </div>

                  {/* List */}
                  <div className="flex flex-col pb-1">
                    {riwayatList.length === 0 ? (
                      <p className="text-[10px] text-gray-400 text-center py-4">Belum ada riwayat chat.</p>
                    ) : (
                      riwayatList.map((item) => (
                        <RiwayatItem
                          key={item.id}
                          item={item}
                          isActive={activeItemMenu === item.id}
                          onToggleMenu={(id) => setActiveItemMenu(activeItemMenu === id ? null : id)}
                          onHapus={handleHapusRiwayat}
                          onLoad={handleLoadRiwayat}
                          onCloseMenu={() => setActiveItemMenu(null)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Area chat + input */}
              <div
                className="flex-1 flex flex-col min-h-0 px-4 pb-4 pt-2 transition-all duration-200"
                style={{ filter: showRiwayat ? "blur(1.5px)" : "none" }}
              >
                {/* Scrollable content */}
                <div ref={chatContainerRef} className="chat-scroll flex-1 overflow-y-auto space-y-3 flex flex-col pr-1">
                  {/* Greeting ROJAK */}
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#a11212] flex-shrink-0">
                    <Image src="/ikon-chtbot2.png" alt="bot" width={16} height={16} className="rounded-full border border-[#a11212]" />
                    Sahabat Keuangan
                  </div>
                  <div className="bg-[#f3f3f3] text-black border border-[#a11212] rounded-md p-1.5 max-w-[85%] text-[11px] leading-tight mx-auto font-semibold flex-shrink-0">
                    Hai Sobat OJK! 👋 <br />
                    Kamu sekarang sudah terhubung dengan layanan resmi Otoritas Jasa Keuangan.<br /><br />
                    Kenalin, aku ROJAK (Robot Penjawab Kontak OJK) yang siap bantu kamu 😊<br /><br />
                    Mau cari info apa hari ini? Pilih aja layanan di bawah atau ketik langsung ya 👇
                  </div>
                  {/* Menu (hanya tampil jika belum ada pesan) */}
                  {messages.length === 0 && (
                    <div className="grid grid-cols-2 gap-1 mx-auto max-w-[85%] font-semibold flex-shrink-0">
                      {QUICK_MENU.map((label, i) => (
                        <button key={i} onClick={() => handleSend(label)} disabled={isLoading}
                          className="bg-[#a11212] text-white text-[9px] px-1.5 py-[3px] rounded w-full hover:bg-[#8a0f0f] transition-colors disabled:opacity-50">
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Daftar pesan */}
                  <div className="space-y-3 flex-1">
                    {messages.map((msg, i) => (
                      <div key={i} className="max-w-[85%] mx-auto flex flex-col">
                        <div className={`inline-block p-1.5 rounded-md text-[11px] leading-tight font-semibold max-w-full break-words ${msg.sender === "user" ? "bg-[#a11212] text-white self-end border border-[#a11212]" : "bg-[#f3f3f3] text-black self-start border border-[#a11212]"}`}>
                          <span className="break-words whitespace-pre-wrap">{msg.text}</span>
                        </div>
                      </div>
                    ))}

                    {/* Loading indicator*/}
                    {isLoading && (
                      <div className="max-w-[85%] mx-auto flex flex-col">
                        <div className="bg-[#f3f3f3] border border-[#a11212] rounded-md p-2 self-start flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#a11212] dot-1 inline-block" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#a11212] dot-2 inline-block" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#a11212] dot-3 inline-block" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>

                {/* Input + Kirim + Salin */}
                <div className="mt-2 flex items-end gap-1 flex-shrink-0">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault(); handleSend()
                        if (textareaRef.current) textareaRef.current.style.height = "auto"
                      }
                    }}
                    placeholder="Apa yang bisa saya bantu?..."
                    disabled={isLoading}
                    rows={1}
                    className="flex-1 border border-[#a11212] rounded px-1.5 py-1 min-h-[26px] text-[10.5px] text-black bg-white placeholder-[#a11212]/50 outline-none disabled:opacity-60 resize-none overflow-hidden leading-tight"
                  />

                  <div className="relative flex items-end gap-1">
                    {showScrollBtn && (
                      <Image src="/ikon-autoscroll.png" alt="auto scroll" width={30} height={30} quality={100}
                        onClick={handleAutoScroll}
                        className="absolute bottom-full mb-0 right-0 translate-y-0.5 cursor-pointer hover:scale-110 transition-all duration-200 object-contain drop-shadow-md"
                      />
                    )}

                    {/* Tombol kirim */}
                    <div className="relative">
                      {tooltipKirim && <Tooltip label="Kirim Pesan" anchor="left" />}
                      <button
                        onClick={() => handleSend()}
                        disabled={isLoading}
                        onMouseEnter={() => setTooltipKirim(true)}
                        onMouseLeave={() => setTooltipKirim(false)}
                        className="bg-[#a11212] text-white px-2 rounded text-[12px] font-semibold disabled:opacity-60 hover:bg-[#8a0f0f] transition-colors"
                        style={{ height: "26px", display: "flex", alignItems: "center" }}
                      >
                        Kirim
                      </button>
                    </div>

                    {/* Tombol salin */}
                    <div className="relative">
                      {tooltipSalin && <Tooltip label="Salin Ringkasan" anchor="right" />}
                      <button
                        onClick={handleCopy}
                        onMouseEnter={() => setTooltipSalin(true)}
                        onMouseLeave={() => setTooltipSalin(false)}
                        style={{
                          background: "#a11212",
                          width: "26px", height: "26px",
                          borderRadius: "4px",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}
                        className="hover:opacity-80 transition"
                      >
                        {copySuccess ? (
                          <span style={{ color: "white", fontSize: "10px", fontWeight: 700 }}>✓</span>
                        ) : (
                          <Image src="/ikon-salin.png" alt="salin" width={13} height={13} quality={100} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  )

  function handleAutoScroll() {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }
}