"use client"
import { type FlowStep, type FlowResult } from "@/lib/chatflow"

export type UIMessage = {
  text: string
  sender: "user" | "bot"
  flow?: {
    step?: FlowStep
    result?: FlowResult
  }
}

type MessageProps = {
  msg: UIMessage
  index: number
  onFlowOption: (stepId: string, optionValue: string, optionLabel: string) => void
}

export default function Message({ msg, index, onFlowOption }: MessageProps) {
  return (
  <div className="max-w-[85%] mx-auto flex flex-col">

    {/* bubble for text */}
    {msg.text && (
      <div
        className={`inline-block p-1.5 rounded-md text-[11px] leading-tight font-semibold max-w-full break-words ${
          msg.sender === "user"
            ? "bg-[#a11212] text-white self-end border border-[#a11212]"
            : "bg-[#f3f3f3] text-black self-start border border-[#a11212]"
        }`}
      >
        <span className="break-words whitespace-pre-wrap block">
          {msg.text}
        </span>

        {/* radio tetep di bubble */}
        {msg.flow?.step && msg.sender === "bot" && (
          <div className="mt-2 space-y-1">
            {msg.flow.step.options.map((opt, oi) => (
              <label
                key={oi}
                className="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-gray-200/50 rounded px-0.5 transition group"
              >
                <input
                  type="radio"
                  name={`flow-${index}`}
                  value={opt.value}
                  className="accent-[#a11212] cursor-pointer flex-shrink-0 w-3 h-3"
                  onChange={() =>
                    onFlowOption(msg.flow!.step!.id, opt.value, opt.label)
                  }
                />
                <span className="text-[11px] font-medium text-black group-hover:text-[#a11212] transition leading-tight">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    )}

    {/* tombol di luar bubble */}
    {msg.flow?.result?.actions && (
  <div className="grid grid-cols-2 gap-1 mt-1 w-full">
    {msg.flow.result.actions.map((action, ai) => (
      <a
        key={ai}
        href={action.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] font-semibold px-1.5 py-[4px] rounded w-full text-center text-white hover:opacity-80 transition"
        style={{ background: "#a11212" }}
      >
        {action.label}
      </a>
    ))}
  </div>
)}

  </div>
)
}