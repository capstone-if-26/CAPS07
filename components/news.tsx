"use client"
import { useState } from "react"
import Image from "next/image"

type TabType = "Siaran Pers" | "Info Terkini" | "Foto Kegiatan" | "Pengumuman"
const tabs: TabType[] = ["Siaran Pers", "Info Terkini", "Foto Kegiatan", "Pengumuman"]

const newsData: Record<TabType, { title: string; date: string; image: string }[]> = {
  "Siaran Pers": [
    { title: "Siaran Pers: Debitur Pelaku Kejahatan Perbankan Bisa Dipidana, OJK Tuntaskan Tipibank BPR Duta Niaga Pontianak", date: "15 Maret 2026", image: "/news-ojk.png" },
    { title: "Siaran Pers: OJK Tetapkan Sanksi Atas Pelanggaran Pasar Modal PT POSA, PT SBAT, dan Pihak Terkait", date: "13 Maret 2026", image: "/news-ojk.png" },
    { title: "Siaran Pers: OJK Terbitkan Aturan tentang Kantor Perwakilan Lembaga Pembiayaan Asing di Indonesia", date: "12 Maret 2026", image: "/news-ojk.png" },
    { title: "Siaran Pers: DPR RI Tetapkan Lima Calon Anggota Dewan Komisioner OJK", date: "12 Maret 2026", image: "/news-pic.png" },
  ],
  "Info Terkini": [
    { title: "OJK Dorong Pengembangan Ekosistem Keuangan Digital Nasional", date: "14 Maret 2026", image: "/news-ojk.png" },
    { title: "Stabilitas Sektor Jasa Keuangan Terjaga di Awal 2026", date: "10 Maret 2026", image: "/news-ojk.png" },
    { title: "OJK Perkuat Pengawasan Perilaku Pelaku Usaha Jasa Keuangan", date: "8 Maret 2026", image: "/news-pic.png" },
    { title: "Industri Asuransi Syariah Terus Tumbuh Positif di Triwulan I 2026", date: "5 Maret 2026", image: "/news-ojk.png" },
  ],
  "Foto Kegiatan": [
    { title: "Rapat Dewan Komisioner OJK Membahas Arah Kebijakan 2026", date: "12 Maret 2026", image: "/news-pic.png" },
    { title: "OJK Gelar Edukasi Keuangan untuk Generasi Muda di 34 Provinsi", date: "10 Maret 2026", image: "/news-pic.png" },
    { title: "Workshop Perlindungan Konsumen Jasa Keuangan", date: "7 Maret 2026", image: "/news-pic.png" },
    { title: "Peluncuran Program Inklusi Keuangan Nasional Bersama BI", date: "3 Maret 2026", image: "/news-pic.png" },
  ],
  "Pengumuman": [
    { title: "Pengumuman Seleksi Calon Anggota Dewan Komisioner OJK Periode 2026–2031", date: "15 Maret 2026", image: "/news-ojk.png" },
    { title: "Pengumuman Hasil Uji Kemampuan dan Kepatutan Lembaga Keuangan Mikro", date: "11 Maret 2026", image: "/news-ojk.png" },
    { title: "Pengumuman Jadwal Pemeliharaan Sistem SLIK Nasional", date: "9 Maret 2026", image: "/news-ojk.png" },
    { title: "Pengumuman Pendaftaran Program Beasiswa OJK Institute 2026", date: "4 Maret 2026", image: "/news-ojk.png" },
  ],
}

export default function News() {
  const [activeTab, setActiveTab] = useState<TabType>("Siaran Pers")
  const items = newsData[activeTab]

  return (
    <>
      <style>{`
        .tab-scroll::-webkit-scrollbar { display: none; }
        .tab-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        /* Desktop: tiap tab auto width, rata tengah via grid */
        @media (min-width: 768px) {
          .tab-btn { width: auto !important; min-width: auto !important; }
        }
      `}</style>

      <section className="w-full font-[Arial]">

        {/* RED HEADER  */}
        <div className="w-full bg-gradient-to-r from-[#b30000] to-[#7a0000] pt-[108px] md:pt-[128px]">

          {/* Mobile */}
          <div className="tab-scroll flex overflow-x-auto md:grid md:grid-cols-4 w-full">
            {tabs.map((tab) => {
              const isActive = tab === activeTab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  /* tab-btn dipakai untuk override width di desktop via style tag */
                  className={`tab-btn relative text-center font-bold flex-shrink-0
                    text-[13px] md:text-[15px]
                    ${isActive ? "text-[#8c0000]" : "text-white/90"}`}
                  style={{
                    /* Mobile */
                    width: "50%",
                    minWidth: "50%",
                    height: isActive ? "58px" : "52px",
                    backgroundImage: isActive ? "url('/bg-tab.png')" : "none",
                    backgroundSize: "100% 100%",
                    backgroundRepeat: "no-repeat",
                    marginBottom: isActive ? "-2px" : "0",
                    paddingTop: "10px",
                    paddingBottom: isActive ? "16px" : "12px",
                  }}
                >
                  {tab}
                </button>
              )
            })}
          </div>
        </div>

        {/* CONTENT */}
        <div className="bg-white pt-8 pb-16 md:pb-20 px-4 md:px-6">
          <div className="max-w-[1280px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {items.map((item, i) => (
                <a key={i} href="#" className="rounded-xl overflow-hidden transition hover:-translate-y-1 hover:shadow-lg flex flex-col border border-gray-200">
                  <div className="relative w-full aspect-[4/3] bg-gray-200">
                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                  </div>
                  <div className="bg-[#f2f2f2] p-3 md:p-4 flex flex-col flex-1">
                    <p className="text-[11px] md:text-[13px] font-semibold text-gray-800 leading-snug line-clamp-3">{item.title}</p>
                    <p className="text-[10px] md:text-[12px] text-gray-400 mt-2 md:mt-3">{item.date}</p>
                  </div>
                </a>
              ))}
            </div>
            <div className="flex justify-end mt-6">
              <a className="flex items-center gap-1 text-[14px] font-semibold text-gray-600 hover:text-[#8c0000]">
                Selengkapnya
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

      </section>
    </>
  )
}