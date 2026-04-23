// Alur pertanyaan bertahap (multi-step clarification) untuk kasus penipuan keuangan
export type FlowOption = {
  label: string
  value: string
}

export type FlowStep = {
  id: string
  question: string
  options: FlowOption[]
  next: Record<string, string> // key: value pilihan, value: stepId berikutnya
}

export type FlowResult = {
  answer: string
  actions?: { label: string; url: string }[]
}

// semua step alur penipuan
export const FLOW_STEPS: Record<string, FlowStep> = {
  step1: {
    id: "step1",
    question: "Boleh pilih dulu ya, biar aku bantu sesuai kondisi kamu:",
    options: [
      { label: "Penipuan pinjaman online", value: "pinjol" },
      { label: "Investasi bodong", value: "investasi" },
      { label: "Penipuan transaksi (transfer, e-wallet, dll)", value: "transaksi" },
      { label: "Tulis jawaban kamu", value: "custom" },
    ],
    next: {
      pinjol: "step2_pinjol",
      investasi: "step2_investasi",
      transaksi: "step2_transaksi",
      custom: "custom_input",
    },
  },

  step2_pinjol: {
    id: "step2_pinjol",
    question: "Apakah pinjaman online tersebut:",
    options: [
      { label: "Sudah terdaftar di OJK", value: "terdaftar" },
      { label: "Tidak terdaftar / mencurigakan", value: "ilegal" },
      { label: "Saya tidak tahu statusnya", value: "tidak_tahu" },
      { label: "Tulis jawaban kamu", value: "custom" },
    ],
    next: {
      terdaftar: "step3_pinjol_terdaftar",
      ilegal: "step3_pinjol_ilegal",
      tidak_tahu: "step3_pinjol_ilegal",
      custom: "custom_input",
    },
  },

  step3_pinjol_ilegal: {
    id: "step3_pinjol_ilegal",
    question: "Kerugian yang kamu alami berupa:",
    options: [
      { label: "Kehilangan dana investasi", value: "kehilangan" },
      { label: "Dijanjikan keuntungan tidak masuk akal", value: "janji" },
      { label: "Diminta transfer terus-menerus", value: "transfer" },
      { label: "Tulis jawaban kamu", value: "custom" },
    ],
    next: {
      kehilangan: "step4_transaksi",
      janji: "step4_transaksi",
      transfer: "step4_transaksi",
      custom: "custom_input",
    },
  },

  step3_pinjol_terdaftar: {
    id: "step3_pinjol_terdaftar",
    question: "Apa masalah yang kamu hadapi?",
    options: [
      { label: "Bunga tidak sesuai perjanjian", value: "bunga" },
      { label: "Penagihan tidak wajar / intimidasi", value: "penagihan" },
      { label: "Data pribadi disalahgunakan", value: "data" },
      { label: "Tulis jawaban kamu", value: "custom" },
    ],
    next: {
      bunga: "end_ojk",
      penagihan: "end_ojk",
      data: "end_ojk",
      custom: "custom_input",
    },
  },

  step2_investasi: {
    id: "step2_investasi",
    question: "Apa yang membuat kamu curiga?",
    options: [
      { label: "Dijanjikan keuntungan tidak masuk akal", value: "janji" },
      { label: "Tidak ada izin OJK", value: "no_izin" },
      { label: "Uang tidak bisa ditarik", value: "tarik" },
      { label: "Tulis jawaban kamu", value: "custom" },
    ],
    next: {
      janji: "step4_transaksi",
      no_izin: "step4_transaksi",
      tarik: "step4_transaksi",
      custom: "custom_input",
    },
  },

  step2_transaksi: {
    id: "step2_transaksi",
    question: "Jenis transaksi yang terjadi:",
    options: [
      { label: "Transfer bank", value: "bank" },
      { label: "E-wallet (OVO, GoPay, dll)", value: "ewallet" },
      { label: "Pembayaran online / marketplace", value: "marketplace" },
      { label: "Tulis jawaban kamu", value: "custom" },
    ],
    next: {
      bank: "end_kronologi",
      ewallet: "end_kronologi",
      marketplace: "end_kronologi",
      custom: "custom_input",
    },
  },

  step4_transaksi: {
    id: "step4_transaksi",
    question: "Jenis transaksi yang terjadi:",
    options: [
      { label: "Transfer bank", value: "bank" },
      { label: "E-wallet (OVO, GoPay, dll)", value: "ewallet" },
      { label: "Pembayaran online / marketplace", value: "marketplace" },
      { label: "Tulis jawaban kamu", value: "custom" },
    ],
    next: {
      bank: "end_kronologi",
      ewallet: "end_kronologi",
      marketplace: "end_kronologi",
      custom: "custom_input",
    },
  },
}

