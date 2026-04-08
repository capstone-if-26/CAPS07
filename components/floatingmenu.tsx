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

// Tipe pesan untuk UI
type UIMessage = {
  text: string
  sender: "user" | "bot"
}

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

export default function FloatingMenu() {
  const [openChat, setOpenChat] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset chat saat halaman di-refresh
  useEffect(() => {
    clearChatId()
    setMessages([])
  }, [])

  // Load history chat dari backend saat chat dibuka
  useEffect(() => {
    if (!openChat) return

    const chatId = getSavedChatId()
    if (!chatId) return

    getChatHistory(chatId)
      .then((res) => {
        if (res.status && res.data.messages.length > 0) {
          const loaded: UIMessage[] = res.data.messages.map((m: Message) => ({
            text: m.content,
            sender: m.senderType === "user" ? "user" : "bot",
          }))
          setMessages(loaded)
        }
      })
      .catch(() => {
        // Jika chatId sudah expired / tidak valid, hapus dari localStorage
        clearChatId()
      })
  }, [openChat])

  // Auto scroll ke bawah saat ada pesan baru
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Menampilkan tombol scroll saat tidak berada di bawah
  useEffect(() => {
    const el = chatContainerRef.current
    if (!el) return

    const handleScroll = () => {
      const isScrollable = el.scrollHeight > el.clientHeight
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10
      setShowScrollBtn(isScrollable && !isAtBottom)
    }

    handleScroll()
    el.addEventListener("scroll", handleScroll)
    return () => el.removeEventListener("scroll", handleScroll)
  }, [messages])

  // Handler auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = textareaRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = Math.min(el.scrollHeight, 62) + "px" // max ~3 baris
    }
  }

  // Kirim pesan ke backend
  const handleSend = async (customText?: string) => {
    const text = (customText ?? input).trim()
    if (!text || isLoading) return

    // Menambahkan pesan user ke UI
    setMessages((prev) => [...prev, { text, sender: "user" }])
    if (!customText) {
      setInput("")
      // Reset tinggi textarea setelah kirim
      if (textareaRef.current) textareaRef.current.style.height = "auto"
    }
    setIsLoading(true)

    try {
      const chatId = getSavedChatId()
      let answer = ""

      if (!chatId) {
        // Obrolan baru — belum ada chatId
        const res = await startNewChat(text)
        if (res.status) {
          saveChatId(res.data.chatId)
          answer = res.data.answer
        }
      } else {
        // Lanjutkan obrolan yang sudah ada
        const res = await continueChat(chatId, text)
        if (res.status) {
          answer = res.data.answer
        }
      }

      setMessages((prev) => [
        ...prev,
        { text: answer || "Maaf, terjadi kesalahan pada server.", sender: "bot" },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          text: "Maaf, tidak dapat terhubung ke server. Silakan coba beberapa saat lagi.",
          sender: "bot",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Reset chat (hapus history & chatId)
  const handleReset = () => {
    clearChatId()
    setMessages([])
  }

  const handleAutoScroll = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
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
      `}</style>

      {/* Floating Button */}
      <div className="fixed right-4 bottom-4 flex flex-col gap-3 z-50">
        <div
          onClick={() => setOpenChat(!openChat)}
          className="w-10 h-10 rounded-full bg-[#a11212] flex items-center justify-center cursor-pointer shadow-md"
        >
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
            <Image
              src="/ikon-hamburger.png"
              alt="menu"
              width={24}
              height={24}
              onClick={() => setOpenMenu(!openMenu)}
              className="cursor-pointer translate-y-1"
            />
            {openMenu && (
              <div className="absolute top-full left-0 w-full bg-white border-t border-gray-200 shadow-md z-50">
                
                {/* Menu item */}
                <ul className="flex flex-col text-[15px] font-bold text-gray-800 px-4 pt-2 pb-2">
                  {["Tentang OJK", "Fungsi Utama", "Publikasi", "Regulasi", "Statistik", "Layanan", "Kasir"].map((item) => (
                    <li key={item} className="cursor-pointer hover:text-red-700 py-3 border-b border-gray-100 last:border-0" onClick={() => setOpenMenu(false)}>
                      {item}
                    </li>
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
                className={`
                  chat-responsive

                  bg-[#f3f3f3]
                  shadow-[0_6px_18px_rgba(0,0,0,0.18)]

                  /* MOBILE */
                  + w-[90vw] max-w-[380px]
                  + h-full max-h-none min-h-0

                  /* DESKTOP */
                  sm:fixed sm:right-18 sm:bottom-28
                  sm:w-[270px] sm:max-w-none sm:min-w-0
                  sm:h-[65vh] sm:max-h-none sm:min-h-0

                  rounded-2xl p-4 flex flex-col

                  pointer-events-auto

                  sm:shadow-[0_0_16px_2px_rgba(161,18,18,0.2),0_6px_18px_rgba(0,0,0,0.18)]
                `}
              >

              {/* Header Chat */}
              <div className="bg-[#a11212] text-white px-2 py-1.5 flex items-center gap-2 font-semibold text-[13px] rounded-md flex-shrink-0">
                <Image src="/ikon-chtbotnew.png" alt="bot" width={19} height={19} />
                <span className="flex-1">Sahabat Keuangan</span>

                {/* Tombol close */}
                <Image
                  src="/ikon-closenew.png"
                  alt="close"
                  width={10}
                  height={10}
                  onClick={() => setOpenChat(false)}
                  className="cursor-pointer hover:opacity-80 transition"
                />
              </div>

              {/* Scrollable content */}
              <div
                ref={chatContainerRef}
                className="chat-scroll mt-2 flex-1 overflow-y-auto space-y-3 flex flex-col pr-1"
              >
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

                {/* Menu — hanya tampil jika belum ada pesan */}
                {messages.length === 0 && (
                  <div className="grid grid-cols-2 gap-1 mx-auto max-w-[85%] font-semibold flex-shrink-0">
                    {QUICK_MENU.map((label, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(label)}
                        disabled={isLoading}
                        className="bg-[#a11212] text-white text-[9px] px-1.5 py-[3px] rounded w-full hover:bg-[#8a0f0f] transition-colors disabled:opacity-50"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Daftar pesan */}
                <div className="space-y-3 flex-1">
                  {messages.map((msg, i) => (
                    <div key={i} className="max-w-[85%] mx-auto flex flex-col">
                      <div
                        className={`inline-block p-1.5 rounded-md text-[11px] leading-tight font-semibold max-w-full break-words ${
                          msg.sender === "user"
                            ? "bg-[#a11212] text-white self-end border border-[#a11212]"
                            : "bg-[#f3f3f3] text-black self-start border border-[#a11212]"
                        }`}
                      >
                        <span className="break-words whitespace-pre-wrap">{msg.text}</span>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator saat menunggu respons backend */}
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

              {/* Input + Kirim */}
              <div className="mt-2 flex items-end gap-1 flex-shrink-0">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                      if (textareaRef.current) textareaRef.current.style.height = "auto"
                    }
                  }}
                  placeholder="Apa yang bisa saya bantu?..."
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 border border-[#a11212] rounded px-2 py-1 min-h-[26px] text-[11px] text-black bg-white placeholder-[#a11212]/50 outline-none disabled:opacity-60 resize-none overflow-hidden leading-tight"
                />

                <div className="relative flex items-center">
                  {showScrollBtn && (
                    <Image
                      src="/ikon-autoscroll.png"
                      alt="auto scroll"
                      width={30}
                      height={30}
                      quality={100}
                      onClick={handleAutoScroll}
                      className="absolute bottom-full mb-0 right-0 translate-y-0.5 cursor-pointer hover:scale-110 transition-all duration-200 object-contain drop-shadow-md"
                    />
                  )}
                  <button
                    onClick={() => handleSend()}
                    disabled={isLoading}
                    className="bg-[#a11212] text-white px-2 py-1 rounded text-[12px] font-semibold disabled:opacity-60"
                  >
                    Kirim
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  )
}