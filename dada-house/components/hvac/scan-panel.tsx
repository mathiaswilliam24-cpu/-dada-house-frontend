"use client";
import { useState } from "react";
import { Camera, Images, Loader2, X, ScanLine, AlertTriangle, CheckCircle2, ChevronLeft } from "lucide-react";
import { INSTRUMENTS, INSTRUMENT_IDS, type InstrumentId } from "@/lib/hvac/instruments";
import { FIELD_BY_KEY } from "@/lib/hvac/catalog";
import { useUploadThing } from "@/lib/uploadthing-components";

type Proposal = {
  target: "equipment" | "measurement"; key: string; label: string; circuit: number;
  value: number | null; text: string | null; display: string; read: string; image: number;
  confidence: "high" | "medium" | "low"; warning?: string;
  frames?: number; range?: [number, number]; unstable?: boolean;
};
type Scan = { id: string; proposals: Proposal[] | null; notes: string | null; imageUrls: string[]; checks?: { level: string; message: string }[] };
export type ScanPreset = { instrument: InstrumentId; option?: string; circuit?: number };

const MAX_SIDE = 1600;
const VIDEO_FRAMES = 6;

async function canvasToFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", 0.85));
  return new File([blob], name, { type: "image/jpeg" });
}
function sized(w: number, h: number) { const k = Math.min(1, MAX_SIDE / Math.max(w, h)); return [Math.round(w * k), Math.round(h * k)]; }

async function imageToJpeg(file: File, i: number): Promise<File> {
  const bmp = await createImageBitmap(file);
  const [w, h] = sized(bmp.width, bmp.height);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  return canvasToFile(c, `scan-${i}.jpg`);
}

/** Pulls evenly spaced frames from a video in the browser (nothing heavy is uploaded). */
async function videoToFrames(file: File): Promise<File[]> {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.src = url; v.muted = true; v.playsInline = true; v.preload = "auto";
  await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error("This video format can't be read here")); });
  const d = Number.isFinite(v.duration) ? v.duration : 0;
  const times = d > 1 ? Array.from({ length: VIDEO_FRAMES }, (_, i) => 0.3 + ((d - 0.6) * i) / (VIDEO_FRAMES - 1)) : [0];
  const [w, h] = sized(v.videoWidth, v.videoHeight);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const out: File[] = [];
  for (const [i, t] of times.entries()) {
    await new Promise<void>((res) => { v.onseeked = () => res(); v.currentTime = t; });
    c.getContext("2d")!.drawImage(v, 0, 0, w, h);
    out.push(await canvasToFile(c, `frame-${i}.jpg`));
  }
  URL.revokeObjectURL(url);
  return out;
}

