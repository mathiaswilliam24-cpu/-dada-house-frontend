"use client";
import { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, X, Check, User, Phone, Mail, MapPin, Loader2 } from "lucide-react";

type Client = {
  id: string; name: string; email: string | null; phone: string | null;
  mobile: string | null; address: string | null; city: string | null;
  state: string; zip: string | null; notes: string | null;
};

const empty = { name: "", email: "", phone: "", mobile: "", address: "", city: "", state: "TX", zip: "", notes: "" };

export default function TechnicianClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Client | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load(search = "") {
    setLoading(true);
    const res = await fetch(`/api/technician/clients${search ? `?q=${encodeURIComponent(search)}` : ""}`);
    const d = await res.json();
    setClients(d.clients ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(empty);
    setSelected(null);
    setError("");
    setModal("create");
  }

  function openEdit(c: Client) {
    setSelected(c);
    setForm({
      name: c.name, email: c.email ?? "", phone: c.phone ?? "",
      mobile: c.mobile ?? "", address: c.address ?? "",
      city: c.city ?? "", state: c.state, zip: c.zip ?? "", notes: c.notes ?? "",
    });
    setError("");
    setModal("edit");
  }

  async function save() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const url = modal === "create" ? "/api/technician/clients" : `/api/technician/clients/${selected!.id}`;
      const method = modal === "create" ? "POST" : "PATCH";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { setError("Failed to save"); return; }
      setModal(null);
      load();
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this client?")) return;
    await fetch(`/api/technician/clients/${id}`, { method: "DELETE" });
    load();
  }

  const filtered = clients.filter(c =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.email?.toLowerCase().includes(q.toLowerCase()) ||
    c.phone?.includes(q)
  );

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">My Clients</h1>
          <p className="text-sm text-gray-500">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1B3FA8] text-white rounded-xl text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); load(e.target.value); }}
          placeholder="Search by name, email, phone…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No clients yet</p>
          <p className="text-gray-300 text-xs mt-1">Clients are added automatically when you're assigned a job</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-[#1B3FA8] rounded-full flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-white">{c.name[0].toUpperCase()}</span>
                    </div>
                    <p className="font-semibold text-gray-900">{c.name}</p>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Mail className="w-3 h-3" /> {c.email}
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Phone className="w-3 h-3" /> {c.phone}
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <MapPin className="w-3 h-3" /> {c.address}{c.city ? `, ${c.city}` : ""} {c.state}
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-[#1B3FA8] hover:bg-blue-50 rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-bold text-gray-900">{modal === "create" ? "Add Client" : "Edit Client"}</h2>
              <button onClick={() => setModal(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full name *" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Email" type="email" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
              <div className="grid grid-cols-2 gap-2">
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone" className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
                <input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                  placeholder="Mobile" className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
              </div>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Address" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
              <div className="grid grid-cols-3 gap-2">
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="City" className="col-span-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
                <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                  placeholder="State" className="col-span-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
                <input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))}
                  placeholder="ZIP" className="col-span-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
              </div>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes (optional)" rows={2}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8] resize-none" />
            </div>
            <div className="flex gap-3 p-4 border-t border-gray-100">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={save} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-bold disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {modal === "create" ? "Add Client" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
