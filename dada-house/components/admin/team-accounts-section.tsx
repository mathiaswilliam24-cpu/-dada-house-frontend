"use client";

import { useState } from "react";
import { Users, Pencil, X, Loader2, CheckCircle, Plus, Trash2, Eye, EyeOff } from "lucide-react";

type TeamUser = { id: string; name: string | null; email: string; phone: string | null; role: string };

const ROLE_COLORS: Record<string, string> = {
  ADMIN:       "text-purple-700 bg-purple-50 border-purple-200",
  TECHNICIAN:  "text-blue-700 bg-blue-50 border-blue-200",
  DISPATCHER:  "text-orange-700 bg-orange-50 border-orange-200",
};

export function TeamAccountsSection({ users: initial }: { users: TeamUser[] }) {
  const [users, setUsers]         = useState<TeamUser[]>(initial);
  const [editUser, setEditUser]   = useState<TeamUser | null>(null);
  const [form, setForm]           = useState({ name: "", email: "", phone: "", role: "TECHNICIAN", password: "", confirmPassword: "" });
  const [showPw, setShowPw]       = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [showNew, setShowNew]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openEdit(u: TeamUser) {
    setEditUser(u);
    setForm({ name: u.name ?? "", email: u.email, phone: u.phone ?? "", role: u.role, password: "", confirmPassword: "" });
    setError(""); setSuccess(""); setShowPw(false);
  }

  function openNew() {
    setEditUser(null);
    setForm({ name: "", email: "", phone: "", role: "TECHNICIAN", password: "", confirmPassword: "" });
    setError(""); setSuccess(""); setShowPw(false); setShowNew(true);
  }

  function close() { setEditUser(null); setShowNew(false); setError(""); setSuccess(""); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    if (form.password && form.password !== form.confirmPassword) {
      setError("Passwords do not match."); return;
    }
    setSaving(true);
    try {
      const isNew = showNew && !editUser;
      const url   = isNew ? "/api/admin/users" : `/api/admin/users/${editUser!.id}`;
      const method = isNew ? "POST" : "PATCH";
      const body: Record<string, string> = { name: form.name, email: form.email, phone: form.phone, role: form.role };
      if (form.password) body.password = form.password;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error");

      const saved: TeamUser = d.user;
      if (isNew) {
        setUsers(prev => [...prev, saved]);
      } else {
        setUsers(prev => prev.map(u => u.id === saved.id ? saved : u));
      }
      setSuccess("Saved!");
      setTimeout(close, 1200);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  async function deleteUser(userId: string) {
    setDeletingId(userId);
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setUsers(prev => prev.filter(u => u.id !== userId));
    setDeletingId(null);
  }

  const modal = (editUser || showNew) && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{showNew && !editUser ? "New Account" : `Edit — ${editUser?.name ?? editUser?.email}`}</h3>
          <button onClick={close} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={save} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Full Name</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                placeholder="Name" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="TECHNICIAN">Technician</option>
                <option value="DISPATCHER">Dispatcher</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Email *</label>
            <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} type="email" required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} type="tel"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">
              {editUser ? "New Password (leave blank to keep current)" : "Password *"}
            </label>
            <div className="relative">
              <input value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                type={showPw ? "text" : "password"} required={!editUser}
                placeholder={editUser ? "••••••••" : ""}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 pr-10" />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {form.password && (
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Confirm Password</label>
              <input value={form.confirmPassword} onChange={e => setForm(f => ({...f, confirmPassword: e.target.value}))}
                type={showPw ? "text" : "password"}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          )}
          {error   && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
          {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-xl flex items-center gap-2"><CheckCircle className="w-4 h-4" />{success}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={close} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-bold hover:bg-[#1A3490] disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1B3FA8]" /> Team Accounts ({users.length})
          </h2>
          <button onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B3FA8] text-white text-xs font-semibold rounded-lg hover:bg-[#1A3490]">
            <Plus className="w-3.5 h-3.5" /> New Account
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {users.length === 0 && (
            <div className="py-8 text-center text-gray-400 text-sm">No team accounts yet</div>
          )}
          {users.map(u => (
            <div key={u.id} className="px-5 py-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#1B3FA8] flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-white">{(u.name ?? u.email)[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{u.name ?? "(No name)"}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
                {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${ROLE_COLORS[u.role] ?? "text-gray-600 bg-gray-50 border-gray-200"}`}>
                {u.role}
              </span>
              <button onClick={() => openEdit(u)}
                className="p-1.5 text-gray-400 hover:text-[#1B3FA8] hover:bg-blue-50 rounded-lg" title="Edit account">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => deleteUser(u.id)} disabled={deletingId === u.id}
                className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50" title="Delete account">
                {deletingId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </div>
      {modal}
    </>
  );
}
