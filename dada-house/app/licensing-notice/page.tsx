import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DADA HOUSE — Licensing in progress",
  robots: { index: false, follow: false },
};

/** Shown in place of the whole public site while SITE_LOCKED=1 (see proxy.ts). */
export default function LicensingNoticePage() {
  return (
    <main style={{ minHeight: "100vh", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center", fontFamily: "Arial, Helvetica, sans-serif", color: "#111827" }}>
      <div style={{ maxWidth: 560 }}>
        <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, margin: "0 0 28px" }}>DADA HOUSE</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 12px" }}>En procédure d&apos;obtention de licence</h1>
        <p style={{ fontSize: 17, color: "#4b5563", margin: "0 0 6px" }}>Licensing in progress</p>
        <p style={{ fontSize: 17, color: "#4b5563", margin: 0 }}>En proceso de obtención de licencia</p>
      </div>
    </main>
  );
}
