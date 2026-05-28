"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Shield, Plus, Pencil, Trash2, X, Check, Loader2,
  Users, UserCheck, HardHat, Radio, Search,
} from "lucide-react";

type Role = "ADMIN" | "CLIENT" | "TECHNICIAN" | "DISPATCHER";
type User = {
  id: string; name: string | null; email: string; phone: string | null;
  role: Role; createdAt: string; _count: { appointments: number };
};

const ROLES: Role[] = ["ADMIN", "CLIENT", "TECHNICIAN", "DISPATCHER"];

const roleColor: Record<Role, string> = {
  ADMIN:      "text-red-700 bg-red-50 border-red-200",
  CLIENT:     "text-blue-700 bg-blue-50 border-blue-200",
  TECHNICIAN: "text-green-700 bg-green-50 border-green-200",
  DISPATCHER: "text-purple-700 bg-purple-50 border-purple-200",
};

const roleIcon: Record<Role, React.ReactNode> = {
  ADMIN:      <Shield className="w-3.5 h-3.5" />,
  CLIENT:     <Users className="w-3.5 h-3.5" />,
  TECHNICIAN: <HardHat className="w-3.5 h-3.5" />,
  DISPATCHER: <Radio className="w-3.5 h-3.5" />,
};

type ModalMode = "create" | "edit" | null;

const emptyForm = { name: "", email: "", phone: "", role: "CLIENT" as Role, password: "" };

export default function AdminUsersPage() {
  const [users, setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [q, setQ]           = useState("");
  const [modal, setModal]   = useState<ModalMode>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [form, setForm]     = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (roleFilter !== "ALL") params.set("role", roleFilter);
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, [roleFilter, q]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setSelected(null);
    setForm(emptyForm);
    setError("");
    setModal("create");
  }

  function openEdit(user: User) {
    setSelected(user);
    setForm({ name: user.name ?? "", email: user.email, phone: user.phone ?? "", role: user.role, password: "" });
    setError("");
    setModal("edit");
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const url  = modal === "create" ? "/api/admin/users" : `/api/admin/users/${selected!.id}`;
      const method = modal === "create" ? "POST" : "PATCH";
      const body: Record<string, string> = { name: form.name, email: form.email, phone: form.phone, role: form.role };
      if (form.password) body.password = form.password;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); setSaving(false); return; }
      setModal(null);
      load();
    } catch { setError("Network error"); }
    setSaving(false);
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    setDeleting(id);
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  // Role counts
  const counts = ROLES.reduce((acc, r) => ({ ...acc, [r]: users.filter(u => u.role === r).length }), {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Roles</h1>
          <p className="text-gray-500 text-sm mt-0.5">{users.length} user{users.length !== 1 ? "s" : ""} total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold hover:bg-[#1A3490] transition-colors"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Role stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ROLES.map(r => (
          <button
            key={r}
            onClick={() => setRoleFilter(roleFilter === r ? "ALL" : r)}
            className={`bg-white rounded-xl border p-4 text-left transition-colors hover:border-[#1B3FA8]/30 ${roleFilter === r ? "border-[#1B3FA8] ring-1 ring-[#1B3FA8]" : "border-gray-200"}`}
          >
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border mb-2 ${roleColor[r]}`}>
              {roleIcon[r]} {r}
            </div>
            <p className="text-2xl font-bold text-gray-900">{counts[r] ?? 0}</p>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F7921A]/30 focus:border-[#F7921A]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
        >
          <option value="ALL">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Appts</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Joined</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1B3FA8] flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-white">
                            {(user.name ?? user.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name ?? "(No name)"}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleColor[user.role]}`}>
                        {roleIcon[user.role]} {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{user.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs hidden lg:table-cell">{user._count.appointments}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden xl:table-cell">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 text-gray-400 hover:text-[#1B3FA8] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          disabled={deleting === user.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          {deleting === user.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{modal === "create" ? "Add User" : "Edit User"}</h2>
              <button onClick={() => setModal(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="713-555-0000"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Password {modal === "edit" && <span className="text-gray-400">(leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={modal === "edit" ? "Leave blank to keep" : "Min 8 characters"}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold hover:bg-[#1A3490] disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {modal === "create" ? "Create User" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
