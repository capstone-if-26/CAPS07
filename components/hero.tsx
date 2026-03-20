export default function Hero() {
  return (
    <>
      {/* ── MOBILE ONLY ── */}
      <div className="block md:hidden relative w-full" style={{ paddingTop: "38.75%" }}>
        <section
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/hero-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center center",
          }}
        >
          {/* Teks */}
          <div className="absolute inset-0 flex items-center">
            <div className="ml-6 text-white">
              <h1 className="text-[18px] font-semibold leading-tight">
                Akses <br />Keuangan <br />untuk Semua
              </h1>
              <button className="mt-3 px-4 py-1.5 border border-white rounded-lg text-xs hover:bg-white hover:text-black transition">
                Selengkapnya
              </button>
            </div>
          </div>

          {/* Arrow */}
          <div className="absolute left-2 bottom-8 text-white text-3xl cursor-pointer select-none">❮</div>
          <div className="absolute right-2 bottom-8 text-white text-3xl cursor-pointer select-none">❯</div>

          {/* Banner merah */}
          <div
            className="absolute left-1/2 -translate-x-1/2 text-white px-4 py-3 rounded-xl text-[10px] text-center shadow-lg font-semibold w-[calc(100%-24px)]"
            style={{
              bottom: "-44px",
              background: "linear-gradient(90deg, #610404 0%, #ac0606 70%)",
              boxShadow: "0 4px 12px rgba(113, 17, 2, 0.6)",
            }}
          >
            Infografis Sektor Jasa Keuangan yang Stabil dan Kontributif Mendukung Pendalaman Pasar dan Perekonomian Nasional
          </div>
        </section>
      </div>

      {/* ── TABLET & DESKTOP ── */}
      <section
        className="hidden md:block relative w-full h-[75vh] lg:h-[80vh] bg-cover bg-center"
        style={{ backgroundImage: "url('/hero-bg.jpg')" }}
      >
        <div className="absolute inset-0 flex items-center">
          <div className="w-full md:w-[55%] h-full flex items-center">
            <div className="ml-30 md:ml-80 lg:ml-60 -mt-37 text-white max-w-lg">
              <h1 className="text-[24px] md:text-[38px] font-semibold leading-tight">
                Akses <br />Keuangan <br />untuk Semua
              </h1>
              <button className="mt-6 px-6 py-2 border border-white rounded-lg text-base hover:bg-white hover:text-black transition">
                Selengkapnya
              </button>
            </div>
          </div>
        </div>

        <div className="absolute left-6 md:left-58 bottom-15 text-white text-6xl cursor-pointer">❮</div>
        <div className="absolute right-6 md:right-58 bottom-15 text-white text-6xl cursor-pointer">❯</div>

        <div
          className="absolute left-1/2 -translate-x-1/2 text-white px-6 py-8 rounded-xl text-lg text-center shadow-lg font-semibold w-full max-w-[1100px]"
          style={{
            bottom: "-58px",
            background: "linear-gradient(90deg, #610404 10%, #ac0606 70%)",
            boxShadow: "0 4px 12px rgba(113, 17, 2, 0.6)",
          }}
        >
          Infografis Sektor Jasa Keuangan yang Stabil dan Kontributif Mendukung Pendalaman Pasar dan Perekonomian Nasional
        </div>
      </section>
    </>
  )
}