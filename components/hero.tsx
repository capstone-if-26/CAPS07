export default function Hero() {
  return (
    <>
      {/* MOBILE ONLY (< 768px) */}
      <div className="block md:hidden relative w-full" style={{ paddingTop: "38.75%" }}>
        <section
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/hero-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center center",
          }}
        >
          <div className="absolute inset-0 flex items-center">
            <div className="ml-6 text-white">
              <h1 style={{ fontSize: "clamp(10px, 3.8vw, 20px)" }} className="font-semibold leading-tight">
                Akses <br />Keuangan <br />untuk Semua
              </h1>
              <button style={{ fontSize: "clamp(7px, 2vw, 13px)" }} className="mt-3 px-4 py-1.5 border border-white rounded-lg hover:bg-white hover:text-black transition">
                Selengkapnya
              </button>
            </div>
          </div>

          <div style={{ fontSize: "clamp(12px, 3.8vw, 28px)" }} className="absolute left-2 bottom-8 text-white cursor-pointer select-none">❮</div>
          <div style={{ fontSize: "clamp(12px, 3.8vw, 28px)" }} className="absolute right-2 bottom-8 text-white cursor-pointer select-none">❯</div>

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

      {/* TABLET s/d iPad Pro (768px – 1279px) */}
      <div className="hidden md:block xl:hidden relative w-full aspect-[16/6]">
        <section
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/hero-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 flex items-center">
            <div className="ml-[12%] text-white -mt-[5%]">
              <h1 style={{ fontSize: "clamp(18px, 3.2vw, 36px)" }} className="font-semibold leading-tight">
                Akses <br />Keuangan <br />untuk Semua
              </h1>
              <button style={{ fontSize: "clamp(9px, 1.6vw, 16px)" }} className="mt-5 px-6 py-2 border border-white rounded-lg hover:bg-white hover:text-black transition">
                Selengkapnya
              </button>
            </div>
          </div>

          <div style={{ fontSize: "clamp(20px, 4vw, 52px)", left: "4%" }} className="absolute bottom-[12%] text-white cursor-pointer select-none">❮</div>
          <div style={{ fontSize: "clamp(20px, 4vw, 52px)", right: "4%" }} className="absolute bottom-[12%] text-white cursor-pointer select-none">❯</div>

          <div
            className="absolute left-1/2 -translate-x-1/2 text-white rounded-xl text-center font-semibold w-[90%] max-w-[1100px] text-[12px] md:text-[13px] lg:text-[15px] px-6 py-3 lg:py-4"
            style={{
              bottom: "-42px",
              background: "linear-gradient(90deg, #610404 10%, #ac0606 70%)",
              boxShadow: "0 4px 12px rgba(113, 17, 2, 0.6)",
            }}
          >
            Infografis Sektor Jasa Keuangan yang Stabil dan Kontributif Mendukung Pendalaman Pasar dan Perekonomian Nasional
          </div>
        </section>
      </div>

      {/* DESKTOP (≥ 1280px) */}
      <div className="hidden xl:block relative w-full h-[80vh]">
        <section
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        >
          <div className="absolute inset-0 flex items-center">
            <div className="w-full md:w-[55%] h-full flex items-center">
              <div className="ml-60 -mt-37 text-white max-w-lg">
                <h1 style={{ fontSize: "clamp(28px, 2.8vw, 48px)" }} className="font-semibold leading-tight">
                  Akses <br />Keuangan <br />untuk Semua
                </h1>
                <button style={{ fontSize: "clamp(13px, 1.2vw, 18px)" }} className="mt-6 px-6 py-2 border border-white rounded-lg text-base hover:bg-white hover:text-black transition">
                  Selengkapnya
                </button>
              </div>
            </div>
          </div>

          <div style={{ fontSize: "clamp(36px, 4vw, 64px)" }} className="absolute left-58 bottom-15 text-white cursor-pointer">❮</div>
          <div style={{ fontSize: "clamp(36px, 4vw, 64px)" }} className="absolute right-58 bottom-15 text-white cursor-pointer">❯</div>

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
      </div>
    </>
  )
}