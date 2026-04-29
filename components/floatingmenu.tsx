"use client"
import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import {
  streamChatReply,
  getChatHistory,
  getIntentSummary,
  saveChatId,
  getSavedChatId,
  clearChatId,
  type Message,
  type ChatSource,
  type ChatQuestion,
  type ChatTaskEvent,
  type IntentSummaryMessageSnapshot,
} from "@/lib/api/chat"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Message as AIMessage,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources"
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@/components/ai-elements/task"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatSourceListingLine } from "@/lib/format-source-title"

type UIMessage = {
  text: string
  sender: "user" | "bot"
  sources?: ChatSource[]
  question?: ChatQuestion
  selectedQuestionChoice?: QuestionChoice
  selectedQuestionCustomAnswer?: string
}
type ChatHistory = { id: string; title: string }
type QuestionChoice = string | "custom"

const QUICK_MENU = [
  "Cek Legalitas Pinjol / Investasi",
  "Hak Saya sebagai Konsumen Keuangan",
  "Panduan Produk Bank (Tabungan, Kredit, KPR)",
  "Cek SLIK / Riwayat Kredit Saya",
  "Panduan Investasi & Kripto Aman",
  "Literasi & Tips Keuangan Harian",
  "Kenali Modus Penipuan Keuangan",
  "Cara Lapor / Pengaduan ke OJK",
]

const chatTooltipContentClass = cn(
  "z-[10000] max-w-none border border-[#c21f26] bg-white px-2 py-1 text-[10px] font-semibold text-[#8C0000] shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
)

const chatBotBubbleBaseClass = cn(
  "rounded-md border border-[#a11212] bg-[#f3f3f3] p-2 text-[12px] font-normal leading-snug text-black wrap-break-word sm:p-1.5"
)
const chatUserBubbleBaseClass = cn(
  "rounded-md border border-[#a11212] bg-[#a11212] p-2 text-[12px] font-normal leading-snug text-white wrap-break-word sm:p-1.5"
)
const chatBotBubbleClass = cn(
  chatBotBubbleBaseClass,
  "max-w-[min(100%,20rem)] sm:max-w-[min(100%,18rem)]"
)
const chatUserBubbleClass = cn(
  chatUserBubbleBaseClass,
  "max-w-[min(100%,20rem)] sm:max-w-[min(100%,18rem)]"
)

function normalizeSourceTitle(value: string) {
  return value.replace(/\s*\|\s*/g, " · ").replace(/\s+/g, " ").trim()
}

function parseSourcesFromText(text: string): { text: string; sources: ChatSource[] } {
  const referenceMatch = text.match(/(?:^|\n)Referensi\s*:\s*([\s\S]*)$/i)
  if (!referenceMatch || typeof referenceMatch.index !== "number") {
    return { text, sources: [] }
  }

  const sources = referenceMatch[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^[-*]\s*\[(\d+)\]\s*(.+)$/)
      if (!match) return null

      return {
        href: "#",
        title: `[${match[1]}] ${normalizeSourceTitle(match[2])}`,
      }
    })
    .filter((source): source is ChatSource => Boolean(source))

  return { text: text.slice(0, referenceMatch.index).trim(), sources }
}

function sourcesFromMetadata(metadata?: string | null): ChatSource[] {
  if (!metadata) return []

  try {
    const parsed = JSON.parse(metadata) as { matches?: unknown }
    if (!Array.isArray(parsed.matches)) return []

    return parsed.matches
      .map((match, index) => {
        if (typeof match !== "object" || match === null || !("metadata" in match)) return null

        const item = match as { metadata?: Record<string, unknown> }
        const md = item.metadata || {}
        const textPreview = String(md.text || "")
          .replace(/\s+/g, " ")
          .trim()

        return {
          href: "#",
          title: formatSourceListingLine(`[${index + 1}]`, {
            documentName: String(md.document_name || "Dokumen Internal OJK"),
            sectionPath: String(md.section_path || ""),
            chunkType: String(md.chunk_type || ""),
            chunkIndex: md.chunk_index as string | number | null | undefined,
            textPreview,
          }),
        }
      })
      .filter((source): source is ChatSource => Boolean(source))
  } catch {
    return []
  }
}

function mergeSources(...groups: ChatSource[][]) {
  const byTitle = new Map<string, ChatSource>()

  for (const source of groups.flat()) {
    if (!byTitle.has(source.title)) {
      byTitle.set(source.title, source)
    }
  }

  return Array.from(byTitle.values())
}

function getMessagePresentation(message: UIMessage) {
  if (message.sender === "user") {
    return { text: message.text, sources: [] }
  }

  const parsed = parseSourcesFromText(message.text)

  return {
    text: parsed.text,
    sources: mergeSources(message.sources || [], parsed.sources),
  }
}