// Hasil akhir penipuan
export const FLOW_RESULTS: Record<string, FlowResult> = {
  end_kronologi: {
    answer: "Silakan ceritakan kronologi singkatnya ya, supaya aku bisa bantu lebih tepat.",
  },
  
  // respon setelah cerita
  after_kronologi_pinjol: {
    answer: "Terima kasih sudah menjelaskan 🙏🏻\nDari cerita kamu, ini kemungkinan termasuk penipuan pinjaman online ilegal.\nBiasanya, pinjaman online resmi tidak meminta biaya di awal sebelum pencairan dana.\n\nBerikut yang bisa kamu lakukan:\n1. Jangan melakukan transfer tambahan\n2. Simpan semua bukti (chat, bukti transfer)\n3. Laporkan ke pihak berwenang atau OJK",
    actions: [
      { label: "Lapor ke IASC", url: "https://iasc.ojk.go.id" },
      { label: "Cek Legalitas Pinjol", url: "https://www.ojk.go.id/id/kanal/iknb/financial-technology/Pages/Penyelenggara-Fintech-Lending-yang-Berizin-dan-Terdaftar-di-OJK.aspx" },
    ],
  },

  after_kronologi_investasi: {
    answer: "Terima kasih sudah menjelaskan 🙏🏻\nDari cerita kamu, ini kemungkinan termasuk investasi bodong.\nCiri-cirinya: menjanjikan keuntungan tidak wajar dan meminta transfer terus-menerus.\n\nBerikut yang bisa kamu lakukan:\n1. Stop semua pembayaran\n2. Kumpulkan bukti\n3. Laporkan ke Satgas Waspada Investasi",
    actions: [
      { label: "Lapor ke OJK", url: "https://konsumen.ojk.go.id/FormPengaduan" },
      { label: "Lapor ke IASC", url: "https://iasc.ojk.go.id" },
    ],
  },
}

