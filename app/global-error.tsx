"use client";

import { useEffect } from "react";
import { clientLogger } from "@/lib/client-logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    clientLogger.error("global.unhandled_error", {
      errorMessage: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html>
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "sans-serif",
          gap: "1rem",
        }}
      >
        <h2>Terjadi kesalahan yang tidak terduga</h2>
        <p style={{ color: "#666" }}>
          Tim kami telah menerima laporan dan sedang menangani masalah ini.
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: "0.5rem 1.5rem",
            background: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Coba lagi
        </button>
      </body>
    </html>
  );
}
