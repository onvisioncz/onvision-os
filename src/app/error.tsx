"use client";

/**
 * Globální error boundary — místo bílé obrazovky smrti dá uživateli
 * srozumitelnou hlášku a tlačítko Zkusit znovu. Chyba se loguje do konzole.
 */
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[OnVision OS error boundary]", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0B0B14", fontFamily: "var(--font-jakarta), system-ui, sans-serif", padding: 24,
    }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, margin: "0 auto 18px",
          background: "rgba(91,94,255,0.12)", border: "1px solid rgba(91,94,255,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
        }}>⚡</div>
        <h1 style={{ color: "#F4F4F8", fontSize: 20, fontWeight: 700, margin: "0 0 8px", fontFamily: "var(--font-outfit), sans-serif" }}>
          Něco se pokazilo
        </h1>
        <p style={{ color: "#A7A9C4", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
          Tahle část se nenačetla. Data jsou v bezpečí, zkus to znovu.
          Kdyby to nepomohlo, obnov stránku (Cmd+R).
        </p>
        <button onClick={reset} style={{
          background: "#5B5EFF", color: "#fff", border: "none", borderRadius: 10,
          padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          Zkusit znovu
        </button>
        {error.digest && (
          <p style={{ color: "#6C6E88", fontSize: 11, marginTop: 16 }}>Kód chyby: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