export default function ScanPanel({ sessionId, dark, onApplied, onClose, circuits = 1, preset = null }: {
  sessionId: string; dark: boolean; onApplied: (session: unknown) => void; onClose: () => void;
  circuits?: number; preset?: ScanPreset | null;
}) {
  const [instrument, setInstrument] = useState<InstrumentId | null>(preset?.instrument ?? null);
  const [options, setOptions] = useState<string[]>(() => {
    if (!preset) return [];
    if (preset.option) return [preset.option];
    const ins = INSTRUMENTS[preset.instrument];
    return ins.pick === "all" ? ins.options.map((o) => o.id) : [];
  });
  const [circuit, setCircuit] = useState(preset?.circuit ?? 1);
  const ins = instrument ? INSTRUMENTS[instrument] : null;
  const needsChoice = !!ins && (ins.pick === "one" || ins.pick === "pair" || (ins.pick === "all" && ins.options.length > 1));
  const ready = !!ins && (!needsChoice || options.length > 0);
  const perCircuit = !!ins && ins.options.some((o) => options.includes(o.id) && o.keys.some((k) => FIELD_BY_KEY[k]?.perCircuit));
  const chooseInstrument = (id: InstrumentId) => {
    setInstrument(id);
    const x = INSTRUMENTS[id];
    setOptions(x.pick === "all" || (x.pick === "none" && x.options.length) ? x.options.map((o) => o.id) : []);
  };
  const [phase, setPhase] = useState<"pick" | "working" | "review">("pick");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [scan, setScan] = useState<Scan | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [edits, setEdits] = useState<Record<number, string>>({});
  const { startUpload } = useUploadThing("hvacScan");

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setErr(""); setPhase("working");
    try {
      const list = Array.from(files);
      const hasVideo = list.some((f) => f.type.startsWith("video/"));
      setStatus(hasVideo ? "Extracting frames from the video…" : "Preparing photos…");
      const frames: File[] = [];
      for (const [i, f] of list.entries()) {
        if (f.type.startsWith("video/")) frames.push(...(await videoToFrames(f)));
        else frames.push(await imageToJpeg(f, i));
      }
      const batch = frames.slice(0, 8);
      setStatus(`Uploading ${batch.length} image${batch.length > 1 ? "s" : ""}…`);
      const up = await startUpload(batch);
      const urls = (up ?? []).map((u) => (u.serverData as { url?: string } | undefined)?.url ?? u.ufsUrl).filter(Boolean) as string[];
      if (!urls.length) throw new Error("Upload failed");
      setStatus("AI is reading the images…");
      const r = await fetch(`/api/technician/hvac-diagnostic/${sessionId}/scan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", imageUrls: urls, kind: hasVideo ? "VIDEO_FRAMES" : "PHOTO", instrument: instrument ?? "AUTO", options, circuit: circuits > 1 ? circuit : null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Reading failed");
      const s = d.scan as Scan;
      setScan(s);
      setChecked(Object.fromEntries((s.proposals ?? []).map((p, i) => [i, p.confidence !== "low" && !p.warning && !p.unstable && (p.value != null || !!p.text)])));
      setPhase("review");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setPhase("pick");
    }
  }

  async function apply() {
    if (!scan) return;
    setPhase("working"); setStatus("Saving the verified values and running the analysis…");
    const accepted = (scan.proposals ?? []).map((p, i) => ({ p, i })).filter(({ i }) => checked[i]).map(({ p, i }) => {
      const e = edits[i];
      if (e === undefined) return { index: i };
      if (p.value != null || (p.target === "measurement" && !p.text)) {
        const n = Number(e.replace(",", "."));
        return { index: i, value: Number.isFinite(n) ? n : null };
      }
      return { index: i, text: e };
    });
    const r = await fetch(`/api/technician/hvac-diagnostic/${sessionId}/scan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "apply", scanId: scan.id, accepted }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(d.error ?? "Could not save"); setPhase("review"); return; }
    onApplied(d.session);
  }

  async function discard() {
    if (scan) await fetch(`/api/technician/hvac-diagnostic/${sessionId}/scan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "discard", scanId: scan.id }) });
    onClose();
  }

  const card = dark ? "bg-[#111a2e] text-gray-100" : "bg-white text-gray-900";
  const chip = dark ? "bg-[#1a2540]" : "bg-gray-100";
  const proposals = scan?.proposals ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className={`w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 ${card}`}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-black flex items-center gap-2"><ScanLine className="w-5 h-5 text-orange-500" /> Scan with AI</p>
          <button onClick={phase === "review" ? discard : onClose} className={`p-1.5 rounded-lg ${chip}`}><X className="w-4 h-4" /></button>
        </div>

        {phase === "pick" && !ins && (
          <div className="space-y-2">
            <p className="text-sm opacity-80">What are you photographing? Telling the AI which instrument it is — and what was measured — makes the reading much more reliable.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {INSTRUMENT_IDS.filter((x) => x !== "AUTO").map((x) => (
                <button key={x} onClick={() => chooseInstrument(x)} className={`py-3 px-2 rounded-xl text-sm font-bold text-left ${chip}`}>{INSTRUMENTS[x].label}</button>
              ))}
            </div>
            <button onClick={() => chooseInstrument("AUTO")} className={`w-full py-2.5 rounded-xl text-sm font-semibold ${chip}`}>Other / several things (auto-detect)</button>
          </div>
        )}

        {phase === "pick" && ins && (
          <div className="space-y-3">
            <button onClick={() => { setInstrument(null); setOptions([]); }} className="text-xs font-bold text-orange-500 flex items-center gap-1"><ChevronLeft className="w-3 h-3" /> {ins.label}</button>
            <p className="text-sm opacity-80">{ins.hint} The AI reads the values; <b>you verify them</b> before anything is saved, then the analysis runs.</p>
            {needsChoice && (
              <div>
                <p className="text-xs font-bold uppercase opacity-70 mb-1">{ins.pick === "all" ? "What the display shows" : "What was measured"}</p>
                <div className="flex flex-wrap gap-1.5">
                  {ins.options.map((o) => {
                    const on = options.includes(o.id);
                    return (
                      <button key={o.id} onClick={() => setOptions((cur) => (ins.pick === "all" ? (on ? cur.filter((x) => x !== o.id) : [...cur, o.id]) : [o.id]))}
                        className={`px-2.5 py-2 rounded-lg text-sm font-semibold ${on ? "bg-orange-500 text-white" : chip}`}>{o.label}</button>
                    );
                  })}
                </div>
              </div>
            )}
            {circuits > 1 && perCircuit && (
              <div className="flex gap-1.5 items-center">
                <span className="text-xs font-bold uppercase opacity-70">Circuit</span>
                {Array.from({ length: circuits }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => setCircuit(n)} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${circuit === n ? "bg-orange-500 text-white" : chip}`}>{n}</button>
                ))}
              </div>
            )}
            <label className={`flex items-center justify-center gap-2 py-4 rounded-xl bg-orange-500 text-white font-bold ${ready ? "cursor-pointer" : "opacity-40 pointer-events-none"}`}>
              <Camera className="w-5 h-5" /> Take photo / video
              <input type="file" accept="image/*,video/*" capture="environment" className="hidden" disabled={!ready} onChange={(e) => handle(e.target.files)} />
            </label>
            <label className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold ${chip} ${ready ? "cursor-pointer" : "opacity-40 pointer-events-none"}`}>
              <Images className="w-5 h-5" /> Choose from gallery (up to 8)
              <input type="file" accept="image/*,video/*" multiple className="hidden" disabled={!ready} onChange={(e) => handle(e.target.files)} />
            </label>
            <p className="text-[11px] opacity-60">Videos are reduced to {VIDEO_FRAMES} still frames on your phone before upload. Hold steady and fill the frame with the display or label.</p>
            {err && <p className="text-sm text-red-500">{err}</p>}
          </div>
        )}

        {phase === "working" && (
          <div className="py-10 text-center space-y-2"><Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500" /><p className="text-sm">{status}</p></div>
        )}

        {phase === "review" && scan && (
          <div className="space-y-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {scan.imageUrls.map((u, i) => <img key={u} src={u} alt={`image ${i + 1}`} className="h-20 rounded-lg shrink-0" />)}
            </div>
            {(scan.checks ?? []).map((c, i) => (
              <p key={i} className={`text-xs rounded-lg p-2 flex gap-1.5 ${c.level === "WARNING" ? "bg-amber-100 text-amber-900" : dark ? "bg-emerald-950 text-emerald-100" : "bg-emerald-50 text-emerald-900"}`}>
                {c.level === "WARNING" ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />}{c.message}
              </p>
            ))}
            {scan.notes && <p className="text-xs opacity-70">AI note: {scan.notes}</p>}
            {proposals.length === 0 && <p className="text-sm">No legible value was found. Try closer, sharper, without glare.</p>}
            {proposals.length > 0 && <p className="text-xs font-bold uppercase opacity-70">Check what is correct — correct a value if needed</p>}
            {proposals.map((p, i) => (
              <div key={i} className={`rounded-xl p-2.5 ${chip} ${checked[i] ? "ring-2 ring-orange-500" : ""}`}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={!!checked[i]} onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))} className="mt-1 w-5 h-5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{p.label}{p.circuit > 1 ? ` (circuit ${p.circuit})` : ""} <span className="text-[10px] opacity-60">{p.target === "equipment" ? "nameplate" : "measurement"} · image {p.image + 1} · {p.confidence}</span></p>
                    <div className="flex items-center gap-2 mt-1">
                      <input value={edits[i] ?? (p.value != null ? String(p.value) : p.text ?? "")} onChange={(e) => setEdits((x) => ({ ...x, [i]: e.target.value }))}
                        className={`flex-1 rounded-lg border px-2 py-1.5 text-base ${dark ? "bg-[#0b1220] border-[#2b3b5c]" : "bg-white border-gray-300"}`} />
                    </div>
                    <p className="text-[11px] opacity-70 mt-0.5">Read: “{p.read}” → {p.display}{p.frames ? ` · ${p.frames} frames${p.range && !p.unstable ? `, stable (${p.range[0]}–${p.range[1]})` : ""}` : ""}</p>
                    {p.warning && <p className="text-[11px] text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {p.warning}</p>}
                  </div>
                </label>
              </div>
            ))}
            <p className="text-[11px] opacity-60">Values are saved in °F, psig and in. w.c. (converted from what was read). Only ticked values are saved, marked “photo read by AI, verified” with the photo kept as evidence.</p>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={discard} className={`flex-1 py-3 rounded-xl font-bold ${chip}`}>Discard</button>
              <button onClick={apply} disabled={!Object.values(checked).some(Boolean)} className="flex-[2] py-3 rounded-xl font-bold bg-orange-500 text-white disabled:opacity-40">Validate & analyze</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