// flow untuk semua topik quick menu
export const QUICK_MENU_FLOWS: Record<string, FlowStep> = {

  // Cek Legalitas Pinjol / Investasi
  step_legalitas_1: {
    id: "step_legalitas_1",
    question: "Yang ingin kamu cek legalitasnya berupa:",
    options: [
      { label: "Pinjaman Online (Pinjol)", value: "pinjol" },
      { label: "Investasi / Reksa Dana", value: "investasi" },
      { label: "Kripto / Aset Digital", value: "kripto" },
      { label: "Tulis jawaban kamu", value: "custom" },
    ],
    next: {
      pinjol: "end_legalitas_pinjol",
      investasi: "end_legalitas_investasi",
      kripto: "end_legalitas_kripto",
      custom: "custom_input",
    },
  },

  // Hak Konsumen Keuangan
  step_hak_1: {
    id: "step_hak_1",
    question: "Hak konsumen apa yang ingin kamu ketahui?",
    options: [
      { label: "Hak mendapat informasi produk", value: "informasi" },
      { label: "Hak mengajukan pengaduan", value: "pengaduan" },
      { label: "Hak perlindungan data pribadi", value: "data" },
      { label: "Tulis jawaban kamu", value: "custom" },
    ],
    next: {
      informasi: "end_hak_informasi",
      pengaduan: "end_hak_pengaduan",
      data: "end_hak_data",
      custom: "custom_input",
    },
  },

  // Panduan Produk Bank
  step_bank_1: {
    id: "step_bank_1",
    question: "Produk bank apa yang ingin kamu ketahui?",
    options: [
      { label: "Tabungan", value: "tabungan" },
      { label: "Kredit / Pinjaman", value: "kredit" },
      { label: "KPR (Kredit Pemilikan Rumah)", value: "kpr" },
      { label: "Tulis jawaban kamu", value: "custom" },
    ],
    next: {
      tabungan: "end_bank_tabungan",
      kredit: "end_bank_kredit",
      kpr: "end_bank_kpr",
      custom: "custom_input",
    },
  },

  // Cek SLIK
  step_slik_1: {
    id: "step_slik_1",
    question: "Apa yang ingin kamu lakukan terkait SLIK?",
    options: [
      { label: "Cek riwayat kredit saya", value: "cek" },
      { label: "Riwayat kredit saya bermasalah", value: "masalah" },
      { label: "Cara daftar SLIK online", value: "daftar" },
      { label: "Tulis jawaban kamu", value: "custom" },
    ],
    next: {
      cek: "end_slik_cek",
      masalah: "end_slik_masalah",
      daftar: "end_slik_daftar",
      custom: "custom_input",
    },
  },

  // Panduan Investasi & Kripto
  step_investasi_1: {
    id: "step_investasi_1",
    question: "Apa yang ingin kamu pelajari?",
    options: [
      { label: "Cara mulai investasi aman", value: "mulai" },
      { label: "Bedanya investasi vs trading", value: "beda" },
      { label: "Tips investasi kripto aman", value: "kripto" },
      { label: "Tulis jawaban kamu", value: "custom" },
    ],
    next: {
      mulai: "end_investasi_mulai",
      beda: "end_investasi_beda",
      kripto: "end_investasi_kripto",
      custom: "custom_input",
    },
  },

  // Literasi & Tips Keuangan
  step_literasi_1: {
    id: "step_literasi_1",
    question: "Tips keuangan apa yang kamu butuhkan?",
    options: [
      { label: "Cara mengelola gaji bulanan", value: "gaji" },
      { label: "Tips menabung & dana darurat", value: "tabung" },
      { label: "Cara bebas dari hutang", value: "hutang" },
      { label: "Tulis jawaban kamu", value: "custom" },
    ],
    next: {
      gaji: "end_literasi_gaji",
      tabung: "end_literasi_tabung",
      hutang: "end_literasi_hutang",
      custom: "custom_input",
    },
  },

  // Cara Lapor / Pengaduan ke OJK
  step_lapor_1: {
    id: "step_lapor_1",
    question: "Pengaduan apa yang ingin kamu laporkan?",
    options: [
      { label: "Penipuan keuangan / investasi bodong", value: "penipuan" },
      { label: "Masalah dengan bank / lembaga keuangan", value: "bank" },
      { label: "Pinjol ilegal / bermasalah", value: "pinjol" },
      { label: "Tulis jawaban kamu", value: "custom" },
    ],
    next: {
      penipuan: "end_lapor_penipuan",
      bank: "end_lapor_bank",
      pinjol: "end_lapor_pinjol",
      custom: "custom_input",
    },
  },
}