function RiwayatItem({
  item,
  onHapus,
  onLoad,
}: {
  item: ChatHistory
  onHapus: (id: string) => void
  onLoad: (id: string) => void
}) {
  return (
    <div className="group relative flex items-center justify-between px-3 py-1 transition hover:bg-red-50">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onLoad(item.id)}
        className="h-auto flex-1 justify-start px-0 py-0 pr-2 text-left text-xs font-semibold text-gray-800 hover:bg-transparent hover:text-[#a11212] group-hover:text-[#a11212]"
      >
        <span className="truncate">{item.title}</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 p-0 text-sm font-bold text-[#a11212] hover:bg-transparent hover:opacity-70"
          >
            ···
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[85px] border border-[#c21f26] bg-white p-0 shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
        >
          <DropdownMenuItem
            className="cursor-pointer justify-start gap-1.5 px-2.5 py-2 text-xs font-semibold text-gray-900 focus:bg-red-50"
            onSelect={() => onHapus(item.id)}
          >
            <Image src="/ikon-hapus.png" alt="" width={11} height={11} />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function FollowUpQuestion({
  question,
  selectedChoice,
  customAnswer,
  isLoading,
  textareaRef,
  onSelect,
  onCustomAnswerChange,
  onSubmit,
}: {
  question: ChatQuestion
  selectedChoice: QuestionChoice | null
  customAnswer: string
  isLoading: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onSelect: (choice: QuestionChoice) => void
  onCustomAnswerChange: (value: string) => void
  onSubmit: () => void
}) {
  const radioName = `follow-up-${question.id}`
  const choices = question.options.slice(0, 4)
  const canSubmit =
    selectedChoice !== null &&
    (selectedChoice !== "custom" || customAnswer.trim().length > 0)

  return (
    <div
      className={cn(chatBotBubbleBaseClass, "w-full max-w-full overflow-hidden")}
      role="group"
      aria-label={question.question}
    >
      <p className="m-0 mb-2 leading-snug wrap-break-word sm:mb-1.5">{question.question}</p>
      <div className="flex flex-col gap-2 sm:gap-1.5">
        {choices.map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-pointer items-center gap-2 leading-snug"
          >
            <input
              type="radio"
              name={radioName}
              value={opt.id}
              checked={selectedChoice === opt.id}
              onChange={() => onSelect(opt.id)}
              className="sr-only"
              disabled={isLoading}
            />
            <span
              className={cn(
                "relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#a11212] bg-white",
                selectedChoice === opt.id && "ring-1 ring-white ring-inset"
              )}
              aria-hidden
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full bg-[#a11212] transition-opacity",
                  selectedChoice === opt.id ? "opacity-100" : "opacity-0"
                )}
              />
            </span>
            <span className="min-w-0 flex-1 wrap-break-word">{opt.label}</span>
          </label>
        ))}

        <label className="flex cursor-pointer items-center gap-2 leading-snug">
          <input
            type="radio"
            name={radioName}
            value="custom"
            checked={selectedChoice === "custom"}
            onChange={() => onSelect("custom")}
            className="sr-only"
            disabled={isLoading}
          />
          <span
            className={cn(
              "relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#a11212] bg-white",
              selectedChoice === "custom" && "ring-1 ring-white ring-inset"
            )}
            aria-hidden
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full bg-[#a11212] transition-opacity",
                selectedChoice === "custom" ? "opacity-100" : "opacity-0"
              )}
            />
          </span>
          <span className="min-w-0 flex-1 wrap-break-word">{question.customOptionLabel}</span>
        </label>

        {selectedChoice === "custom" && (
          <Textarea
            ref={textareaRef}
            value={customAnswer}
            onChange={(event) => onCustomAnswerChange(event.target.value)}
            placeholder="Tulis jawaban kamu..."
            disabled={isLoading}
            rows={1}
            className="min-h-9 w-full resize-none overflow-hidden rounded border-[#a11212] bg-white px-2.5 py-2 text-[12px] leading-snug text-black shadow-none placeholder:text-[#a11212]/60 focus-visible:ring-[#a11212]/30 disabled:opacity-60"
          />
        )}

        {!isLoading && selectedChoice !== null && (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isLoading || !canSubmit}
            className="mt-1 h-8 self-start rounded border-0 bg-[#a11212] px-3 text-[12px] font-semibold text-white shadow-none hover:bg-[#8a0f0f] focus-visible:ring-[#a11212]/40 disabled:opacity-60"
          >
            Kirim
          </Button>
        )}
      </div>
    </div>
  )
}

