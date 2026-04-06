"use client";

import { useEffect } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * global-error.tsx catches errors thrown in the root layout.
 * It replaces the entire document, so it must include <html> and <body>.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      console.error("[GlobalError]", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "#0a0a0a",
          color: "#fafafa",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          {/* Icon */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 80,
              width: 80,
              borderRadius: "50%",
              backgroundColor: "rgba(239,68,68,0.12)",
              marginBottom: 24,
            }}
          >
            <AlertOctagon
              style={{ height: 40, width: 40, color: "#ef4444" }}
            />
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            Application error
          </h1>
          <p
            style={{
              color: "#a1a1aa",
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            A critical error has occurred and the application cannot continue.
            Please refresh the page to try again.
          </p>

          {/* Error detail in dev */}
          {process.env.NODE_ENV !== "production" && error?.message && (
            <div
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#ef4444",
                  marginBottom: 6,
                }}
              >
                Error
              </p>
              <code
                style={{
                  fontSize: 12,
                  color: "rgba(239,68,68,0.8)",
                  wordBreak: "break-all",
                }}
              >
                {error.message}
              </code>
            </div>
          )}

          {/* Action */}
          <button
            type="button"
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw style={{ height: 16, width: 16 }} />
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}
