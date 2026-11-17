"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, Plus, Loader2, X, Search, PackagePlus, ArrowRightLeft, ClipboardCheck, Pencil, AlertTriangle, Inbox, History } from "lucide-react";

type Loc = { id: string; name: string; kind: string; technicianId: string | null };
type Item = {
  id: string; name: string; partNumber: string | null; category: string | null; unit: string | null; unitCost: number | null; sellPrice: number | null;
  supplier: string | null; isActive: boolean; minQuantity: number; levels: Record<string, { quantity: number; minQuantity: number }>;
};
type Req = { id: string; itemId: string | null; itemName: string; quantity: number; reason: string | null; appointmentId: string | null; technicianId: string; technician: string | null; createdAt: string };
type Move = { id: string; type: string; item: string; quantity: number; unitCost: number | null; from: string | null; to: string | null; appointmentId: string | null; note: string | null; userName: string | null; at: string };
type Data = { locations: Loc[]; items: Item[]; requests: Req[]; movements: Move[] };

type Action =
  | { kind: "receive"; item: Item }
  | { kind: "transfer"; item: Item; from?: string; to?: string }
  | { kind: "adjust"; item: Item; locationId?: string }
  | { kind: "fulfill"; req: Req }
  | { kind: "item"; item?: Item };

const TZ = "America/New_York";
const money = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" }));
const fmt = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const minFor = (item: Item, loc: Loc) => item.levels[loc.id]?.minQuantity || (loc.kind === "WAREHOUSE" ? item.minQuantity : 0);

