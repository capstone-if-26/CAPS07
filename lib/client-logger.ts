"use client";

type ClientLogLevel = "warn" | "error";

interface ClientLogPayload {
  level: ClientLogLevel;
  message: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
]);

function sanitizeMeta(
  meta: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(meta).filter(
      ([k]) => !SENSITIVE_KEYS.has(k.toLowerCase()),
    ),
  );
}

function send(payload: ClientLogPayload): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/log",
      new Blob([body], { type: "application/json" }),
    );
  } else {
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

export const clientLogger = {
  warn(message: string, meta?: Record<string, unknown>): void {
    send({
      level: "warn",
      message,
      meta: meta ? sanitizeMeta(meta) : undefined,
      timestamp: new Date().toISOString(),
    });
  },

  error(message: string, meta?: Record<string, unknown>): void {
    send({
      level: "error",
      message,
      meta: meta ? sanitizeMeta(meta) : undefined,
      timestamp: new Date().toISOString(),
    });
  },
};
