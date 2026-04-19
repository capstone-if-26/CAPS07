
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

export interface Message {
  id?: string
  content: string
  senderType: "user" | "assistant"
}

export interface StartChatResponse {
  status: boolean
  message: string
  data: {
    chatId: string
    answer: string
    matches: any[]
  }
}

export interface ContinueChatResponse {
  status: boolean
  message: string
  data: {
    chatId: string
    answer: string
    matches: any[]
  }
}

export interface ChatHistoryResponse {
  status: boolean
  message: string
  data: {
    chatId: string
    messages: Message[]
  }
}

// Mulai obrolan BARU (belum ada chatId)
export async function startNewChat(question: string): Promise<StartChatResponse> {
  const res = await fetch(`${BASE_URL}/api/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  })

  if (!res.ok) {
    throw new Error(`Gagal memulai chat: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

// Lanjutkan obrolan yang sudah ada (ada chatId)
export async function continueChat(
  chatId: string,
  question: string
): Promise<ContinueChatResponse> {
  const res = await fetch(`${BASE_URL}/api/chats/${chatId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  })

  if (!res.ok) {
    throw new Error(`Gagal melanjutkan chat: ${res.status} ${res.statusText}`)
  }

  return res.json()
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