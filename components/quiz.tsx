"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
  reason: string;
};

type QuizProps = {
  chatId?: string;
  onClose: () => void;
};

export default function Quiz({ chatId, onClose }: QuizProps) {
  const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});
  const [visible, setVisible] = useState(1);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchQuiz = async () => {
      if (!chatId) {
        setError("Chat ID tidak ditemukan");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response = await fetch(`/api/chats/${chatId}/quiz`, { signal });
        const result = await response.json();

        if (Array.isArray(result.data)) {
          const quizArray: QuizQuestion[] = result.data;
          if (quizArray.length > 0) {
            setQuizData(quizArray);
          } else {
            setError(
              "Konteks percakapan belum cukup untuk membuat quiz. Silakan lanjutkan obrolan untuk mengumpulkan lebih banyak materi.",
            );
          }
        } else {
          throw new Error(result.message || "Struktur respons API tidak valid");
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;

        console.error("Error fetching quiz:", err);
        setError("Terjadi kesalahan saat membuat quiz. Silakan coba lagi.");
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchQuiz();

    return () => {
      abortController.abort();
    };
  }, [chatId]);

  const handleSelect = (qIdx: number, opt: string) => {
    // Kunci opsi agar tidak bisa diubah jika sudah disubmit
    if (submitted[qIdx]) return;
    setAnswers((p) => ({ ...p, [qIdx]: opt }));
  };

  const handleSubmit = (qIdx: number) => {
    // Jangan izinkan submit jika belum ada opsi yang dipilih
    if (!answers[qIdx]) return;

    setSubmitted((p) => ({ ...p, [qIdx]: true }));

    // Jeda 300ms untuk efek psikologis agar user bisa melihat animasi transisi warna (benar/salah)
    setTimeout(() => {
      if (qIdx + 1 < quizData.length) {
        setVisible((p) => p + 1);
      } else {
        setShowResult(true);
      }
    }, 500); // Saya perpanjang ke 500ms agar animasi lebih terlihat elegan
  };

  // Komputasi O(n) tanpa redundansi pengecekan array
  const correctCount = quizData.filter(
    (q, i) => answers[i] === q.answer,
  ).length;
  const progress =
    quizData.length > 0 ? Object.keys(submitted).length / quizData.length : 0;

  // Engine Styling Dinamis
  const getStyle = (qIdx: number, opt: string) => {
    if (!quizData[qIdx]) return "";

    const selected = answers[qIdx];
    const correct = quizData[qIdx].answer;
    const isSubmitted = submitted[qIdx];

    // FASE 1: Belum Disubmit (Fase Pemilihan)
    if (!isSubmitted) {
      return selected === opt
        ? "bg-[#a11212] border-[#a11212] text-white shadow-inner" // Warna solid jika terpilih
        : "bg-white border-[#a11212] text-gray-700 hover:bg-red-50"; // Warna default dengan efek hover
    }

    // FASE 2: Pasca-Submit (Fase Validasi/Koreksi)
    if (opt === correct) {
      return "bg-green-500 border-green-600 text-white shadow-md scale-[1.02]"; // Opsi yang benar (hijau)
    }

    if (opt === selected) {
      return "bg-red-500 border-red-600 text-white"; // Opsi yang salah tapi dipilih user (merah)
    }

    // Opsi yang tidak dipilih dan bukan jawaban benar (disable visual state)
    return "bg-gray-100 border-gray-200 text-gray-400 opacity-70";
  };

  if (loading) {
    // [Bagian loading Anda tidak diubah karena sudah bagus]
    return (
      <>
        <div className="absolute inset-0 backdrop-blur-[3px] bg-black/20 z-40 rounded-2xl" />
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="w-[92%] max-w-[320px] sm:max-w-[240px] sm:scale-[0.85] bg-[#a11212] rounded-2xl shadow-xl flex flex-col h-[420px] sm:h-[380px] overflow-hidden">
            <div className="flex items-center px-4 py-2">
              <Image src="/ikon-quiz.png" alt="" width={18} height={18} />
              <span className="text-white text-sm sm:text-xs font-bold ml-2 flex-1 brightness-0 invert">
                Quiz
              </span>
              <button onClick={onClose} className="text-white text-lg ml-2">
                ✕
              </button>
            </div>
            <div className="bg-[#f3f3f3] rounded-t-2xl px-4 py-3 flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-[#a11212] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[11px] text-gray-600">Memuat quiz...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || quizData.length === 0) {
    // [Bagian error Anda tidak diubah]
    return (
      <>
        <div className="absolute inset-0 backdrop-blur-[3px] bg-black/20 z-40 rounded-2xl" />
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="w-[92%] max-w-[320px] sm:max-w-[240px] sm:scale-[0.85] bg-[#a11212] rounded-2xl shadow-xl flex flex-col h-[420px] sm:h-[380px] overflow-hidden">
            <div className="flex items-center px-4 py-2">
              <Image src="/ikon-quiz.png" alt="" width={18} height={18} />
              <span className="text-white text-sm sm:text-xs font-bold ml-2 flex-1 brightness-0 invert">
                Quiz
              </span>
              <button onClick={onClose} className="text-white text-lg ml-2">
                ✕
              </button>
            </div>
            <div className="bg-[#f3f3f3] rounded-t-2xl px-4 py-3 flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-[11px] text-red-600 mb-3">
                  {error || "Quiz tidak tersedia"}
                </p>
                <button
                  onClick={onClose}
                  className="bg-[#a11212] text-white px-4 py-1.5 rounded-full text-[10px] font-bold"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="absolute inset-0 backdrop-blur-[3px] bg-black/20 z-40 rounded-2xl" />

      <div className="absolute inset-0 flex items-center justify-center z-50">
        <div className="w-[92%] max-w-[320px] sm:max-w-[240px] sm:scale-[0.85] bg-[#a11212] rounded-2xl shadow-xl flex flex-col h-[420px] sm:h-[380px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center px-4 py-2">
            <Image src="/ikon-quiz.png" alt="" width={18} height={18} />
            <span className="text-white text-sm sm:text-xs font-bold ml-2 flex-1 brightness-0 invert drop-shadow-[0_0_1px_rgba(0,0,0,0.8)]">
              Quiz
            </span>

            {/* Progress Bar */}
            <div className="w-16 h-[6px] bg-white rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${progress * 100}%`,
                  background:
                    "linear-gradient(90deg, #ff6b6b, #ff0000, #ff6b6b)",
                }}
              />
            </div>

            <button onClick={onClose} className="text-white text-lg ml-2">
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="bg-[#f3f3f3] rounded-t-2xl px-4 py-3 flex-1 overflow-y-auto space-y-5 scroll-smooth">
            <p className="text-[11px] font-bold text-gray-700">
              Pilih jawaban yang menurutmu paling tepat. Setiap jawaban akan
              langsung dikoreksi beserta penjelasannya.
            </p>

            {quizData.slice(0, visible).map((q, qIdx) => (
              <div
                key={qIdx}
                className="space-y-3 pb-2 border-b border-gray-200 last:border-0 animate-fade-in-up"
              >
                {/* Question */}
                <div className="flex gap-2 items-start">
                  <div className="w-5 h-5 min-w-[20px] rounded-full bg-[#a11212] text-white text-[10px] flex items-center justify-center font-bold">
                    {qIdx + 1}
                  </div>
                  <p className="text-[11.5px] sm:text-[10.5px] font-bold text-[#a11212] leading-relaxed">
                    {q.question}
                  </p>
                </div>

                {/* Reason (Hanya muncul jika sudah disubmit) */}
                {submitted[qIdx] && (
                  <div className="pl-7 pr-2">
                    <p
                      className={`text-[10px] sm:text-[9.5px] p-2 rounded-md ${answers[qIdx] === q.answer ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
                    >
                      <span className="font-bold">
                        {answers[qIdx] === q.answer
                          ? "✓ Tepat! "
                          : "✗ Kurang tepat. "}
                      </span>
                      {q.reason}
                    </p>
                  </div>
                )}

                {/* Options Grid */}
                {/* Perhatikan: Kelas !border-[#a11212] telah DIBUANG dari sini */}
                <div className="grid grid-cols-2 gap-2 pl-7 pr-2">
                  {q.options &&
                    q.options.map((opt, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelect(qIdx, opt)}
                        className={`
                        text-[9.5px] sm:text-[8px] px-2 py-2 rounded-xl border-2
                        text-center transition-all duration-300 select-none
                        ${!submitted[qIdx] ? "cursor-pointer hover:shadow-sm" : "cursor-default"}
                        ${getStyle(qIdx, opt)}
                      `}
                      >
                        {opt}
                      </div>
                    ))}
                </div>

                {/* Submit Button */}
                {!submitted[qIdx] && (
                  <div className="flex justify-center pl-7 mt-2">
                    <button
                      onClick={() => handleSubmit(qIdx)}
                      disabled={!answers[qIdx]}
                      className={`
                        px-6 py-1.5 rounded-full text-[10px] sm:text-[9px] font-bold transition-all
                        ${
                          answers[qIdx]
                            ? "bg-[#a11212] text-white hover:bg-red-800 shadow-md"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }
                      `}
                    >
                      {qIdx === quizData.length - 1
                        ? "Selesai"
                        : "Kirim Jawaban"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {showResult && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-[60] backdrop-blur-sm">
          <div className="w-[260px] rounded-2xl overflow-hidden shadow-2xl animate-fade-in-scale">
            <div className="bg-white text-center py-3 font-extrabold text-sm text-gray-800">
              🎉 Quiz Selesai!
            </div>
            <div className="bg-[#7a0000] text-white px-6 py-8 text-center relative flex flex-col items-center">
              <button
                onClick={onClose}
                className="absolute top-3 right-4 text-white/70 hover:text-white text-lg transition-colors"
              >
                ✕
              </button>

              <h1 className="text-4xl font-extrabold tracking-tighter drop-shadow-md mb-1">
                {correctCount}{" "}
                <span className="text-2xl text-white/70">
                  / {quizData.length}
                </span>
              </h1>

              <p className="text-xs text-red-200 font-medium mb-4 uppercase tracking-wider">
                Jawaban Benar
              </p>

              <p className="text-[11px] mb-6 leading-relaxed">
                {correctCount === quizData.length
                  ? "Sempurna! Pemahaman materimu sangat tajam. 🔥"
                  : correctCount > quizData.length / 2
                    ? "Kerja bagus! Sedikit lagi menuju sempurna. 💪"
                    : "Tidak apa-apa, ayo pelajari lagi materinya! 📚"}
              </p>

              <button
                onClick={() => {
                  setAnswers({});
                  setSubmitted({});
                  setVisible(1);
                  setShowResult(false);
                }}
                className="bg-white text-[#7a0000] hover:bg-gray-100 px-6 py-2.5 rounded-full text-xs font-bold transition-colors shadow-lg active:scale-95"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
