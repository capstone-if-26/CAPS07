"use client"
import { useState, useRef, useEffect } from "react"
import Image from "next/image"

type Message = {
  text: string
  sender: "user" | "bot"
  link?: string
}

const menuResponses: Record<string, { text: string; link?: string }> = {
  "Cek Legalitas Pinjol / Investasi": {
    text: "Untuk mengecek legalitas pinjol atau investasi, Anda dapat mengunjungi website resmi OJK. OJK menyediakan daftar lengkap perusahaan fintech lending dan investasi yang telah terdaftar dan berizin.",
    link: "https://www.ojk.go.id/id/kanal/iknb/financial-technology/Pages/Penyelenggara-Fintech-Lending-yang-Berizin-dan-Terdaftar-di-OJK.aspx"
  },
  "Hak Saya sebagai Konsumen Keungan": {
    text: "Sebagai konsumen keuangan, Anda memiliki hak untuk mendapatkan informasi yang jelas, perlakuan yang adil, serta perlindungan dari praktik yang merugikan. OJK hadir untuk memastikan hak-hak Anda terpenuhi.",
    link: "https://www.ojk.go.id/id/kanal/edukasi-dan-perlindungan-konsumen/Pages/Perlindungan-Konsumen.aspx"
  },
  "Panduan Produk Bank (Tabungan, Kredit, KPR)": {
    text: "OJK menyediakan panduan lengkap terkait produk perbankan seperti tabungan, kredit, dan KPR. Pastikan Anda memahami syarat dan ketentuan sebelum menggunakan produk keuangan.",
    link: "https://www.ojk.go.id/id/kanal/perbankan/Pages/Bank-Umum.aspx"
  },
  "Cek SLIK / Riwayat Kredit Saya": {
    text: "SLIK merupakan sistem informasi yang dikelola oleh OJK untuk mendukung pelaksanaan tugas pengawasan dan layanan informasi di bidang keuangan. SLIK dapat dimanfaatkan untuk memperlancar proses penyediaan dana, penerapan manajemen risiko kredit atau pembiayaan, penilaian kualitas debitur, serta meningkatkan disiplin industri keuangan.",
    link: "https://www.ojk.go.id/id/kanal/perbankan/Pages/Sistem-Layanan-Informasi-Keuangan-SLIK.aspx"
  },
  "Panduan Investasi & Kripto Aman": {
    text: "Sebelum berinvestasi, pastikan produk investasi Anda terdaftar dan diawasi oleh OJK. Waspadai investasi bodong yang menjanjikan keuntungan tidak wajar. Untuk aset kripto, pastikan platform yang digunakan terdaftar di Bappebti.",
    link: "https://www.ojk.go.id/id/kanal/pasar-modal/Pages/Investor-Area.aspx"
  },
  "Literasi & Tips Keuangan Harian": {
    text: "Tingkatkan literasi keuangan Anda bersama OJK. Kelola keuangan dengan bijak: catat pengeluaran, buat anggaran, tabung minimal 10% penghasilan, dan investasikan sisanya secara aman.",
    link: "https://www.ojk.go.id/id/kanal/edukasi-dan-perlindungan-konsumen/Pages/Literasi-Keuangan.aspx"
  },
  "Kenali Modus Penipuan Keuangan": {
    text: "Waspadai berbagai modus penipuan keuangan seperti investasi bodong, pinjol ilegal, phishing, dan penipuan berkedok hadiah. Selalu verifikasi informasi melalui kanal resmi OJK sebelum bertransaksi.",
    link: "https://www.ojk.go.id/id/kanal/edukasi-dan-perlindungan-konsumen/Pages/Waspada-Investasi.aspx"
  },
  "Cara Lapor / Pengaduan ke OJK": {
    text: "Anda dapat menyampaikan pengaduan ke OJK melalui berbagai kanal: Telepon 157, email konsumen@ojk.go.id, atau melalui portal pengaduan resmi OJK. Pengaduan akan ditindaklanjuti dalam waktu 20 hari kerja.",
    link: "https://konsumen.ojk.go.id/FormPengaduan"
  },
}

