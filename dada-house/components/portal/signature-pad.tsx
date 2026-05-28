"use client";
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { buttonVariants } from "@/components/ui/button";

export default function SignaturePad({ invoiceId }: { invoiceId: string }) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError("Please sign before submitting");
      return;
    }
    setSaving(true);
    setError(null);
    const signatureUrl = sigRef.current.toDataURL("image/png");

    const res = await fetch(`/api/portal/invoices/${invoiceId}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureUrl }),
    });

    if (res.ok) {
      setSaved(true);
    } else {
      setError("Failed to save signature");
    }
    setSaving(false);
  }

  if (saved) {
    return <p className="text-green-600 font-medium">✓ Signature saved</p>;
  }

  return (
    <div className="space-y-3">
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
        <SignatureCanvas
          ref={sigRef}
          penColor="#1B3FA8"
          canvasProps={{ className: "w-full h-32 touch-none" }}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className={buttonVariants({ variant: "default" })}>
          {saving ? "Saving…" : "Submit Signature"}
        </button>
        <button onClick={() => sigRef.current?.clear()} className={buttonVariants({ variant: "outline" })}>
          Clear
        </button>
      </div>
    </div>
  );
}
