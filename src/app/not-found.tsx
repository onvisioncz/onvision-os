import Link from "next/link";

/** Branded 404 — místo defaultní strohé stránky. */
export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0B0B14", fontFamily: "var(--font-jakarta), system-ui, sans-serif", padding: 24,
    }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <p style={{
          fontSize: 64, fontWeight: 700, margin: 0, lineHeight: 1,
          color: "#5B5EFF", fontFamily: "var(--font-outfit), sans-serif", letterSpacing: "-0.04em",
        }}>404</p>
        <h1 style={{ color: "#F4F4F8", fontSize: 18, fontWeight: 700, margin: "14px 0 8px", fontFamily: "var(--font-outfit), sans-serif" }}>
          Tahle stránka neexistuje
        </h1>
        <p style={{ color: "#A7A9C4", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
          Buď je odkaz starý, nebo se stránka přestěhovala.
        </p>
        <Link href="/dashboard" style={{
          display: "inline-block", background: "#5B5EFF", color: "#fff", borderRadius: 10,
          padding: "10px 22px", fontSize: 14, fontWeight: 600, textDecoration: "none",
        }}>
          Zpět na Dashboard
        </Link>
      </div>
    </div>
  );
}
