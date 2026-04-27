const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

export interface Message {
  id?: string
  content: string
  senderType: "user" | "assistant"
}

export interface StreamChatParams {
  question: string
  chatId?: string | null
  onToken: (chunk: string) => void
  onChatId?: (chatId: string) => void
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

export async function streamChatReply({ question, chatId, onToken, onChatId }: StreamChatParams): Promise<StreamChatResult> {
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

  await consumeTextStream(res, onToken)

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

export async function getIntentSummary(chatId: string): Promise<IntentSummaryResponse> {
  const res = await fetch(`${BASE_URL}/api/chats/${chatId}/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
