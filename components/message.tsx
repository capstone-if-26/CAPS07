"use client";

import { useState } from "react";
import { submitFeedback } from "@/lib/api/chat";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { markdownComponents } from "./react-markdown";
import remarkGfm from "remark-gfm";

export type FlowStep = {
  id: string;
  question: string;
  options: { label: string; value: string }[];
  next: Record<string, string>;
};

export type FlowResult = {
  answer: string;
  actions?: { label: string; url: string }[];
};

export type UIMessage = {
  text: string;
  sender: "user" | "bot";
  messageId?: string;
  flow?: {
    step?: FlowStep;
    result?: FlowResult;
  };
};

type MessageProps = {
  msg: UIMessage;
  index: number;
  onFlowOption: (
    stepId: string,
    optionValue: string,
    optionLabel: string,
  ) => void;
};

// Feedback icons
function BotFeedback({
  text,
  messageId,
}: {
  text: string;
  messageId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [likeFlash, setLikeFlash] = useState(false);
  const [dislikeFlash, setDislikeFlash] = useState(false);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleLike = async () => {
    console.log("messageId:", messageId);
    if (likeFlash) return;
    setLikeFlash(true);
    setTimeout(() => setLikeFlash(false), 500);
    if (!messageId) return;
    const newVal = feedback === "like" ? "none" : "like";
    setFeedback(newVal === "none" ? null : "like");
    try {
      await submitFeedback(messageId, newVal);
    } catch {
      setFeedback(feedback);
    }
  };

  const handleDislike = async () => {
    if (dislikeFlash) return;
    setDislikeFlash(true);
    setTimeout(() => setDislikeFlash(false), 500);
    if (!messageId) return;
    const newVal = feedback === "dislike" ? "none" : "dislike";
    setFeedback(newVal === "none" ? null : "dislike");
    try {
      await submitFeedback(messageId, newVal);
    } catch {
      setFeedback(feedback);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-1 pl-0.5">
      <button
        onClick={handleCopy}
        title={copied ? "Disalin!" : "Salin pesan"}
        className="flex items-center justify-center hover:opacity-60 transition"
      >
        {copied ? (
          <span style={{ color: "#999", fontSize: "11px", fontWeight: 700 }}>
            ✓
          </span>
        ) : (
          <Image
            src="/ikon-feedback-copy.png"
            alt="copy"
            width={14}
            height={14}
            quality={100}
          />
        )}
      </button>

      <button
        onClick={handleLike}
        title="Respons bagus"
        className="flex items-center justify-center transition"
      >
        <Image
          src="/ikon-feedback-like.png"
          alt="like"
          width={14}
          height={14}
          quality={100}
          style={{
            filter: likeFlash || feedback === "like" ? "none" : "grayscale(0)",
            opacity: feedback === "dislike" ? 0.4 : 1,
            transition: "filter 0.1s ease",
          }}
        />
      </button>

      <button
        onClick={handleDislike}
        title="Respons kurang tepat"
        className="flex items-center justify-center transition"
      >
        <Image
          src="/ikon-feedback-dislike.png"
          alt="dislike"
          width={14}
          height={14}
          quality={100}
          style={{
            filter:
              dislikeFlash || feedback === "dislike" ? "none" : "grayscale(0)",
            opacity: feedback === "like" ? 0.4 : 1,
            transition: "filter 0.1s ease",
          }}
        />
      </button>
    </div>
  );
}

// Komponen utama
export default function Message({ msg, index, onFlowOption }: MessageProps) {
  const isBot = msg.sender === "bot";

  return (
    <div className="max-w-[85%] mx-auto flex flex-col">
      {/* Bubble pesan */}
      {(msg.text || msg.flow?.step) && (
        <div
          className={`inline-block p-1.5 rounded-md text-[11px] leading-tight font-semibold max-w-full break-words ${
            isBot
              ? "bg-[#f3f3f3] text-black self-start border border-[#a11212]"
              : "bg-[#a11212] text-white self-end border border-[#a11212]"
          }`}
        >
          {msg.text &&
            (isBot ? (
              <div className="break-words font-normal leading-snug prose-none">
                <ReactMarkdown
                  components={markdownComponents}
                  remarkPlugins={[remarkGfm]}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            ) : (
              <span className="break-words whitespace-pre-wrap block">
                {msg.text}
              </span>
            ))}

          {/* Radio button pilihan di dalam bubble bot */}
          {msg.flow?.step && isBot && (
            <div className="mt-0.5 space-y-1">
              {msg.flow.step.question && (
                <p className="text-[11px] font-semibold text-black mb-1">
                  {msg.flow.step.question}
                </p>
              )}
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

      {/* Feedback — hanya di bawah pesan bot yang sudah ada teks */}
      {isBot && msg.text && (
        <BotFeedback text={msg.text} messageId={msg.messageId} />
      )}
    </div>
  );
}