export default function FloatingMenu() {
  const [openChat, setOpenChat] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAwaitingAssistantOutput, setIsAwaitingAssistantOutput] = useState(false)
  const [tasks, setTasks] = useState<ChatTaskEvent[]>([])
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const [showDotMenu, setShowDotMenu] = useState(false)
  const [showRiwayat, setShowRiwayat] = useState(false)
  const [riwayatList, setRiwayatList] = useState<ChatHistory[]>([])
  const [copySuccess, setCopySuccess] = useState(false)
  const [isSummaryCopyLoading, setIsSummaryCopyLoading] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState<ChatQuestion | null>(null)
  const [questionChoice, setQuestionChoice] = useState<QuestionChoice | null>(null)
  const [customQuestionAnswer, setCustomQuestionAnswer] = useState("")

  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const questionTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { clearChatId(); setMessages([]) }, [])

  useEffect(() => {
    if (!openChat) return
    const chatId = getSavedChatId()
    if (!chatId) return
    getChatHistory(chatId)
      .then((res) => {
        if (res.status && res.data.messages.length > 0) {
          setMessages(res.data.messages.map((m: Message) => ({
            text: m.content,
            sender: m.senderType === "user" ? "user" : "bot",
            sources: m.senderType === "assistant" ? sourcesFromMetadata(m.metadata) : undefined,
          })))
        }
      })
      .catch(() => clearChatId())
  }, [openChat])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const el = chatContainerRef.current
    if (!el) return
    const fn = () => {
      setShowScrollBtn(el.scrollHeight > el.clientHeight && el.scrollHeight - el.scrollTop - el.clientHeight >= 10)
    }
    fn(); el.addEventListener("scroll", fn)
    return () => el.removeEventListener("scroll", fn)
  }, [messages])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = textareaRef.current
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 96) + "px" }
  }

  const resetPendingQuestion = () => {
    setPendingQuestion(null)
    setQuestionChoice(null)
    setCustomQuestionAnswer("")
    if (questionTextareaRef.current) questionTextareaRef.current.style.height = "auto"
  }

  const handleCustomQuestionAnswerChange = (value: string) => {
    setCustomQuestionAnswer(value)
    const el = questionTextareaRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
    }
  }

  const handleSend = async (customText?: string) => {
    const text = (customText ?? input).trim()
    if (!text || isLoading) return
    const activeQuestion = pendingQuestion
    const questionForModel = activeQuestion
      ? `Jawaban untuk pertanyaan "${activeQuestion.question}": ${text}`
      : text
    setMessages((p) => [...p, { text, sender: "user" }])
    if (!customText) { setInput(""); if (textareaRef.current) textareaRef.current.style.height = "auto" }
    if (activeQuestion) resetPendingQuestion()
    setIsLoading(true)
    setIsAwaitingAssistantOutput(true)
    setTasks([])
    try {
      const currentChatId = getSavedChatId()
      let hasAssistantOutput = false
      let currentAssistantMessageIndex: number | null = null
      let questionAskedThisTurn = false

      await streamChatReply({
        question: questionForModel,
        chatId: currentChatId,
        onChatId: (resolvedChatId) => {
          if (!currentChatId) {
            saveChatId(resolvedChatId)
            setRiwayatList((p) => {
              if (p.some((item) => item.id === resolvedChatId)) return p
              return [{ id: resolvedChatId, title: text.length > 40 ? text.substring(0, 40) + "..." : text }, ...p]
            })
          }
        },
        onToken: (chunk) => {
          if (!chunk) return
          if (questionAskedThisTurn) return
          hasAssistantOutput = true
          setIsAwaitingAssistantOutput(false)
          setMessages((p) => {
            if (!p.length) {
              currentAssistantMessageIndex = 0
              return [{ text: chunk, sender: "bot" }]
            }

            const updated = [...p]
            const messageIndex = currentAssistantMessageIndex
            if (messageIndex === null) {
              currentAssistantMessageIndex = updated.length
              updated.push({ text: chunk, sender: "bot" })
              return updated
            }

            const existingMessage = updated[messageIndex]

            if (!existingMessage || existingMessage.sender !== "bot") {
              currentAssistantMessageIndex = updated.length
              updated.push({ text: chunk, sender: "bot" })
              return updated
            }

            updated[messageIndex] = {
              ...existingMessage,
              text: `${existingMessage.text}${chunk}`,
            }
            return updated
          })
        },
        onTask: (task) => {
          setTasks((prev) => {
            const index = prev.findIndex((item) => item.title === task.title)
            if (index === -1) return [...prev, task]

            const updated = [...prev]
            updated[index] = task
            return updated
          })
        },
        onSource: (source) => {
          if (questionAskedThisTurn) return
          hasAssistantOutput = true
          setIsAwaitingAssistantOutput(false)
          setMessages((p) => {
            const updated = [...p]
            const messageIndex = currentAssistantMessageIndex
            if (messageIndex === null) {
              currentAssistantMessageIndex = updated.length
              updated.push({ text: "", sender: "bot", sources: [source] })
              return updated
            }

            const existingMessage = updated[messageIndex]

            if (!existingMessage || existingMessage.sender !== "bot") {
              currentAssistantMessageIndex = updated.length
              updated.push({ text: "", sender: "bot", sources: [source] })
              return updated
            }

            const sources = mergeSources(existingMessage.sources || [], [source])
            updated[messageIndex] = { ...existingMessage, sources }
            return updated
          })
        },
        onQuestion: (question) => {
          hasAssistantOutput = true
          questionAskedThisTurn = true
          setIsAwaitingAssistantOutput(false)
          const nextQuestion = {
            ...question,
            options: question.options.slice(0, 4),
            customOptionLabel: question.customOptionLabel || "Tulis jawaban kamu",
          }
          setPendingQuestion(nextQuestion)
          setQuestionChoice(null)
          setCustomQuestionAnswer("")
          setMessages((p) => {
            const updated = [...p]
            const messageIndex = currentAssistantMessageIndex
            if (messageIndex === null) {
              currentAssistantMessageIndex = updated.length
              updated.push({ text: "", sender: "bot", question: nextQuestion })
              return updated
            }

            const existingMessage = updated[messageIndex]

            if (!existingMessage || existingMessage.sender !== "bot") {
              currentAssistantMessageIndex = updated.length
              updated.push({ text: "", sender: "bot", question: nextQuestion })
              return updated
            }

            updated[messageIndex] = {
              text: "",
              sender: "bot",
              question: nextQuestion,
            }
            return updated
          })
        },
      })

      if (!hasAssistantOutput) {
        setMessages((p) => {
          if (!p.length) return p
          const updated = [...p]
          const lastIndex = updated.length - 1
          const lastMessage = updated[lastIndex]

          if (lastMessage.sender === "bot" && !lastMessage.text.trim()) {
            updated[lastIndex] = { text: "Maaf, terjadi kesalahan pada server.", sender: "bot" }
            return updated
          }

          if (lastMessage.sender === "user") {
            updated.push({ text: "Maaf, terjadi kesalahan pada server.", sender: "bot" })
          }

          return updated
        })
      }
    } catch {
      setMessages((p) => {
        if (!p.length) return [{ text: "Maaf, tidak dapat terhubung ke server. Silakan coba beberapa saat lagi.", sender: "bot" }]

        const updated = [...p]
        const lastIndex = updated.length - 1
        const lastMessage = updated[lastIndex]

        if (lastMessage.sender === "bot" && !lastMessage.text.trim()) {
          updated[lastIndex] = { text: "Maaf, tidak dapat terhubung ke server. Silakan coba beberapa saat lagi.", sender: "bot" }
          return updated
        }

        updated.push({ text: "Maaf, tidak dapat terhubung ke server. Silakan coba beberapa saat lagi.", sender: "bot" })
        return updated
      })
    } finally { setIsLoading(false); setIsAwaitingAssistantOutput(false); setTasks([]) }
  }

  const handleQuestionSubmit = () => {
    if (!pendingQuestion || !questionChoice) return

    const selectedOption = pendingQuestion.options.find((option) => option.id === questionChoice)
    const answer = questionChoice === "custom" ? customQuestionAnswer.trim() : selectedOption?.label.trim()
    if (!answer) return

    const submittedQuestionId = pendingQuestion.id
    const submittedChoice = questionChoice
    const submittedCustomAnswer = customQuestionAnswer.trim()

    setMessages((prev) =>
      prev.map((message) =>
        message.question?.id === submittedQuestionId
          ? {
              ...message,
              selectedQuestionChoice: submittedChoice,
              selectedQuestionCustomAnswer: submittedCustomAnswer,
            }
          : message
      )
    )

    handleSend(answer)
  }

  const handleChatBaru = () => { clearChatId(); setMessages([]); resetPendingQuestion(); setShowDotMenu(false); setShowRiwayat(false) }

  const handleHapusRiwayat = (id: string) => {
    setRiwayatList((prev) => {
      const updated = prev.filter((item) => item.id !== id)
      if (updated.length === 0) {
        clearChatId()
        setMessages([])
        setShowRiwayat(false)
      }
      return updated
    })
  }

  const handleLoadRiwayat = (id: string) => {
    saveChatId(id)
    getChatHistory(id).then((res) => {
      if (res.status && res.data.messages.length > 0)
        setMessages(res.data.messages.map((m: Message) => ({
          text: m.content,
          sender: m.senderType === "user" ? "user" : "bot",
          sources: m.senderType === "assistant" ? sourcesFromMetadata(m.metadata) : undefined,
        })))
      resetPendingQuestion()
    }).catch(() => {})
    setShowRiwayat(false)
  }

  const handleCopy = () => {
    if (!messages.length || isSummaryCopyLoading) return

    const chatId = getSavedChatId()
    const fallbackSummary = messages.map((m) => `${m.sender === "user" ? "Saya" : "ROJAK"}: ${m.text}`).join("\n\n")

    const finishSuccess = () => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }

    void (async () => {
      if (!chatId) {
        try {
          await navigator.clipboard.writeText(fallbackSummary)
          finishSuccess()
        } catch {
          /* clipboard denied or unsupported */
        }
        return
      }

      setIsSummaryCopyLoading(true)
      try {
        const messagesSnapshot: IntentSummaryMessageSnapshot[] = messages
          .map((m): IntentSummaryMessageSnapshot => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text.trim(),
          }))
          .filter((m) => m.content.length > 0)

        const textPromise = getIntentSummary(chatId, messagesSnapshot)
          .then((res) => {
            if (res.status && res.data.summary) return res.data.summary
            return fallbackSummary
          })
          .catch(() => fallbackSummary)

        if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
          const blobPromise = textPromise.then((text) => new Blob([text], { type: "text/plain" }))
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/plain": blobPromise,
            }),
          ])
          finishSuccess()
        } else {
          const text = await textPromise
          try {
            await navigator.clipboard.writeText(text)
            finishSuccess()
          } catch {
            const ta = document.createElement("textarea")
            ta.value = text
            ta.setAttribute("readonly", "")
            ta.style.position = "fixed"
            ta.style.left = "0"
            ta.style.top = "0"
            ta.style.opacity = "0"
            document.body.appendChild(ta)
            ta.select()
            try {
              if (document.execCommand("copy")) finishSuccess()
            } finally {
              document.body.removeChild(ta)
            }
          }
        }
      } catch {
        /* Clipboard write failed */
      } finally {
        setIsSummaryCopyLoading(false)
      }
    })()
  }

  const handleToggleRiwayat = () => {
    if (showRiwayat) { setShowRiwayat(false) }
    else { setShowDotMenu(false); setShowRiwayat(true) }
  }

  const handleAutoScroll = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const showReasoningWhileLoading = isLoading && isAwaitingAssistantOutput

  return (
    <>
      <style>{`
        .chat-scroll::-webkit-scrollbar { display: none; }
        .chat-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        .dot-1 { animation: pulse-dot 1.2s infinite 0s; }
        .dot-2 { animation: pulse-dot 1.2s infinite 0.2s; }
        .dot-3 { animation: pulse-dot 1.2s infinite 0.4s; }
        .dot-menu-item:hover, .dot-menu-item:focus, .dot-menu-item[data-highlighted] { background-color: rgba(140,0,0,0.08); color: #8C0000; }
        .bot-markdown p { margin: 0 0 0.4em 0; }
        .bot-markdown ul, .bot-markdown ol { margin: 4px 0 6px 0; padding-left: 16px; }
        .bot-markdown li { margin: 2px 0; }
        .bot-markdown strong, .bot-markdown b { font-weight: 700; }
        .bot-markdown h1, .bot-markdown h2, .bot-markdown h3, .bot-markdown h4 { margin: 0 0 6px 0; font-size: inherit; }
        .bot-markdown code { font-size: 0.75rem; }
        .bot-markdown pre { margin: 6px 0; overflow-x: auto; }
        .chat-task-content > div { margin-top: 0.35rem; border-left-color: rgba(161,18,18,0.45); padding-left: 0.6rem; }
        @keyframes slideInRiwayat {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 640px) {
          .chat-widget-root .bot-markdown p { margin: 0 0 0.3em 0; }
          .chat-widget-root .bot-markdown ul, .chat-widget-root .bot-markdown ol { margin: 2px 0 4px 0; }
        }
      `}</style>

      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-3 sm:gap-2 sm:right-3 sm:bottom-3">
        <Button
          type="button"
          size="icon"
          onClick={() => setOpenChat(!openChat)}
          className="h-10 w-10 rounded-full border-0 bg-[#a11212] p-0 shadow-md hover:bg-[#8a0f0f] focus-visible:ring-[#a11212]/40"
        >
          <Image src="/avatar-botnew.png" alt="chatbot" width={39} height={39} />
        </Button>
        <Image src="/ikon-wanew.png" alt="wa" width={39} height={39} />
        <Image src="/ikon-idnew.png" alt="id" width={39} height={39} />
        <Image src="/ikon-orangnew.png" alt="user" width={39} height={39} />
      </div>

      {openChat && (
        <div className="fixed inset-0 z-50 flex flex-col sm:pointer-events-none sm:block sm:bg-transparent">

          <div className="relative flex w-full items-center justify-between bg-white px-6 py-3 sm:hidden">
            <Image src="/ojk-logo.png" alt="ojk" width={120} height={38} />
            <Image src="/ikon-hamburger.png" alt="menu" width={24} height={24} onClick={() => setOpenMenu(!openMenu)} className="translate-y-1 cursor-pointer" />
            {openMenu && (
              <div className="absolute top-full left-0 z-50 w-full border-t border-gray-200 bg-white shadow-md">
                <ul className="flex flex-col px-4 pt-2 pb-2 text-[14px] font-bold text-gray-800">
                  {["Tentang OJK","Fungsi Utama","Publikasi","Regulasi","Statistik","Layanan","Kasir"].map((item) => (
                    <li key={item} className="cursor-pointer border-b border-gray-100 py-3 last:border-0 hover:text-red-700" onClick={() => setOpenMenu(false)}>{item}</li>
                  ))}
                </ul>

                <div className="flex items-center gap-3 border-t border-gray-100 px-4 pt-2 pb-4">
                  <div className="flex h-[38px] flex-1 items-center rounded-full bg-gray-100 px-3">
                    <Image src="/ikon-cari2.png" alt="search" width={16} height={16} className="opacity-50" />
                    <Input
                      type="search"
                      className="ml-2 h-9 min-h-0 flex-1 border-0 bg-transparent p-0 text-[15px] shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">ID</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex h-dvh flex-col items-center justify-start overflow-hidden bg-[#850C12] pt-6 pb-6 sm:block sm:bg-transparent">
            <div
                style={{ border: "1.5px solid #a11212" }}
                className="
                  chat-widget-root
                  chat-responsive
                  font-sans
                  bg-[#f3f3f3]
                  shadow-[0_6px_18px_rgba(0,0,0,0.18)]
                  sm:fixed sm:right-18 sm:bottom-28
                  p-4 sm:py-3 sm:px-3
                  flex flex-col
                  rounded-2xl sm:rounded-xl
                  pointer-events-auto
                  overflow-hidden
                  sm:shadow-[0_0_16px_2px_rgba(161,18,18,0.2),0_6px_18px_rgba(0,0,0,0.18)]
                "
            >

              <div
                className="relative flex w-full shrink-0 items-center gap-1.5 bg-[#a11212] py-2 pr-2 pl-2 text-[15px] font-semibold text-white sm:py-1.5"
                style={{ borderRadius: showRiwayat ? "6px 6px 0 0" : "6px" }}
              >
                <Image src="/ikon-chtbotnew.png" alt="bot" width={16} height={16} className="shrink-0" />
                <span className="flex-1">Sahabat Keuangan</span>

                <DropdownMenu
                  open={showDotMenu}
                  onOpenChange={(open) => {
                    if (open && showRiwayat) {
                      setShowRiwayat(false)
                      setShowDotMenu(false)
                      return
                    }
                    setShowDotMenu(open)
                  }}
                >
                  {showDotMenu || showRiwayat ? (
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto p-0 px-1 text-[16px] font-bold leading-none text-white hover:bg-transparent hover:opacity-80"
                      >
                        ⋮
                      </Button>
                    </DropdownMenuTrigger>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-auto p-0 px-1 text-[16px] font-bold leading-none text-white hover:bg-transparent hover:opacity-80"
                          >
                            ⋮
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        align="end"
                        sideOffset={6}
                        className={chatTooltipContentClass}
                      >
                        Menu
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <DropdownMenuContent
                    align="end"
                    className="min-w-[130px] overflow-hidden rounded-md border border-[#e5e5e5] bg-white p-0 shadow-lg"
                  >
                    <DropdownMenuItem
                      className="dot-menu-item cursor-pointer rounded-none px-3 py-2.5 text-xs font-semibold text-gray-800 sm:py-2"
                      onSelect={() => { handleChatBaru() }}
                    >
                      Chat Baru
                    </DropdownMenuItem>
                    <div className="h-px w-full" style={{ background: "#f0f0f0" }} role="none" />
                    <DropdownMenuItem
                      className="dot-menu-item cursor-pointer rounded-none px-3 py-2.5 text-xs font-semibold text-gray-800 sm:py-2"
                      onSelect={() => { handleToggleRiwayat() }}
                    >
                      Riwayat Chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="relative">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto w-auto p-0 hover:bg-transparent"
                        onClick={() => { setOpenChat(false) }}
                      >
                        <Image
                          src="/ikon-closenew.png" alt="close" width={10} height={10}
                          className="cursor-pointer opacity-100 transition hover:opacity-80"
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      align="end"
                      sideOffset={6}
                      className={chatTooltipContentClass}
                    >
                      Tutup
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {showRiwayat && (
                <div
                  className="z-30 w-full shrink-0"
                  style={{
                    marginTop: "-1px",
                    background: "white",
                    boxShadow: "0 4px 12px rgba(140,0,0,0.10)",
                    border: "1px solid rgba(194,31,38,0.18)",
                    borderTop: "none",
                    borderRadius: "0 0 6px 6px",
                    animation: "slideInRiwayat 0.15s ease",
                  }}
                >
                  <div
                    className="py-2.5 text-center text-xs font-bold sm:py-2"
                    style={{ color: "#8C0000", borderBottom: "1px solid #eee" }}
                  >
                    Riwayat Chat
                  </div>

                  <div className="flex flex-col pb-1">
                    {riwayatList.length === 0 ? (
                      <p className="py-4 text-center text-xs text-gray-400">Belum ada riwayat chat.</p>
                    ) : (
                      riwayatList.map((item) => (
                        <RiwayatItem
                          key={item.id}
                          item={item}
                          onHapus={handleHapusRiwayat}
                          onLoad={handleLoadRiwayat}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              <div
                className="flex min-h-0 flex-1 flex-col pt-1 sm:pt-0 transition-all duration-200"
                style={{ filter: showRiwayat ? "blur(1.5px)" : "none" }}
              >
                <div ref={chatContainerRef} className="chat-scroll flex min-h-0 flex-1 flex-col space-y-2.5 sm:space-y-1.5 overflow-y-auto pr-1 pt-2 sm:pt-1">
                  {/* <div className="flex w-full shrink-0 items-center gap-2 text-[12px] font-semibold text-[#a11212]">
                    <Image src="/ikon-chtbot2.png" alt="bot" width={18} height={18} className="shrink-0 rounded-full border border-[#a11212]" />
                    <span>Sahabat Keuangan</span>
                  </div> */}
                  <div
                    className={cn(
                      chatBotBubbleBaseClass,
                      "w-full min-w-0 shrink-0 my-2"
                    )}
                  >
                    <p className="m-0">
                      <span className="font-bold">Hai Sobat OJK! 👋</span>
                      <br />
                      <br />
                      Kenalin, aku <span className="font-bold">ROJAK</span> (Robot Penjawab Kontak OJK) yang siap bantu kamu 😊
                      <br />
                      <br />
                      Mau cari info apa hari ini? Pilih aja layanan di bawah atau ketik langsung ya 👇
                    </p>
                  </div>

                  {messages.length === 0 && (
                    <div className="grid w-full shrink-0 grid-cols-2 items-stretch gap-1 sm:gap-1">
                      {QUICK_MENU.map((label, i) => (
                        <Button
                          key={i}
                          type="button"
                          onClick={() => handleSend(label)}
                          disabled={isLoading}
                          className="inline-flex h-full min-h-[2.9rem] w-full min-w-0 shrink items-center justify-center rounded border-0 bg-[#a11212] px-1.5 py-1.5 text-white whitespace-normal shadow-none hover:bg-[#8a0f0f] focus-visible:ring-[#a11212]/40 sm:min-h-10 sm:px-1 sm:py-1"
                        >
                          <span className="line-clamp-2 w-full max-w-full text-center text-[10px] font-semibold leading-tight wrap-anywhere">
                            {label}
                          </span>
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="w-full shrink-0 space-y-2.5 sm:space-y-1.5">
                    {messages.map((msg, i) => {
                      const presentation = getMessagePresentation(msg)
                      const isUser = msg.sender === "user"
                      const suppressSources =
                        !isUser && isLoading && i === messages.length - 1
                      const showSources =
                        !isUser && presentation.sources.length > 0 && !suppressSources
                      const isActiveQuestion =
                        !isUser && Boolean(msg.question) && pendingQuestion?.id === msg.question?.id

                      if (!isUser && !presentation.text.trim() && !showSources && !msg.question) {
                        return null
                      }

                      return (
                        <AIMessage
                          key={i}
                          from={isUser ? "user" : "assistant"}
                          className={cn("max-w-full gap-1", isUser ? "items-end" : "items-start")}
                        >
                          {presentation.text.trim() && (
                            <div
                              className={isUser ? chatUserBubbleClass : chatBotBubbleClass}
                            >
                            {isUser ? (
                              <span className="wrap-break-word whitespace-pre-wrap">{presentation.text}</span>
                            ) : (
                              <MessageResponse parseIncompleteMarkdown className="bot-markdown wrap-break-word">
                                {presentation.text}
                              </MessageResponse>
                            )}
                            </div>
                          )}

                          {showSources && (
                            <Sources className="mb-0 ml-0 mt-0.5 max-w-[min(100%,20rem)] text-[12px] font-normal text-[#a11212] sm:max-w-[min(100%,18rem)]">
                              <SourcesTrigger
                                count={presentation.sources.length}
                                className="rounded border border-[#a11212]/35 bg-white px-2 py-1 text-[12px] text-[#a11212] hover:bg-red-50"
                              >
                                <span>Referensi ({presentation.sources.length})</span>
                                <span className="text-[12px] leading-none">⌄</span>
                              </SourcesTrigger>
                              <SourcesContent className="mt-1 w-full max-w-full gap-1 rounded border border-[#a11212]/25 bg-white p-2 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
                                {presentation.sources.map((source, sourceIndex) => (
                                  <Source
                                    key={`${source.title}-${sourceIndex}`}
                                    href={source.href}
                                    title={source.title}
                                    className="text-[12px] font-normal leading-snug text-gray-800 [&_span]:text-[12px] [&_span]:font-normal"
                                  />
                                ))}
                              </SourcesContent>
                            </Sources>
                          )}

                          {msg.question && (
                            <FollowUpQuestion
                              question={msg.question}
                              selectedChoice={isActiveQuestion ? questionChoice : msg.selectedQuestionChoice || null}
                              customAnswer={isActiveQuestion ? customQuestionAnswer : msg.selectedQuestionCustomAnswer || ""}
                              isLoading={!isActiveQuestion || isLoading}
                              textareaRef={questionTextareaRef}
                              onSelect={setQuestionChoice}
                              onCustomAnswerChange={handleCustomQuestionAnswerChange}
                              onSubmit={handleQuestionSubmit}
                            />
                          )}
                        </AIMessage>
                      )
                    })}

                    {showReasoningWhileLoading && tasks.length === 0 && (
                      <AIMessage from="assistant" className="max-w-full gap-1">
                        <div className={chatBotBubbleClass}>
                          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#a11212]">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#a11212] dot-1" />
                            <span>Sedang berpikir...</span>
                          </div>
                        </div>
                      </AIMessage>
                    )}
                    {showReasoningWhileLoading && tasks.length > 0 && (
                      <AIMessage from="assistant" className="max-w-full gap-1">
                        <div className={chatBotBubbleClass}>
                          <Task defaultOpen>
                            <TaskTrigger title={tasks.at(-1)?.title || "Sedang berpikir"} className="w-full">
                              <div className="flex w-full cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-[#a11212]">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#a11212] dot-1" />
                                <span className="min-w-0 flex-1">{tasks.at(-1)?.title || "Sedang berpikir"}...</span>
                                <span className="text-[10px] leading-none">⌄</span>
                              </div>
                            </TaskTrigger>
                            <TaskContent className="chat-task-content">
                              {tasks.map((task) => (
                                <TaskItem
                                  key={task.title}
                                  className={cn(
                                    "text-[11px] font-semibold leading-snug",
                                    task.status === "error" ? "text-[#a11212]" : task.status === "done" ? "text-gray-600" : "text-[#a11212]"
                                  )}
                                >
                                  {task.detail ? `${task.title} ${task.detail}...` : `${task.title}...`}
                                </TaskItem>
                              ))}
                            </TaskContent>
                          </Task>
                        </div>
                      </AIMessage>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>

                <div className="mt-auto flex shrink-0 items-end gap-1.5 pt-2 sm:gap-1 sm:pt-1">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault(); handleSend()
                        if (textareaRef.current) textareaRef.current.style.height = "auto"
                      }
                    }}
                    placeholder="Apa yang bisa saya bantu?..."
                    disabled={isLoading}
                    rows={1}
                    className="min-h-9 max-h-24 flex-1 resize-none overflow-hidden rounded border-[#a11212] bg-white px-2.5 py-2 text-[13px] leading-snug text-black shadow-none placeholder:text-[#a11212]/60 focus-visible:ring-[#a11212]/30 disabled:opacity-60 sm:min-h-8 sm:max-h-20 sm:px-2 sm:py-1.5 md:text-[13px]"
                  />

                  <div className="relative flex items-end gap-1">
                    {showScrollBtn && (
                      <Image src="/ikon-autoscroll.png" alt="auto scroll" width={30} height={30} quality={100}
                        onClick={handleAutoScroll}
                        className="absolute right-0 bottom-full mb-0 translate-y-0.5 cursor-pointer object-contain drop-shadow-md transition-all duration-200 hover:scale-110"
                      />
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={() => handleSend()}
                          disabled={isLoading}
                          className="h-9 min-w-0 shrink-0 rounded border-0 bg-[#a11212] px-3.5 text-[13px] font-semibold text-white shadow-none hover:bg-[#8a0f0f] focus-visible:ring-[#a11212]/40 sm:h-8 sm:px-3"
                        >
                          Kirim
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" sideOffset={6} className={chatTooltipContentClass}>
                        Kirim Pesan
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={handleCopy}
                          disabled={isSummaryCopyLoading}
                          aria-busy={isSummaryCopyLoading}
                          className="h-9 w-9 min-w-9 shrink-0 rounded border-0 bg-[#a11212] p-0 text-white shadow-none hover:opacity-80 focus-visible:ring-[#a11212]/40 disabled:opacity-70 sm:h-8 sm:w-8 sm:min-w-8"
                        >
                          {copySuccess ? (
                            <span className="text-xs font-bold">✓</span>
                          ) : isSummaryCopyLoading ? (
                            <Loader2 className="size-[15px] animate-spin sm:size-3.5" aria-hidden />
                          ) : (
                            <Image src="/ikon-salin.png" alt="salin" width={15} height={15} quality={100} />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="end" sideOffset={6} className={chatTooltipContentClass}>
                        {isSummaryCopyLoading ? "Menyusun ringkasan…" : "Salin Ringkasan"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </>
  )
}
