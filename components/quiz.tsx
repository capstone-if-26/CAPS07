"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

type QuizQuestion = {
  question: string
  options: string[]
  answer: string
  reason: string
}

type QuizProps = {
  chatId?: string
  onClose: () => void
}

export default function Quiz({ chatId, onClose }: QuizProps) {
  const [quizData, setQuizData] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({})
  const [visible, setVisible] = useState(1)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!chatId) {
        setError("Chat ID tidak ditemukan")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch(`/api/chats/${chatId}/quiz`)
        const result = await response.json()

        // DEBUG: lihat response dari backend di console
        console.log("=== RESPONSE QUIZ FROM BACKEND ===")
        console.log("Full response:", result)
        console.log("Status:", result.status)
        console.log("Data:", result.data)

        let quizArray: QuizQuestion[] = []

        if (result.status && result.data?.quiz && Array.isArray(result.data.quiz)) {
          quizArray = result.data.quiz
          console.log("Case 1: result.data.quiz")
        } else if (result.data && Array.isArray(result.data)) {
          quizArray = result.data
          console.log("Case 2: result.data is array")
        } else if (Array.isArray(result)) {
          quizArray = result
          console.log("Case 3: result is array")
        } else if (result.quiz && Array.isArray(result.quiz)) {
          quizArray = result.quiz
          console.log("Case 4: result.quiz")
        } else if (result.data?.data?.quiz && Array.isArray(result.data.data.quiz)) {
          quizArray = result.data.data.quiz
          console.log("Case 5: nested deeper")
        }

        console.log("Quiz array length:", quizArray.length)
        console.log("First quiz item:", quizArray[0])

        if (quizArray.length > 0) {
          setQuizData(quizArray)
        } else {
          setError("Tidak ada quiz yang tersedia")
        }
      } catch (err) {
        console.error("Error fetching quiz:", err)
        setError("Terjadi kesalahan. Silakan coba lagi.")
      } finally {
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [chatId])

  const handleSelect = (qIdx: number, opt: string) => {
    if (submitted[qIdx]) return
    setAnswers((p) => ({ ...p, [qIdx]: opt }))
  }

  const handleSubmit = (qIdx: number) => {
    if (!answers[qIdx]) return

    setSubmitted((p) => ({ ...p, [qIdx]: true }))

    setTimeout(() => {
      if (qIdx + 1 < quizData.length) {
        setVisible((p) => p + 1)
      } else {
        setShowResult(true)
      }
    }, 300)
  }

  const correctCount = Array.isArray(quizData) 
    ? quizData.filter((q, i) => answers[i] === q.answer).length 
    : 0

  const progress = Array.isArray(quizData) && quizData.length > 0 
    ? Object.keys(submitted).length / quizData.length 
    : 0

  const getStyle = (qIdx: number, opt: string) => {
    if (!Array.isArray(quizData) || !quizData[qIdx]) {
      return "bg-white border-gray-300 text-black"
    }
    
    const selected = answers[qIdx]
    const correct = quizData[qIdx].answer
    const isSubmitted = submitted[qIdx]

    if (!isSubmitted) {
      return selected === opt
        ? "bg-[#fca5a5] border-red-500 text-white"
        : "bg-white border-gray-300 text-black"
    }

    if (opt === correct) {
      return "bg-green-500 border-green-500 text-white"
    }

    if (opt === selected) {
      return "bg-red-500 border-red-500 text-white"
    }

    return "bg-white border-gray-200 text-gray-400"
  }

  // Loading state
  if (loading) {
    return (
      <>
        <div className="absolute inset-0 backdrop-blur-[3px] bg-black/20 z-40 rounded-2xl" />
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div
            className="
              w-[92%] max-w-[320px] sm:max-w-[240px] sm:scale-[0.85]
              bg-[#a11212] rounded-2xl shadow-xl flex flex-col
              h-[420px] sm:h-[380px] overflow-hidden
            "
          >
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
    )
  }

  // Error or empty state
  if (error || !Array.isArray(quizData) || quizData.length === 0) {
    return (
      <>
        <div className="absolute inset-0 backdrop-blur-[3px] bg-black/20 z-40 rounded-2xl" />
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div
            className="
              w-[92%] max-w-[320px] sm:max-w-[240px] sm:scale-[0.85]
              bg-[#a11212] rounded-2xl shadow-xl flex flex-col
              h-[420px] sm:h-[380px] overflow-hidden
            "
          >
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
    )
  }

  // Main render
  return (
    <>
      <div className="absolute inset-0 backdrop-blur-[3px] bg-black/20 z-40 rounded-2xl" />

      <div className="absolute inset-0 flex items-center justify-center z-50">
        <div
          className="
            w-[92%] max-w-[320px] sm:max-w-[240px] sm:scale-[0.85]
            bg-[#a11212] rounded-2xl shadow-xl flex flex-col
            h-[420px] sm:h-[380px] overflow-hidden
          "
        >
          {/* Header */}
          <div className="flex items-center px-4 py-2">
            <Image src="/ikon-quiz.png" alt="" width={18} height={18} />
            <span
              className="
                text-white text-sm sm:text-xs font-bold ml-2 flex-1
                brightness-0 invert drop-shadow-[0_0_1px_rgba(0,0,0,0.8)]
              "
            >
              Quiz
            </span>

            {/* Progress Bar */}
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
          <div
            className="
              bg-[#f3f3f3] rounded-t-2xl px-4 py-3
              flex-1 overflow-y-auto space-y-4
            "
          >
            <p className="text-[11px] font-bold text-gray-700">
              Pilih jawaban yang menurutmu paling tepat. Setiap jawaban akan
              langsung dikoreksi beserta penjelasannya.
            </p>

            {quizData.slice(0, visible).map((q, qIdx) => (
              <div key={qIdx} className="space-y-2">
                {/* question number & text */}
                <div className="flex gap-2 items-start">
                  <div
                    className="
                      w-5 h-5 min-w-[20px] rounded-full bg-[#a11212]
                      text-white text-[10px] flex items-center justify-center font-bold
                    "
                  >
                    {qIdx + 1}
                  </div>
                  <p
                    className="
                      text-[11px] sm:text-[10px] font-bold text-[#a11212] leading-snug
                    "
                  >
                    {q.question}
                  </p>
                </div>

                {/* Reason (after submit) */}
                {submitted[qIdx] && (
                  <p className="text-[10px] sm:text-[9px] text-gray-600 pl-7">
                    {q.reason}
                  </p>
                )}

                {/* Options grid */}
                <div className="grid grid-cols-2 gap-2 pl-7">
                  {q.options && q.options.map((opt, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelect(qIdx, opt)}
                      className={`
                        text-[9px] sm:text-[7px] px-2 py-1 rounded-full
                        border-2 !border-[#a11212] text-center cursor-pointer
                        transition-all ${getStyle(qIdx, opt)}
                      `}
                    >
                      {opt}
                    </div>
                  ))}
                </div>

                {/* Submit button */}
                {!submitted[qIdx] && (
                  <div className="flex justify-center pl-7">
                    <button
                      onClick={() => handleSubmit(qIdx)}
                      className="
                        mt-2 bg-[#a11212] text-white px-5 py-1.5
                        rounded-full text-[10px] sm:text-[9px] font-bold
                      "
                    >
                      {qIdx === quizData.length - 1 ? "Done" : "Submit"}
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="w-[260px] rounded-xl overflow-hidden">
            <div className="bg-white text-center py-2 font-bold text-sm">
              🎉 Quiz selesai!
            </div>
            <div className="bg-[#7a0000] text-white px-6 py-6 text-center relative">
              <button
                onClick={onClose}
                className="absolute top-2 right-3 text-white text-lg"
              >
                ✕
              </button>

              <h1 className="text-3xl font-extrabold">
                {correctCount} / {quizData.length}
              </h1>

              <p className="text-xs opacity-80 mb-3">Jawaban benar</p>

              <p className="text-xs mb-4">
                Mantap! Kamu sudah paham banget🔥
              </p>

              <button
                onClick={() => {
                  setAnswers({})
                  setSubmitted({})
                  setVisible(1)
                  setShowResult(false)
                }}
                className="bg-white text-[#7a0000] px-4 py-2 rounded-full text-xs font-bold"
              >
                Ulangi Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}