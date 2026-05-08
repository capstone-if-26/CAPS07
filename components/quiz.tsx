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
  chatId: string;
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
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/chats/${chatId}/quiz`, { signal });
        const result = await response.json();

        if (!response.ok) {
          setError(result?.message || "Gagal memuat quiz. Silakan coba beberapa saat lagi.");
          return;
        }

        if (Array.isArray(result.data) && result.data.length > 0) {
          setQuizData(result.data);
        } else {
          setError(result?.message || "Soal quiz tidak tersedia untuk percakapan ini.");
        }
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        setError("Gagal memuat quiz. Silakan coba beberapa saat lagi.");
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
    if (submitted[qIdx]) return;
    setAnswers((p) => ({ ...p, [qIdx]: opt }));
  };

  const handleSubmit = (qIdx: number) => {
    if (!answers[qIdx]) return;

    setSubmitted((p) => ({ ...p, [qIdx]: true }));

    setTimeout(() => {
      if (qIdx + 1 < quizData.length) {
        setVisible((p) => p + 1);
      } else {
        setShowResult(true);
      }
    }, 500);
  };

  const correctCount = quizData.filter(
    (q, i) => answers[i] === q.answer,
  ).length;
  const progress =
    quizData.length > 0 ? Object.keys(submitted).length / quizData.length : 0;

  const getStyle = (qIdx: number, opt: string) => {
    if (!quizData[qIdx]) return "";

    const selected = answers[qIdx];
    const correct = quizData[qIdx].answer;
    const isSubmitted = submitted[qIdx];

    if (!isSubmitted) {
      return selected === opt
        ? "bg-green-500 border-green-500 text-white shadow-inner"
        : "bg-[#f5f5f5] border-[#a11212] text-gray-700 hover:bg-gray-100";
    }

    if (opt === correct) {
      return "bg-green-500 border-green-600 text-white shadow-md scale-[1.02]";
    }

    if (opt === selected) {
      return "bg-red-500 border-red-600 text-white";
    }

    return "bg-gray-100 border-gray-200 text-gray-400 opacity-70";
  };

  if (loading) {
    return (
      <>
        <div className="absolute inset-0 backdrop-blur-[3px] bg-black/20 z-40 rounded-2xl" />
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="w-[92%] max-w-[320px] sm:max-w-[240px] sm:scale-[0.85] bg-[#a11212] rounded-2xl shadow-xl flex flex-col h-[420px] sm:h-[380px] overflow-hidden" style={{ border: "1px solid #c21f26" }}>
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

  if (error) {
    return (
      <>
        <div className="absolute inset-0 backdrop-blur-[3px] bg-black/20 z-40 rounded-2xl" />
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="w-[92%] max-w-[320px] sm:max-w-[240px] sm:scale-[0.85] bg-[#a11212] rounded-2xl shadow-xl flex flex-col h-[420px] sm:h-[380px] overflow-hidden" style={{ border: "1px solid #c21f26" }}>
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
                <p className="text-[11px] text-red-600 mb-3">{error}</p>
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
        <div className="w-[92%] max-w-[320px] sm:max-w-[240px] sm:scale-[0.85] bg-[#a11212] rounded-2xl shadow-xl flex flex-col h-[420px] sm:h-[380px] overflow-hidden" style={{ border: "1px solid #c21f26" }}>
          {/* Header */}
          <div className="flex items-center px-4 py-2">
            <Image src="/ikon-quiz.png" alt="" width={18} height={18} />
            <span className="text-white text-sm sm:text-xs font-bold ml-2 flex-1 brightness-0 invert drop-shadow-[0_0_1px_rgba(0,0,0,0.8)]">
              Quiz
            </span>

            {/* Progress bar */}
            <div className="w-16 h-[6px] bg-white rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${progress * 100}%`,
                  background: "linear-gradient(90deg, #ff6b6b, #ff0000, #ff6b6b)",
                }}
              />
            </div>

            <button onClick={onClose} className="text-white text-lg ml-2">
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="bg-[#f3f3f3] rounded-t-2xl px-4 py-3 flex-1 overflow-y-auto space-y-5 scroll-smooth">
            <div className="pb-2 border-b border-[#a11212] mb-1">
              <p className="text-[11px] font-bold text-gray-800">
                Pilih jawaban yang menurutmu paling tepat. Setiap jawaban akan langsung dikoreksi beserta penjelasannya.
              </p>
            </div>

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

                {/* Reason */}
                {submitted[qIdx] && (
                  <div className="pl-7 pr-2">
                    <p
                      className={`text-[10px] sm:text-[9.5px] p-2 rounded-md ${
                        answers[qIdx] === q.answer
                          ? "bg-green-50 text-green-800"
                          : "bg-red-50 text-red-800"
                      }`}
                    >
                      <span className="font-bold">
                        {answers[qIdx] === q.answer ? "✓ Tepat! " : "✗ Kurang tepat. "}
                      </span>
                      {q.reason}
                    </p>
                  </div>
                )}

                {/* Options */}
                <div className="grid grid-cols-2 gap-2 pl-7 pr-2">
                  {q.options &&
                    q.options.map((opt, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelect(qIdx, opt)}
                        className={`
                          text-[9.5px] sm:text-[8px] px-2 py-2 rounded-xl border
                          flex items-center gap-1.5
                          transition-all duration-300 select-none
                          ${!submitted[qIdx] ? "cursor-pointer hover:shadow-sm" : "cursor-default"}
                          ${getStyle(qIdx, opt)}
                        `}
                      >
                        {/* Bulatan radio di kiri */}
                        <span className={`flex-shrink-0 w-3 h-3 rounded-full border-2 flex items-center justify-center
                          ${answers[qIdx] === opt && !submitted[qIdx] ? "border-white" : "border-current opacity-60"}
                          ${submitted[qIdx] && opt === q.answer ? "border-white" : ""}
                        `}>
                          {(answers[qIdx] === opt) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                          )}
                        </span>
                        <span>{opt}</span>
                      </div>
                    ))}
                </div>

                {/* Submit button */}
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
                      Submit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Result modal */}
      {showResult && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-[60] backdrop-blur-sm">
          <div className="w-[260px] rounded-2xl overflow-hidden shadow-2xl animate-fade-in-scale">
            <div className="bg-white text-center py-3 font-extrabold text-sm text-gray-800 relative">
              🎉 Quiz Selesai!
              <button
                onClick={onClose}
                className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-gray-600 text-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="bg-[#7a0000] text-white px-6 py-8 text-center relative flex flex-col items-center">
              <h1 className="text-4xl font-extrabold tracking-tighter drop-shadow-md mb-1">
                {correctCount}{" "}
                <span className="text-2xl text-white/70">/ {quizData.length}</span>
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
                Ulangi Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}