export default function FloatingMenu() {
  const [openChat, setOpenChat] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = (customText?: string): void => {
    const text = customText ?? input
    if (!text.trim()) return

    const userMsg: Message = { text, sender: "user" }
    setMessages((prev) => [...prev, userMsg])

    const response = menuResponses[text]
    setTimeout(() => {
      const botMsg: Message = {
        text: response?.text ?? "Pesan diterima 👍",
        sender: "bot",
        link: response?.link ?? undefined,
      }
      setMessages((prev) => [...prev, botMsg])
    }, 500)

    if (!customText) setInput("")
  }

  return (
    <>
      <style>{`
        .chat-scroll::-webkit-scrollbar { display: none; }
        .chat-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Floating Button */}
      <div className="fixed right-4 bottom-4 flex flex-col gap-3 z-50">
        <div
          onClick={() => setOpenChat(!openChat)}
          className="w-10 h-10 rounded-full bg-[#a11212] flex items-center justify-center cursor-pointer shadow-md"
        >
          <Image src="/ikon-robot.png" alt="chatbot" width={20} height={20} />
        </div>

        <Image src="/ikon-wa2.png" alt="wa" width={39} height={39} />
        <Image src="/ikon-id.png" alt="id" width={39} height={39} />
        <Image src="/ikon-orang2.png" alt="user" width={39} height={39} />
      </div>

      {/* Chat Window */}
      {openChat && (
        <>
          <div className="fixed inset-0 z-50 sm:bg-transparent sm:block sm:pointer-events-none">

            {/* Header Mobile (OJK)*/}
            <div className="sm:hidden bg-white flex items-center justify-between px-6 py-3 relative w-full">
              <Image src="/ojk-logo.png" alt="ojk" width={120} height={38} />

              <div
                className="w-6 h-4 flex flex-col justify-between cursor-pointer"
                onClick={() => setOpenMenu(!openMenu)}
              >
                <span className="block h-[2px] bg-black"></span>
                <span className="block h-[2px] bg-black"></span>
                <span className="block h-[2px] bg-black"></span>
              </div>

              {openMenu && (
                <div className="absolute top-full right-4 mt-1 bg-white border border-gray-200 rounded shadow-md z-50 min-w-[120px]">
                  <button
                    onClick={() => {
                      setOpenMenu(false)
                      setOpenChat(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#a11212] font-semibold hover:bg-gray-100"
                  >
                    Kembali
                  </button>
                </div>
              )}
            </div>

            {/* Background merah */}
            <div className="bg-[#850C12] h-full flex items-start justify-center pt-4 sm:bg-transparent sm:block">

              {/* card chat */}
              <div
                style={{ border: "1.5px solid #a11212" }}
                className={`
                  bg-[#f3f3f3]
                  shadow-[0_6px_18px_rgba(0,0,0,0.18)]
                  w-[87%] max-w-[380px] rounded-xl p-4
                  h-[84vh] flex flex-col
                  sm:fixed sm:right-18 sm:bottom-28
                  sm:w-[270px] sm:h-[65vh]
                  sm:rounded-xl sm:p-3 sm:flex sm:flex-col
                  sm:pointer-events-auto
                  sm:shadow-[0_0_16px_2px_rgba(161,18,18,0.2),0_6px_18px_rgba(0,0,0,0.18)]
                `}
              >

                {/* Header Chat */}
                <div className="bg-[#a11212] text-white px-2 py-1.5 flex items-center gap-2 font-semibold text-[12px] rounded-md flex-shrink-0">
                  <Image src="/ikon-botcht.png" alt="bot" width={16} height={16} />
                  <span className="flex-1">Sahabat Keuangan</span>
                </div>

                {/* Scrollable Content */}
                <div className="chat-scroll mt-2 flex-1 overflow-y-auto space-y-3 flex flex-col pr-1">

                  {/* TITLE */}
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#a11212] flex-shrink-0">
                    <Image
                      src="/ikon-botcht.png"
                      alt="bot"
                      width={13}
                      height={13}
                      className="rounded-full border border-[#a11212]"
                    />
                    Sahabat Keuangan
                  </div>

                  {/* chat bubble */}
                  <div className="bg-[#f3f3f3] border border-[#a11212] rounded-md p-1.5 max-w-[85%] text-[8px] leading-tight mx-auto font-semibold flex-shrink-0">
                    Hai Sobat OJK! 👋 <br />
                    Saat ini Anda terhubung dengan akun resmi Otoritas Jasa Keuangan,<br /><br />
                    Perkenalkan saya ROJAK (Robot Penjawab Kontak OJK)<br /><br />
                    Untuk memulai silahkan pilih layanan yang Anda butuhkan di bawah ini.
                  </div>

                  {/* Menu */}
                  {messages.length === 0 && (
                    <div className="flex flex-wrap gap-1 mx-auto max-w-[85%] justify-start font-semibold flex-shrink-0">
                      {Object.keys(menuResponses).map((label, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(label)}
                          className="bg-[#a11212] text-white text-[6px] px-1.5 py-[2px] rounded w-[49%] hover:bg-[#8a0f0f] transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Chat Result */}
                  <div className="space-y-3 flex-1">
                    {messages.map((msg, i) => (
                      <div key={i} className="max-w-[85%] mx-auto flex flex-col">
                        <div
                          className={`inline-block p-1.5 rounded-md text-[8px] leading-tight font-semibold max-w-full ${
                            msg.sender === "user"
                              ? "bg-[#a11212] text-white self-end border border-[#a11212]"
                              : "bg-[#f3f3f3] text-black self-start border border-[#a11212]"
                          }`}
                        >
                          <span>{msg.text}</span>
                          {msg.sender === "bot" && msg.link != null && (
                            <a
                              href={msg.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block mt-1 text-[#a11212] underline break-all"
                            >
                              {msg.link}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                </div>

                {/* Input */}
                <div className="mt-2 flex items-center gap-1 flex-shrink-0">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Selamat Datang, Apa yang bisa saya bantu?..."
                    className="flex-1 border border-[#a11212] rounded px-2 py-1 text-[8px] leading-start outline-none bg-white"
                  />
                  <button
                    onClick={() => handleSend()}
                    className="bg-[#a11212] text-white px-2 py-1 rounded text-[10px]"
                  >
                    Kirim
                  </button>
                </div>

              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}