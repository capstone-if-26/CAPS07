"use client"
import Image from "next/image"
import { useState } from "react"

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="w-full bg-white border-b border-gray-200 relative z-50">
      <div className="max-w-[1200px] mx-auto flex items-center h-[70px] px-4 md:px-6 relative">

        {/* Logo */}
        <div className="flex-1 flex items-center">
          <Image src="/ojk-logo.png" alt="ojk" width={120} height={64} />
        </div>

        {/* Menu Desktop */}
        <ul className="hidden lg:flex items-center gap-9 text-[15px] font-bold text-gray-800 whitespace-nowrap absolute left-1/2 -translate-x-1/2">
          <li className="cursor-pointer hover:text-red-700">Tentang OJK</li>
          <li className="cursor-pointer hover:text-red-700">Fungsi Utama</li>
          <li className="cursor-pointer hover:text-red-700">Publikasi</li>
          <li className="cursor-pointer hover:text-red-700">Regulasi</li>
          <li className="cursor-pointer hover:text-red-700">Statistik</li>
          <li className="cursor-pointer hover:text-red-700">Layanan</li>
          <li className="cursor-pointer hover:text-red-700">Kasir</li>
        </ul>

        {/* Right Section */}
        <div className="flex items-center gap-3">

          {/* Search */}
          <div className="hidden lg:flex items-center bg-gray-100 rounded-full px-3 h-[34px] w-[130px]">
            <Image src="/ikon-cari2.png" alt="search" width={14} height={14} className="opacity-70" />
            <input type="text" className="bg-transparent outline-none ml-2 text-sm w-full" />
          </div>

          {/* ID bulat */}
          <div className="hidden lg:flex w-8 h-8 rounded-full bg-black text-white items-center justify-center text-xs font-semibold">
            ID
          </div>

          {/* Hamburger - hanya mobile & tablet */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden flex flex-col gap-1.5 p-2"
            aria-label="Toggle menu"
          >
            <span className={`block w-6 h-0.5 bg-gray-800 transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-6 h-0.5 bg-gray-800 transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-6 h-0.5 bg-gray-800 transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 shadow-md">

          {/* Menu item */}
          <ul className="flex flex-col text-[15px] font-bold text-gray-800 px-4 pt-2 pb-2">
            {["Tentang OJK", "Fungsi Utama", "Publikasi", "Regulasi", "Statistik", "Layanan", "Kasir"].map((item) => (
              <li
                key={item}
                className="cursor-pointer hover:text-red-700 py-3 border-b border-gray-100 last:border-0"
                onClick={() => setMenuOpen(false)}
              >
                {item}
              </li>
            ))}
          </ul>

          {/* Search + ID */}
          <div className="px-4 pb-4 pt-2 flex items-center gap-3 border-t border-gray-100">
            <div className="flex items-center bg-gray-100 rounded-full px-3 h-[34px] flex-1">
              <Image src="/ikon-cari2.png" alt="search" width={14} height={14} className="opacity-50" />
              <input
                type="text"
                className="bg-transparent outline-none ml-2 text-sm w-full"
              />
            </div>
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
              ID
            </div>
          </div>

        </div>
      )}
    </nav>
  )
}