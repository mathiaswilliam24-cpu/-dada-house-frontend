"use client";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Package, Eye, EyeOff, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Product = { id: string; name: string; slug: string; price: number; comparePrice: number | null; category: string; inStock: boolean; stockCount: number | null; featured: boolean; images: string[]; };

export default function AdminStorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", category: "HVAC", description: "", stockCount: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/admin/products").then(r => r.json()).then(d => { setProducts(d.products ?? []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const slug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, slug, price: parseFloat(form.price), stockCount: form.stockCount ? parseInt(form.stockCount) : null }) });
    setSaving(false); setShowForm(false); setForm({ name: "", price: "", category: "HVAC", description: "", stockCount: "" }); load();
  }

  async function toggleStock(id: string, inStock: boolean) {
    await fetch(`/api/admin/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inStock: !inStock }) });
    setProducts(prev => prev.map(p => p.id === id ? { ...p, inStock: !inStock } : p));
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Store Management</h1><p className="text-gray-500 text-sm mt-0.5">{products.length} products</p></div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7921A] text-white rounded-lg text-sm font-semibold hover:bg-[#E07F10]">
          <Plus className="w-4 h-4" />Add Product
        </button>
      </div>

      {showForm && (
        <form onSubmit={createProduct} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">New Product</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Price *</label><input required type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {["HVAC","Plumbing","Tools","Service Plans","Parts","Accessories"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock Count</label><input type="number" value={form.stockCount} onChange={e => setForm({...form, stockCount: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" /></div>
          </div>
          <div className="flex gap-3"><button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#1B3FA8] text-white rounded-lg text-sm font-semibold disabled:opacity-60">{saving ? "Saving…" : "Create"}</button><button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm">Cancel</button></div>
        </form>
      )}

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100 bg-gray-50/50"><th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th><th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th><th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th><th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th><th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-gray-400" /></div><div><p className="font-medium text-gray-900 text-sm">{p.name}</p><p className="text-xs text-gray-400">{p.slug}</p></div></div></td>
                  <td className="px-5 py-3.5"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{p.category}</span></td>
                  <td className="px-5 py-3.5 text-right font-semibold text-sm text-gray-900">{formatCurrency(p.price)}</td>
                  <td className="px-5 py-3.5 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.inStock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{p.inStock ? `In Stock${p.stockCount ? ` (${p.stockCount})` : ""}` : "Out"}</span></td>
                  <td className="px-5 py-3.5"><div className="flex items-center justify-end gap-1">
                    <button onClick={() => toggleStock(p.id, p.inStock)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">{p.inStock ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div></td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">No products yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}