// Hasil akhir Quick Menu
export const QUICK_MENU_RESULTS: Record<string, FlowResult> = {

  // Legalitas
  end_legalitas_pinjol: {
    answer:
      "Untuk cek legalitas Pinjol, kamu bisa langsung cek di daftar resmi OJK.\n\nPinjol legal wajib terdaftar/berizin OJK dan tidak boleh meminta akses kontak HP, membebankan biaya di muka, atau mengancam peminjam.",
    actions: [
      {
        label: "Cek Daftar Pinjol Legal",
        url: "https://www.ojk.go.id/id/kanal/iknb/financial-technology/Pages/Penyelenggara-Fintech-Lending-yang-Berizin-dan-Terdaftar-di-OJK.aspx",
      },
    ],
  },
  end_legalitas_investasi: {
    answer:
      "Sebelum investasi, pastikan platform tersebut terdaftar di OJK. Investasi ilegal biasanya menjanjikan keuntungan tidak wajar dan tidak memiliki izin resmi.",
    actions: [
      {
        label: "Cek Legalitas Investasi",
        url: "https://www.ojk.go.id/id/kanal/pasar-modal/Pages/Manajer-Investasi.aspx",
      },
    ],
  },
  end_legalitas_kripto: {
    answer:
      "Aset kripto di Indonesia diawasi oleh Bappebti (bukan OJK). Pastikan platform kripto yang kamu gunakan terdaftar resmi di Bappebti.",
    actions: [
      {
        label: "Cek Platform Kripto Legal",
        url: "https://bappebti.go.id/pedagang_fisik_aset_kripto",
      },
    ],
  },

  // Hak Konsumen
  end_hak_informasi: {
    answer:
      "Kamu berhak mendapatkan informasi yang benar, jelas, dan jujur mengenai produk dan/atau layanan keuangan sebelum memutuskan untuk menggunakannya.\n\nJika lembaga keuangan tidak memberikan informasi yang memadai, kamu bisa mengajukan pengaduan ke OJK.",
    actions: [{ label: "Lapor ke OJK", url: "https://konsumen.ojk.go.id/FormPengaduan" }],
  },
  end_hak_pengaduan: {
    answer:
      "Kamu berhak mengajukan pengaduan dan mendapat penyelesaian yang adil atas masalah dengan lembaga keuangan.\n\nLangkah:\n1. Ajukan dulu ke lembaga keuangan terkait\n2. Jika tidak selesai dalam 20 hari, lapor ke OJK",
    actions: [{ label: "Lapor ke OJK", url: "https://konsumen.ojk.go.id/FormPengaduan" }],
  },
  end_hak_data: {
    answer:
      "Data pribadimu dilindungi oleh UU Perlindungan Data Pribadi. Lembaga keuangan tidak boleh menyebarkan atau menyalahgunakan data pribadi tanpa persetujuanmu.\n\nJika data kamu disalahgunakan, segera laporkan ke OJK.",
    actions: [{ label: "Lapor ke OJK", url: "https://konsumen.ojk.go.id/FormPengaduan" }],
  },

  // Produk Bank
  end_bank_tabungan: {
    answer:
      "Tabungan di bank yang terdaftar di LPS (Lembaga Penjamin Simpanan) dijamin hingga Rp 2 miliar per nasabah per bank.\n\nPastikan bank kamu terdaftar di OJK dan LPS sebelum menabung.",
    actions: [
      {
        label: "Cek Bank Terdaftar LPS",
        url: "https://www.lps.go.id/bank-peserta-penjaminan",
      },
    ],
  },
  end_bank_kredit: {
    answer:
      "Sebelum mengajukan kredit/pinjaman bank, perhatikan:\n1. Bunga efektif (bukan bunga flat)\n2. Biaya provisi dan administrasi\n3. Denda pelunasan dipercepat\n4. Asuransi yang diwajibkan",
    actions: [{ label: "Simulasi Kredit", url: "https://sikapiuangmu.ojk.go.id" }],
  },
  end_bank_kpr: {
    answer:
      "Untuk KPR, perhatikan:\n1. DP minimal 10-20% (tergantung urutan kepemilikan rumah)\n2. Tenor maksimal 20-30 tahun\n3. Bunga fixed vs floating\n4. Pastikan developer terpercaya",
    actions: [{ label: "Info KPR OJK", url: "https://sikapiuangmu.ojk.go.id" }],
  },

  // SLIK
  end_slik_cek: {
    answer:
      "Kamu bisa cek riwayat kredit (SLIK) secara online melalui iDeb OJK. Layanan ini gratis dan bisa diakses kapan saja.",
    actions: [{ label: "Cek SLIK Online", url: "https://idebku.ojk.go.id/Public/HomePage" }],
  },
  end_slik_masalah: {
    answer:
      "Jika riwayat kredit kamu bermasalah (kolektibilitas 2-5), kamu perlu:\n1. Lunasi tunggakan terlebih dahulu\n2. Minta surat lunas dari kreditur\n3. Tunggu data diperbarui (maks. 30 hari kerja)",
    actions: [{ label: "Cek SLIK Online", url: "https://idebku.ojk.go.id/Public/HomePage" }],
  },
  end_slik_daftar: {
    answer:
      "Cara daftar SLIK online:\n1. Buka idebku.ojk.go.id\n2. Klik 'Pendaftaran'\n3. Isi data diri dan upload KTP\n4. Tunggu verifikasi (1-2 hari kerja)\n5. Hasil SLIK dikirim ke email",
    actions: [{ label: "Daftar SLIK Online", url: "https://idebku.ojk.go.id/Public/HomePage" }],
  },

  // Investasi & Kripto
  end_investasi_mulai: {
    answer:
      "Tips mulai investasi aman:\n1. Pahami profil risiko kamu (konservatif/moderat/agresif)\n2. Mulai dari reksa dana pasar uang\n3. Pastikan platform terdaftar OJK\n4. Diversifikasi — jangan taruh semua di satu instrumen",
    actions: [{ label: "Edukasi Investasi OJK", url: "https://sikapiuangmu.ojk.go.id" }],
  },
  end_investasi_beda: {
    answer:
      "Investasi: tujuan jangka panjang, risiko lebih rendah, cocok untuk pemula (reksa dana, obligasi, saham blue chip).\n\nTrading: jangka pendek, risiko tinggi, butuh analisis mendalam dan waktu lebih banyak.",
  },
  end_investasi_kripto: {
    answer:
      "Tips kripto aman:\n1. Gunakan platform terdaftar Bappebti\n2. Jangan investasi lebih dari 5-10% portofolio\n3. Simpan di wallet pribadi (cold wallet) untuk jumlah besar\n4. Waspada janji keuntungan pasti — itu ciri penipuan",
    actions: [
      {
        label: "Cek Platform Kripto Legal",
        url: "https://bappebti.go.id/pedagang_fisik_aset_kripto",
      },
    ],
  },

  // Literasi
  end_literasi_gaji: {
    answer:
      "Formula 50-30-20 untuk kelola gaji:\n• 50% — kebutuhan pokok (makan, transport, tagihan)\n• 30% — keinginan (hiburan, makan di luar)\n• 20% — tabungan & investasi\n\nSesuaikan dengan kondisi finansialmu ya!",
  },
  end_literasi_tabung: {
    answer:
      "Tips menabung efektif:\n1. Tabung di awal bulan, bukan sisa gaji\n2. Dana darurat ideal = 3-6x pengeluaran bulanan\n3. Pisahkan rekening tabungan dari rekening harian\n4. Otomatiskan transfer ke tabungan setiap gajian",
  },
  end_literasi_hutang: {
    answer:
      "Strategi lunasi hutang:\n1. Debt Snowball — lunasi hutang terkecil dulu (motivasi)\n2. Debt Avalanche — lunasi bunga tertinggi dulu (hemat)\n3. Hindari hutang baru selama proses pelunasan\n4. Cari penghasilan tambahan jika perlu",
  },

  // Lapor / Pengaduan
  end_lapor_penipuan: {
    answer:
      "Untuk lapor penipuan keuangan/investasi bodong:\n1. Siapkan bukti (screenshot, transfer, identitas pelaku)\n2. Lapor ke Satgas Waspada Investasi (SWI)\n3. Lapor ke Bareskrim Polri untuk proses pidana",
    actions: [
      { label: "Lapor ke OJK", url: "https://konsumen.ojk.go.id/FormPengaduan" },
      { label: "Lapor ke IASC", url: "https://iasc.ojk.go.id" },
    ],
  },
  end_lapor_bank: {
    answer:
      "Untuk pengaduan ke bank/lembaga keuangan:\n1. Ajukan dulu ke bank terkait (maksimal 20 hari kerja)\n2. Jika tidak selesai, laporkan ke OJK melalui kanal 157\n3. OJK akan memfasilitasi penyelesaian sengketa",
    actions: [{ label: "Lapor ke OJK", url: "https://konsumen.ojk.go.id/FormPengaduan" }],
  },
  end_lapor_pinjol: {
    answer:
      "Untuk lapor pinjol ilegal/bermasalah:\n1. Jangan bayar tagihan pinjol ilegal\n2. Blokir semua kontak penagih\n3. Lapor ke OJK dan Satgas Waspada Investasi",
    actions: [
      { label: "Lapor ke OJK", url: "https://konsumen.ojk.go.id/FormPengaduan" },
      {
        label: "Lapor Pinjol Ilegal",
        url: "https://www.ojk.go.id/id/kanal/iknb/financial-technology/Pages/Penyelenggara-Fintech-Lending-yang-Berizin-dan-Terdaftar-di-OJK.aspx",
      },
    ],
  },
}

