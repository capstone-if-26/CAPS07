const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

export interface Message {
  id?: string
  content: string
  senderType: "user" | "assistant"
  metadata?: string | null
}

export type ChatSource = { href: string; title: string }
export type ChatQuestionOption = { id: string; label: string }
export type ChatQuestion = {
  id: string
  question: string
  options: ChatQuestionOption[]
  customOptionLabel: string
}
export type ChatTaskStatus = "running" | "done" | "error"
export type ChatTaskEvent = {
  status: ChatTaskStatus
  title: string
  detail?: string
}

type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "source"; source: ChatSource }
  | { type: "question"; question: ChatQuestion }
  | ({ type: "task" } & ChatTaskEvent)

export interface StreamChatParams {
  question: string
  chatId?: string | null
  onToken: (chunk: string) => void
  onChatId?: (chatId: string) => void
  onTask?: (task: ChatTaskEvent) => void
  onSource?: (source: ChatSource) => void
  onQuestion?: (question: ChatQuestion) => void
}

export interface StreamChatResult {
  chatId: string
}

export interface ChatHistoryResponse {
  status: boolean
  message: string
  data: {
    chatId: string
    messages: Message[]
  }
}

export interface IntentSummaryResponse {
  status: boolean
  message: string
  data: {
    chatId: string
    intent: string
    summary: string
  }
}

/** Client-side transcript for summary; includes messages that may not be persisted yet. */
export type IntentSummaryMessageSnapshot = {
  role: "user" | "assistant"
  content: string
}

async function parseErrorMessage(res: Response): Promise<string> {
  const fallback = `Permintaan chat gagal: ${res.status} ${res.statusText}`

  let raw = ""
  try {
    raw = await res.text()
  } catch {
    return fallback
  }

  if (!raw) return fallback

  try {
    const payload = JSON.parse(raw)
    if (payload?.message) {
      return String(payload.message)
    }
  } catch {
    // ignore JSON parse error
  }

  return raw
}

async function consumeTextStream(res: Response, onToken: (chunk: string) => void): Promise<void> {
  const reader = res.body?.getReader()
  if (!reader) {
    throw new Error("Response stream tidak tersedia")
  }

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    if (chunk) {
      onToken(chunk)
    }
  }

  const trailing = decoder.decode()
  if (trailing) {
    onToken(trailing)
  }
}

function dispatchStreamEvent(
  rawEvent: string,
  handlers: Pick<StreamChatParams, "onToken" | "onTask" | "onSource" | "onQuestion">
) {
  const data = rawEvent
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")

  if (!data) return

  let event: ChatStreamEvent
  try {
    event = JSON.parse(data)
  } catch {
    handlers.onToken(data)
    return
  }

  if (event.type === "text") {
    handlers.onToken(event.text)
    return
  }

  if (event.type === "task") {
    handlers.onTask?.({
      status: event.status,
      title: event.title,
      detail: event.detail,
    })
    return
  }

  if (event.type === "source") {
    handlers.onSource?.(event.source)
    return
  }

  if (event.type === "question") {
    handlers.onQuestion?.(event.question)
  }
}

async function consumeEventStream(
  res: Response,
  handlers: Pick<StreamChatParams, "onToken" | "onTask" | "onSource" | "onQuestion">
): Promise<void> {
  const reader = res.body?.getReader()
  if (!reader) {
    throw new Error("Response stream tidak tersedia")
  }

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() || ""

    for (const event of events) {
      dispatchStreamEvent(event, handlers)
    }
  }

  buffer += decoder.decode()
  if (buffer.trim()) {
    dispatchStreamEvent(buffer, handlers)
  }
}

export async function streamChatReply({ question, chatId, onToken, onChatId, onTask, onSource, onQuestion }: StreamChatParams): Promise<StreamChatResult> {
  const endpoint = chatId ? `/api/chats/${chatId}/messages` : "/api/chats"

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  })

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res))
  }

  const resolvedChatId = res.headers.get("x-chat-id") || chatId || ""
  if (!resolvedChatId) {
    throw new Error("Chat ID tidak ditemukan pada respons stream")
  }

  onChatId?.(resolvedChatId)

  if (res.headers.get("content-type")?.includes("text/event-stream")) {
    await consumeEventStream(res, { onToken, onTask, onSource, onQuestion })
  } else {
    await consumeTextStream(res, onToken)
  }

  return { chatId: resolvedChatId }
}

// Ambil history chat (saat refresh halaman)
export async function getChatHistory(chatId: string): Promise<ChatHistoryResponse> {
  const res = await fetch(`${BASE_URL}/api/chats/${chatId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    throw new Error(`Gagal mengambil history: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

export async function getIntentSummary(
  chatId: string,
  messagesSnapshot?: IntentSummaryMessageSnapshot[]
): Promise<IntentSummaryResponse> {
  const res = await fetch(`${BASE_URL}/api/chats/${chatId}/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body:
      messagesSnapshot && messagesSnapshot.length > 0
        ? JSON.stringify({ messages: messagesSnapshot })
        : undefined,
  })

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res))
  }

  return res.json()
}

// Simpan & ambil chatId dari localStorage
export const CHAT_ID_KEY = "ojk_chat_id"

export function saveChatId(chatId: string): void {
  localStorage.setItem(CHAT_ID_KEY, chatId)
}

export function getSavedChatId(): string | null {
  return localStorage.getItem(CHAT_ID_KEY)
}

export function clearChatId(): void {
  localStorage.removeItem(CHAT_ID_KEY)
}
