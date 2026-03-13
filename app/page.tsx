import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Chatbot Edukasi OJK
          </h1>

          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Halo! Selamat datang di Chatbot OJK.  
            Chatbot ini membantu memberikan informasi mengenai layanan keuangan,
            pengecekan legalitas perusahaan finansial, serta membantu masyarakat
            dalam memahami produk keuangan dengan lebih mudah.
          </p>

          <p className="max-w-md text-base text-zinc-500">
            Silakan pilih salah satu layanan berikut untuk memulai:
          </p>

          <div className="flex flex-col gap-3 mt-4">
            <button className="rounded-full bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 transition">
              Informasi Sektor Jasa Keuangan
            </button>

            <button className="rounded-full bg-green-600 px-6 py-2 text-white hover:bg-green-700 transition">
              Pengaduan
            </button>

            <button className="rounded-full bg-red-600 px-6 py-2 text-white hover:bg-red-700 transition">
              Cek Legalitas
            </button>

            <button className="rounded-full bg-purple-600 px-6 py-2 text-white hover:bg-purple-700 transition">
              SLIK
            </button>

             <button className="rounded-full bg-red-600 px-6 py-2 text-white hover:bg-orange-700 transition">
              Edukasi Keuangan
            </button>

            <button className="rounded-full bg-purple-600 px-6 py-2 text-white hover:bg-yellow-700 transition">
              Satgas PASTI
            </button>
          </div>

        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-white px-5 transition-colors hover:bg-gray-800 md:w-[180px]"
            href="https://www.ojk.go.id"
            target="_blank"
            rel="noopener noreferrer"
          >
            Website OJK
          </a>

          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.2] px-5 transition-colors hover:bg-black/[.04] dark:border-white/[.145] md:w-[180px]"
            href="https://kontak157.ojk.go.id"
            target="_blank"
            rel="noopener noreferrer"
          >
            Kontak OJK
          </a>

        </div>
      </main>
    </div>
  );
}