// Mapping: label Quick Menu → stepId awal
export const QUICK_MENU_FLOW_MAP: Record<string, string> = {
  "Cek Legalitas Pinjol / Investasi": "step_legalitas_1",
  "Hak Saya sebagai Konsumen Keuangan": "step_hak_1",
  "Panduan Produk Bank (Tabungan, Kredit, KPR)": "step_bank_1",
  "Cek SLIK / Riwayat Kredit Saya": "step_slik_1",
  "Panduan Investasi & Kripto Aman": "step_investasi_1",
  "Literasi & Tips Keuangan Harian": "step_literasi_1",
  "Cara Lapor / Pengaduan ke OJK": "step_lapor_1",
}

// Fungsi helper (mencakup semua flow)
export function getStep(stepId: string): FlowStep | null {
  return FLOW_STEPS[stepId] ?? QUICK_MENU_FLOWS[stepId] ?? null
}

export function getResult(stepId: string): FlowResult | null {
  return FLOW_RESULTS[stepId] ?? QUICK_MENU_RESULTS[stepId] ?? null
}

// Keyword trigger yang memunculkan alur penipuan
export const PENIPUAN_TRIGGER = "Kenali Modus Penipuan Keuangan"
export const PENIPUAN_SAYA_TRIGGER = "Saya kena penipuan"