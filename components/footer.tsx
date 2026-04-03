export default function Footer() {
  return (
    <footer>
      {/* TOP SECTION */}
      <div className="bg-gradient-to-r from-[#1f1f1f] to-[#5a5555] text-white">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 py-8 sm:py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">

            {/* LEFT */}
            <div>
              <h3 className="text-lg sm:text-xl font-medium mb-3">
                Otoritas Jasa Keuangan
              </h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Gedung Sumitro Djojohadikusumo <br />
                Jalan Lapangan Banteng Timur 2-4 Jakarta <br />
                10710 Indonesia
              </p>
            </div>

            {/* MIDDLE */}
            <div>
              <h3 className="text-lg sm:text-xl font-medium mb-3">Hubungi Kami</h3>
              <div className="text-sm text-white/80 space-y-2">
                <p>📞 (021) 2960 0000</p>
                <p>✉️ humas@ojk.go.id</p>
                <p>🎧 157</p>
                <p>📱 081 157 157 157</p>
              </div>
            </div>

            {/* RIGHT */}
            <div>
              <h3 className="text-lg sm:text-xl font-medium mb-3">Artikel GPR</h3>
              <p className="text-sm text-white/80 cursor-pointer hover:text-white">
                Selengkapnya ▸
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="bg-[#c21f26] text-white text-xs sm:text-sm lg:text-base">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-13 py-4 sm:py-5 lg:py-6 text-center sm:text-left">
          Copyright Otoritas Jasa Keuangan 2024 | Peta Situs | Syarat dan Kondisi
        </div>
      </div>
    </footer>
  )
}