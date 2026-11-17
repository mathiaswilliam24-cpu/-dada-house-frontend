"use client";
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Loader2, Eraser } from "lucide-react";

/**
 * Full-width customer signature capture: name, the exact statement being agreed to,
 * and a signing area. `statement` may contain "{name}" or "[customer name]", which is
 * replaced live with the typed name.
 */
export default function SignatureStep({
  title, statement, defaultName = "", submitLabel, onSubmit, children,
}: {
  title: string;
  statement: string;
  defaultName?: string;
  submitLabel: string;
  onSubmit: (signerName: string, signature: string) => Promise<void>;
  children?: React.ReactNode;
}) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const shown = statement.replace(/\{name\}|\[customer name\]/g, name.trim() || "________");

  async function submit() {
    setError("");
    if (!name.trim()) return setError("Please enter the customer's full name.");
    if (!sigRef.current || sigRef.current.isEmpty()) return setError("Please sign in the box.");
    setBusy(true);
    try {
      await onSubmit(name.trim(), sigRef.current.getCanvas().toDataURL("image/png"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {children}
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Customer full name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-[#1B3FA8]"
          autoComplete="off"
        />
      </div>
      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-200 rounded-xl p-3">{shown}</p>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Customer signature</span>
          <button type="button" onClick={() => sigRef.current?.clear()} className="flex items-center gap-1 text-xs font-semibold text-gray-500">
            <Eraser className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
          <SignatureCanvas ref={sigRef} penColor="#111827" canvasProps={{ className: "w-full h-48 touch-none" }} />
        </div>
        <p className="text-[11px] text-gray-400 mt-1">Sign with your finger. Signed electronically — {new Date().toLocaleString("en-US")}</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="w-full py-3.5 flex items-center justify-center gap-2 bg-[#1B3FA8] text-white rounded-2xl font-bold disabled:opacity-60"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} {submitLabel}
      </button>
    </div>
  );
}
