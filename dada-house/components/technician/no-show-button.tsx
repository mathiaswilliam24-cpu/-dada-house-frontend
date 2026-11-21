"use client";
import { useState } from "react";
import { Camera, Loader2, UserX, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing-components";

type Result = { sms: string; smsError: string | null; email: string; emailError: string | null };

const STATUS_TEXT: Record<string, string> = {
  sent: "sent", skipped: "not sent (no phone/email on file or message turned off)", "opted-out": "not sent (customer replied STOP)", failed: "FAILED",
};

/** "No one on site": photos as proof of the visit → customer gets a text + an email with the photos. */
export default function NoShowButton({ jobId, onDone, className }: { jobId: string; onDone?: () => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const { startUpload, isUploading } = useUploadThing("jobPhotos");

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    try {
      const up = await startUpload(Array.from(files).slice(0, 10 - photos.length));
      setPhotos((p) => [...p, ...(up ?? []).map((f) => (f.serverData as { url?: string })?.url ?? f.ufsUrl)].slice(0, 10));
    } catch (e) { setError((e as Error).message || "Upload failed"); }
  }

  async function confirm() {
    setBusy(true); setError(null);
    const r = await fetch(`/api/technician/jobs/${jobId}/no-show`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrls: photos, note: note.trim() || undefined }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(d.error ?? "Could not send"); return; }
    setResult(d);
    onDone?.();
  }

  function close() { setOpen(false); setPhotos([]); setNote(""); setError(null); setResult(null); }

  return (
    <>
      <button onClick={() => setOpen(true)} className={className ?? "w-full py-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl font-bold flex items-center justify-center gap-2"}>
        <UserX className="w-5 h-5" /> No one on site
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={busy ? undefined : close}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2"><UserX className="w-5 h-5 text-amber-600" /> No one on site</h2>
              <button onClick={close} disabled={busy} className="p-1"><X className="w-5 h-5" /></button>
            </div>

            {result ? (
              <div className="space-y-2">
                <p className="flex items-center gap-2 font-semibold text-green-700"><CheckCircle2 className="w-5 h-5" /> Visit recorded — job marked “Reschedule”.</p>
                <p className={`text-sm ${result.sms === "failed" ? "text-red-600" : "text-gray-700"}`}>Text message: {STATUS_TEXT[result.sms] ?? result.sms}{result.smsError ? ` — ${result.smsError}` : ""}</p>
                <p className={`text-sm ${result.email === "failed" ? "text-red-600" : "text-gray-700"}`}>Email: {STATUS_TEXT[result.email] ?? result.email}{result.emailError ? ` — ${result.emailError}` : ""}</p>
                {(result.sms !== "sent" || result.email !== "sent") && (
                  <p className="text-xs text-gray-500">Let dispatch know so they can reach the customer another way.</p>
                )}
                <button onClick={close} className="w-full py-3 bg-[#1B3FA8] text-white rounded-xl font-bold">Done</button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">Take photos that prove you were there (front door, house number, your van in front). The customer receives a text and an email with these photos asking them to call DADA HOUSE to reschedule.</p>

                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((u, i) => (
                      <div key={u} className="relative">
                        <img src={u} alt="" className="w-full h-24 object-cover rounded-lg" />
                        <button onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} disabled={busy}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <label className={`flex items-center justify-center gap-2 py-4 rounded-xl font-bold ${photos.length ? "bg-gray-100 text-gray-800" : "bg-amber-500 text-white"} ${isUploading || busy || photos.length >= 10 ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}>
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  {isUploading ? "Uploading…" : photos.length ? "Add another photo" : "Take photo"}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
                </label>

                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} disabled={busy}
                  placeholder="Optional note for the customer (e.g. knocked and called twice)"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none" />

                {error && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {error}</p>}

                <button onClick={confirm} disabled={!photos.length || busy || isUploading}
                  className="w-full py-3.5 bg-[#1B3FA8] text-white rounded-xl font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {busy ? "Sending…" : `Confirm & notify customer (${photos.length} photo${photos.length !== 1 ? "s" : ""})`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
