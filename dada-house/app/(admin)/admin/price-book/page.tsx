"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  BookOpen, Plus, Search, RefreshCw, Upload, Pencil, Trash2,
  X, Loader2, Layers, DollarSign,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type PriceBookItem = {
  id: string;
  industry: string;
  category: string;
  subcategory1: string | null;
  subcategory2: string | null;
  name: string;
  description: string | null;
  price: number;
  cost: number;
  taxable: boolean;
  unit: string | null;
  taskCode: string | null;
  onlineBooking: boolean;
};

const emptyForm = {
  industry: "",
  category: "",
  subcategory1: "",
  subcategory2: "",
  name: "",
  description: "",
  price: 0,
  cost: 0,
  taxable: true,
  unit: "",
  taskCode: "",
  onlineBooking: false,
};

export default function AdminPriceBookPage() {
  const [items, setItems] = useState<PriceBookItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category !== "ALL") params.set("category", category);
    const res = await fetch(`/api/admin/price-book?${params.toString()}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setCategories(data.categories ?? []);
    setLoading(false);
  }, [q, category]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (item: PriceBookItem) => {
    setEditingId(item.id);
    setForm({
      industry: item.industry,
      category: item.category,
      subcategory1: item.subcategory1 ?? "",
      subcategory2: item.subcategory2 ?? "",
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      cost: item.cost,
      taxable: item.taxable,
      unit: item.unit ?? "",
      taskCode: item.taskCode ?? "",
      onlineBooking: item.onlineBooking,
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.category) {
      setError("Name and category are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editingId ? `/api/admin/price-book/${editingId}` : "/api/admin/price-book";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      setShowModal(false);
      load();
    } catch {
      setError("Failed to save item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this price book item?")) return;
    await fetch(`/api/admin/price-book/${id}`, { method: "DELETE" });
    load();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    try {
      const csv = await file.text();
      const res = await fetch("/api/admin/price-book/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setImportMsg(`Imported ${data.imported} item${data.imported === 1 ? "" : "s"}.`);
      load();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setImportMsg(""), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Book</h1>
          <p className="text-gray-500 text-sm mt-0.5">Catalog of services & materials used in Estimates</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#F97316] text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors">
            <Plus className="w-4 h-4" /> New Item
          </button>
        </div>
      </div>

      {importMsg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-xl px-4 py-2.5">
          {importMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Items", value: items.length.toString(), icon: BookOpen, color: "text-blue-600 bg-blue-50" },
          { label: "Categories", value: categories.length.toString(), icon: Layers, color: "text-purple-600 bg-purple-50" },
          { label: "Avg. Price", value: formatCurrency(items.length ? items.reduce((s, i) => s + i.price, 0) / items.length : 0), icon: DollarSign, color: "text-green-600 bg-green-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-gray-200 p-4 items-center">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30 bg-white"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, description, category…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Cost</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Taxable</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-500 line-clamp-1 max-w-md">{item.description}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-gray-700">{item.category}</p>
                      {(item.subcategory1 || item.subcategory2) && (
                        <p className="text-xs text-gray-400">{[item.subcategory1, item.subcategory2].filter(Boolean).join(" › ")}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(item.price)}</p>
                      {item.unit && <p className="text-xs text-gray-400">/ {item.unit}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden lg:table-cell">{formatCurrency(item.cost)}</td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${item.taxable ? "text-green-600 bg-green-50 border-green-200" : "text-gray-500 bg-gray-50 border-gray-200"}`}>
                        {item.taxable ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-[#1B3FA8] hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">No price book items found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? "Edit Item" : "New Price Book Item"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>
              )}
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Item name *"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description"
                rows={2}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8] resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.industry}
                  onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                  placeholder="Industry"
                  className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
                />
                <input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Category *"
                  className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.subcategory1}
                  onChange={(e) => setForm((f) => ({ ...f, subcategory1: e.target.value }))}
                  placeholder="Subcategory 1"
                  className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
                />
                <input
                  value={form.subcategory2}
                  onChange={(e) => setForm((f) => ({ ...f, subcategory2: e.target.value }))}
                  placeholder="Subcategory 2"
                  className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.price || ""}
                    onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="Price"
                    className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.cost || ""}
                    onChange={(e) => setForm((f) => ({ ...f, cost: parseFloat(e.target.value) || 0 }))}
                    placeholder="Cost"
                    className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="Unit of measure"
                  className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
                />
                <input
                  value={form.taskCode}
                  onChange={(e) => setForm((f) => ({ ...f, taskCode: e.target.value }))}
                  placeholder="Task code"
                  className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
                />
              </div>
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="checkbox" checked={form.taxable} onChange={(e) => setForm((f) => ({ ...f, taxable: e.target.checked }))} className="rounded border-gray-300" />
                  Taxable
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="checkbox" checked={form.onlineBooking} onChange={(e) => setForm((f) => ({ ...f, onlineBooking: e.target.checked }))} className="rounded border-gray-300" />
                  Online booking enabled
                </label>
              </div>
            </div>
            <div className="flex gap-2 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#F97316] text-white text-sm font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingId ? "Save Changes" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