export default function InventoryManager() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"stock" | "requests" | "history">("stock");
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/dispatch/inventory", { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const lowCount = useMemo(() => {
    if (!data) return 0;
    return data.items.filter((i) => i.isActive && data.locations.some((l) => { const m = minFor(i, l); return m > 0 && (i.levels[l.id]?.quantity ?? 0) < m; })).length;
  }, [data]);

  const items = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    return data.items.filter((i) =>
      (!s || `${i.name} ${i.partNumber ?? ""} ${i.category ?? ""} ${i.supplier ?? ""}`.toLowerCase().includes(s)) &&
      (!lowOnly || data.locations.some((l) => { const m = minFor(i, l); return m > 0 && (i.levels[l.id]?.quantity ?? 0) < m; })));
  }, [data, q, lowOnly]);

  if (!data) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;

  const stockValue = data.items.reduce((s, i) => s + Object.values(i.levels).reduce((a, l) => a + Math.max(0, l.quantity), 0) * (i.unitCost ?? 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Boxes size={24} className="text-[#1B3FA8]" /> Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Warehouse + one van per technician · {data.items.filter((i) => i.isActive).length} parts · stock value {money(stockValue)}
            {lowCount > 0 && <span className="text-red-600 font-semibold"> · {lowCount} below minimum</span>}
          </p>
        </div>
        <button onClick={() => setAction({ kind: "item" })} className="px-3 py-2 rounded-lg bg-[#F7921A] text-white text-sm font-bold flex items-center gap-2"><Plus size={16} /> New part</button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([["stock", "Stock", Boxes], ["requests", `Technician requests (${data.requests.length})`, Inbox], ["history", "History", History]] as const).map(([k, l, I]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 rounded-lg text-sm font-bold border flex items-center gap-1.5 ${tab === k ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200"}`}><I size={15} /> {l}</button>
        ))}
        {tab === "stock" && (
          <>
            <div className="relative ml-auto">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parts" className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm w-56" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Below minimum</label>
          </>
        )}
      </div>
      {toast && <p className="text-sm bg-green-50 text-green-800 rounded-lg px-3 py-2">{toast}</p>}

      {tab === "stock" && (
        data.items.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
            No parts yet. Click <b>New part</b> to build the catalog, then <b>Receive</b> stock into the warehouse and <b>Transfer</b> it to vans.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-3 py-2 sticky left-0 bg-gray-50">Part</th>
                  <th className="text-right px-3 py-2">Cost</th>
                  {data.locations.map((l) => <th key={l.id} className="text-right px-3 py-2 whitespace-nowrap">{l.kind === "WAREHOUSE" ? "Warehouse" : l.name.replace(/'s van$/, "")}</th>)}
                  <th className="text-right px-3 py-2">Total</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((i) => {
                  const total = data.locations.reduce((s, l) => s + (i.levels[l.id]?.quantity ?? 0), 0);
                  return (
                    <tr key={i.id} className={i.isActive ? "" : "opacity-50"}>
                      <td className="px-3 py-2 sticky left-0 bg-white min-w-[200px]">
                        <p className="font-semibold text-gray-900">{i.name}</p>
                        <p className="text-xs text-gray-500">{[i.partNumber && `#${i.partNumber}`, i.category, i.supplier].filter(Boolean).join(" · ")}{!i.isActive && " · inactive"}</p>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{money(i.unitCost)}{i.unit ? <span className="text-gray-400">/{i.unit}</span> : null}</td>
                      {data.locations.map((l) => {
                        const qty = i.levels[l.id]?.quantity ?? 0, min = minFor(i, l);
                        const low = min > 0 && qty < min;
                        return (
                          <td key={l.id} className="px-3 py-2 text-right">
                            <button onClick={() => setAction({ kind: "adjust", item: i, locationId: l.id })} title={`Count / adjust${min ? ` · min ${min}` : ""}`}
                              className={`px-2 py-0.5 rounded font-semibold ${qty < 0 ? "bg-red-100 text-red-700" : low ? "bg-amber-100 text-amber-800" : qty ? "text-gray-900" : "text-gray-300"}`}>
                              {qty}{low && <AlertTriangle size={11} className="inline ml-1 -mt-0.5" />}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-bold">{total}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 justify-end">
                          <IconBtn title="Receive stock" onClick={() => setAction({ kind: "receive", item: i })}><PackagePlus size={15} /></IconBtn>
                          <IconBtn title="Transfer" onClick={() => setAction({ kind: "transfer", item: i })}><ArrowRightLeft size={15} /></IconBtn>
                          <IconBtn title="Count / adjust" onClick={() => setAction({ kind: "adjust", item: i })}><ClipboardCheck size={15} /></IconBtn>
                          <IconBtn title="Edit part" onClick={() => setAction({ kind: "item", item: i })}><Pencil size={15} /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[11px] text-gray-400 px-3 py-2">Red = negative (parts used but not in the count — recount that van). Amber = below minimum. Click a number to count it.</p>
          </div>
        )
      )}

      {tab === "requests" && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {data.requests.length === 0 && <p className="p-8 text-center text-gray-500 text-sm">No open requests from technicians.</p>}
          {data.requests.map((r) => (
            <div key={r.id} className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{r.quantity} × {r.itemName}</p>
                <p className="text-xs text-gray-500">{r.technician ?? "Technician"} · {fmt(r.createdAt)}{r.reason ? ` · ${r.reason}` : ""}
                  {r.appointmentId && <> · <Link href={`/dispatcher/board?job=${r.appointmentId}`} className="text-[#1B3FA8] hover:underline">job</Link></>}
                </p>
              </div>
              <button onClick={() => setAction({ kind: "fulfill", req: r })} className="px-3 py-1.5 rounded-lg bg-[#1B3FA8] text-white text-xs font-bold">Send to van</button>
              <button onClick={async () => {
                const reason = prompt("Reason (optional):") ?? undefined;
                await post({ action: "reject_request", requestId: r.id, reason });
              }} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Reject</button>
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="text-left px-3 py-2">When</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Part</th><th className="text-right px-3 py-2">Qty</th><th className="text-left px-3 py-2">From → To</th><th className="text-left px-3 py-2">By / note</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.movements.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-500">No stock movements yet.</td></tr>}
              {data.movements.map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmt(m.at)}</td>
                  <td className="px-3 py-2"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{m.type}</span></td>
                  <td className="px-3 py-2">{m.item}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${m.quantity < 0 ? "text-red-600" : "text-gray-900"}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{m.from ?? "—"} → {m.to ?? (m.type === "USE" ? "job" : "—")}
                    {m.appointmentId && <> · <Link href={`/dispatcher/board?job=${m.appointmentId}`} className="text-[#1B3FA8] hover:underline">job</Link></>}</td>
                  <td className="px-3 py-2 text-gray-500">{m.userName}{m.note ? ` · ${m.note}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {action && <ActionModal action={action} data={data} onClose={() => setAction(null)} onDone={(t) => { setAction(null); setToast(t); setTimeout(() => setToast(null), 5000); load(); }} />}
    </div>
  );

  async function post(body: Record<string, unknown>) {
    const r = await fetch("/api/dispatch/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { alert(d.error ?? "Action failed"); return false; }
    load();
    return true;
  }
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return <button title={title} onClick={onClick} className="p-1.5 rounded-lg text-gray-500 hover:text-[#1B3FA8] hover:bg-blue-50">{children}</button>;
}

const input = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30";
const label = "block text-xs font-bold text-gray-600 mb-1";

function ActionModal({ action, data, onClose, onDone }: { action: Action; data: Data; onClose: () => void; onDone: (toast: string) => void }) {
  const wh = data.locations.find((l) => l.kind === "WAREHOUSE");
  const reqItem = action.kind === "fulfill" ? data.items.find((i) => i.id === action.req.itemId || i.name.toLowerCase() === action.req.itemName.toLowerCase()) : undefined;
  const item = action.kind === "fulfill" ? undefined : action.item;
  const [f, setF] = useState<Record<string, string>>((): Record<string, string> => {
    if (action.kind === "item") {
      const i = action.item;
      return { name: i?.name ?? "", partNumber: i?.partNumber ?? "", category: i?.category ?? "", unit: i?.unit ?? "", unitCost: i?.unitCost?.toString() ?? "", sellPrice: i?.sellPrice?.toString() ?? "", supplier: i?.supplier ?? "", minQuantity: String(i?.minQuantity ?? 0), isActive: i?.isActive === false ? "0" : "1" };
    }
    if (action.kind === "receive") return { locationId: wh?.id ?? "", quantity: "", unitCost: action.item.unitCost?.toString() ?? "", note: "" };
    if (action.kind === "transfer") return { from: action.from ?? wh?.id ?? "", to: action.to ?? data.locations.find((l) => l.kind === "VAN")?.id ?? "", quantity: "", note: "" };
    if (action.kind === "adjust") { const loc = action.locationId ?? wh?.id ?? ""; return { locationId: loc, count: String(action.item.levels[loc]?.quantity ?? 0), reason: "", min: String(action.item.levels[loc]?.minQuantity ?? 0) }; }
    return { itemId: reqItem?.id ?? "", from: wh?.id ?? "", quantity: String(action.req.quantity) };
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const n = (s: string) => (s.trim() === "" ? null : Number(s));
  const locSelect = (k: string) => (
    <select className={input} value={f[k]} onChange={(e) => set(k, e.target.value)}>
      {data.locations.map((l) => <option key={l.id} value={l.id}>{l.name}{item ? ` (${item.levels[l.id]?.quantity ?? 0} on hand)` : ""}</option>)}
    </select>
  );

  async function submit() {
    setBusy(true); setErr("");
    let body: Record<string, unknown>; let toast = "Saved.";
    if (action.kind === "item") {
      body = {
        action: action.item ? "update_item" : "create_item", ...(action.item ? { itemId: action.item.id, isActive: f.isActive === "1" } : {}),
        name: f.name, partNumber: f.partNumber || null, category: f.category || null, unit: f.unit || null, unitCost: n(f.unitCost), sellPrice: n(f.sellPrice), supplier: f.supplier || null, minQuantity: Number(f.minQuantity) || 0,
      };
      toast = action.item ? "Part updated." : "Part added to the catalog.";
    } else if (action.kind === "receive") {
      body = { action: "receive", itemId: action.item.id, locationId: f.locationId, quantity: Number(f.quantity), unitCost: n(f.unitCost), note: f.note || undefined };
      toast = `Received ${f.quantity} × ${action.item.name}.`;
    } else if (action.kind === "transfer") {
      body = { action: "transfer", itemId: action.item.id, fromLocationId: f.from, toLocationId: f.to, quantity: Number(f.quantity), note: f.note || undefined };
      toast = `Moved ${f.quantity} × ${action.item.name}.`;
    } else if (action.kind === "adjust") {
      const cur = action.item.levels[f.locationId]?.minQuantity ?? 0;
      if (Number(f.min) !== cur) {
        const r = await fetch("/api/dispatch/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_min", itemId: action.item.id, locationId: f.locationId, minQuantity: Number(f.min) || 0 }) });
        if (!r.ok) { setBusy(false); setErr((await r.json().catch(() => ({}))).error ?? "Could not save minimum"); return; }
      }
      if (Number(f.count) === (action.item.levels[f.locationId]?.quantity ?? 0)) { setBusy(false); onDone("Saved."); return; }
      body = { action: "adjust", itemId: action.item.id, locationId: f.locationId, countedQuantity: Number(f.count), reason: f.reason || "Physical count" };
      toast = "Count saved.";
    } else {
      body = { action: "fulfill_request", requestId: action.req.id, itemId: f.itemId, fromLocationId: f.from, quantity: Number(f.quantity) };
      toast = `Sent to ${action.req.technician ?? "the technician"}'s van.`;
    }
    const r = await fetch("/api/dispatch/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(d.error ?? "Action failed"); return; }
    onDone(toast);
  }

  const title = action.kind === "item" ? (action.item ? "Edit part" : "New part") : action.kind === "receive" ? `Receive — ${action.item.name}` : action.kind === "transfer" ? `Transfer — ${action.item.name}` : action.kind === "adjust" ? `Count — ${action.item.name}` : `Send to van — ${action.req.itemName}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-black text-lg">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          {action.kind === "item" && (
            <>
              <div><label className={label}>Name *</label><input className={input} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="45/5 MFD dual run capacitor" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>Part #</label><input className={input} value={f.partNumber} onChange={(e) => set("partNumber", e.target.value)} /></div>
                <div><label className={label}>Category</label><input className={input} value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="Electrical" /></div>
                <div><label className={label}>Unit cost ($)</label><input className={input} inputMode="decimal" value={f.unitCost} onChange={(e) => set("unitCost", e.target.value.replace(/[^0-9.]/g, ""))} /></div>
                <div><label className={label}>Sell price ($)</label><input className={input} inputMode="decimal" value={f.sellPrice} onChange={(e) => set("sellPrice", e.target.value.replace(/[^0-9.]/g, ""))} /></div>
                <div><label className={label}>Unit</label><input className={input} value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="each, ft, lb" /></div>
                <div><label className={label}>Warehouse minimum</label><input className={input} inputMode="numeric" value={f.minQuantity} onChange={(e) => set("minQuantity", e.target.value.replace(/\D/g, ""))} /></div>
              </div>
              <div><label className={label}>Supplier</label><input className={input} value={f.supplier} onChange={(e) => set("supplier", e.target.value)} /></div>
              {action.item && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isActive === "1"} onChange={(e) => set("isActive", e.target.checked ? "1" : "0")} /> Active (shown to technicians)</label>}
            </>
          )}
          {action.kind === "receive" && (
            <>
              <div><label className={label}>Into</label>{locSelect("locationId")}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>Quantity *</label><input className={input} inputMode="decimal" value={f.quantity} onChange={(e) => set("quantity", e.target.value.replace(/[^0-9.]/g, ""))} /></div>
                <div><label className={label}>Unit cost paid ($)</label><input className={input} inputMode="decimal" value={f.unitCost} onChange={(e) => set("unitCost", e.target.value.replace(/[^0-9.]/g, ""))} /></div>
              </div>
              <div><label className={label}>Note (invoice #, supplier)</label><input className={input} value={f.note} onChange={(e) => set("note", e.target.value)} /></div>
            </>
          )}
          {action.kind === "transfer" && (
            <>
              <div><label className={label}>From</label>{locSelect("from")}</div>
              <div><label className={label}>To</label>{locSelect("to")}</div>
              <div><label className={label}>Quantity *</label><input className={input} inputMode="decimal" value={f.quantity} onChange={(e) => set("quantity", e.target.value.replace(/[^0-9.]/g, ""))} /></div>
              <div><label className={label}>Note</label><input className={input} value={f.note} onChange={(e) => set("note", e.target.value)} /></div>
            </>
          )}
          {action.kind === "adjust" && (
            <>
              <div><label className={label}>Location</label>
                <select className={input} value={f.locationId} onChange={(e) => { const id = e.target.value; setF((p) => ({ ...p, locationId: id, count: String(action.item.levels[id]?.quantity ?? 0), min: String(action.item.levels[id]?.minQuantity ?? 0) })); }}>
                  {data.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>Counted quantity</label><input className={input} inputMode="decimal" value={f.count} onChange={(e) => set("count", e.target.value.replace(/[^0-9.]/g, ""))} />
                  <p className="text-[11px] text-gray-400 mt-0.5">System says {action.item.levels[f.locationId]?.quantity ?? 0}</p></div>
                <div><label className={label}>Minimum here</label><input className={input} inputMode="decimal" value={f.min} onChange={(e) => set("min", e.target.value.replace(/[^0-9.]/g, ""))} /></div>
              </div>
              <div><label className={label}>Reason</label><input className={input} value={f.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Monthly van count, damaged, found…" /></div>
            </>
          )}
          {action.kind === "fulfill" && (
            <>
              <p className="text-sm text-gray-600">{action.req.technician ?? "Technician"} asked for {action.req.quantity} × {action.req.itemName}{action.req.reason ? ` (${action.req.reason})` : ""}.</p>
              <div><label className={label}>Catalog part</label>
                <select className={input} value={f.itemId} onChange={(e) => set("itemId", e.target.value)}>
                  <option value="">Choose the part…</option>
                  {data.items.filter((i) => i.isActive).map((i) => <option key={i.id} value={i.id}>{i.name}{i.partNumber ? ` #${i.partNumber}` : ""}</option>)}
                </select>
                {!reqItem && <p className="text-[11px] text-amber-700 mt-0.5">Not matched automatically — pick the catalog part (or add it first with New part).</p>}</div>
              <div><label className={label}>Take from</label>
                <select className={input} value={f.from} onChange={(e) => set("from", e.target.value)}>
                  {data.locations.filter((l) => l.technicianId !== action.req.technicianId).map((l) => {
                    const it = data.items.find((i) => i.id === f.itemId);
                    return <option key={l.id} value={l.id}>{l.name}{it ? ` (${it.levels[l.id]?.quantity ?? 0} on hand)` : ""}</option>;
                  })}
                </select></div>
              <div><label className={label}>Quantity</label><input className={input} inputMode="decimal" value={f.quantity} onChange={(e) => set("quantity", e.target.value.replace(/[^0-9.]/g, ""))} /></div>
            </>
          )}
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>
          <button onClick={submit} disabled={busy || (action.kind === "item" && f.name.trim().length < 2) || (action.kind === "fulfill" && !f.itemId)}
            className="px-4 py-2 rounded-lg bg-[#1B3FA8] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
            {busy && <Loader2 size={15} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}
