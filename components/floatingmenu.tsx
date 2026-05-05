"use client"
import { useState } from "react"
import Image from "next/image"
import ChatbotWidget from "@/components/chatbotwidget"

export default function FloatingMenu() {
  const [openChat, setOpenChat] = useState(false)

  return (
    <>
      {/* Floating Button */}
      <div className="fixed right-4 bottom-4 flex flex-col gap-3 z-50">
        <div
          onClick={() => setOpenChat(!openChat)}
          className="w-10 h-10 rounded-full bg-[#a11212] flex items-center justify-center cursor-pointer shadow-md"
        >
          <Image src="/avatar-botnew.png" alt="chatbot" width={39} height={39} />
        </div>
        <Image src="/ikon-wanew.png" alt="wa" width={39} height={39} />
        <Image src="/ikon-idnew.png" alt="id" width={39} height={39} />
        <Image src="/ikon-orangnew.png" alt="user" width={39} height={39} />
      </div>

      {/* Chat Window */}
      {openChat && (
        <div className="fixed inset-0 z-50 sm:bg-transparent sm:block sm:pointer-events-none flex flex-col">
          <ChatbotWidget onClose={() => setOpenChat(false)} />
        </div>
      )}
    </>
  )
}