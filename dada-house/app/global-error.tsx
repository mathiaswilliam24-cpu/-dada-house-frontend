"use client";
import { useEffect } from "react";

// Last-resort boundary: catches errors thrown in the root layout itself
// (outside any route group's own error.tsx). Without this, that class of
// crash renders a fully blank white page with zero recovery path.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F9FAFB" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", gap: 16 }}>
          <p style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>Something went wrong</p>
          <p style={{ fontSize: 14, color: "#6B7280", maxWidth: 320 }}>DADA HOUSE hit an unexpected error. Your data is safe — try reloading.</p>
          <button
            onClick={() => reset()}
            style={{ padding: "10px 20px", background: "#1B3FA8", color: "white", borderRadius: 12, fontSize: 14, fontWeight: 600, border: "none" }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
