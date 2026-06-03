"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus, Edit2, Trash2, Package, Eye, EyeOff, Star, StarOff,
  Tag, Settings, X, ImagePlus, GripVertical, Save, Loader2, ChevronUp, ChevronDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Product = {
  id: string; name: string; slug: string; description: string | null;
  price: number; comparePrice: number | null; category: string;
  inStock: boolean; stockCount: number | null; featured: boolean;
  images: string[]; videoUrl: string | null; sortOrder: number;
};

type Tab = "products" | "categories" | "settings";

const EMPTY_FORM = {
  name: "", slug: "", description: "", price: "", comparePrice: "",
  category: "", inStock: true, featured: false, stockCount: "", sortOrder: "0",
  images: [] as string[], videoUrl: "",
};

export default function AdminStorePage() {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState("8.25");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [prodRes, settingsRes] = await Promise.all([
      fetch("/api/admin/products"),
      fetch("/api/admin/settings"),
    ]);
    if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products ?? []); }
    if (settingsRes.ok) {
      const s = await settingsRes.json();
      if (s["store.categories"]) {
        try { setCategories(JSON.parse(s["store.categories"])); } catch { /* empty */ }
      } else {
        setCategories(["HVAC", "Plumbing", "Tools", "Service Plans", "Parts", "Accessories"]);
      }
      setTaxEnabled(s["store.taxEnabled"] !== "false");
      setTaxRate(s["store.taxRate"] ?? "8.25");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, category: categories[0] ?? "" });
    setShowForm(true);
    setTimeout(() => document.getElementById("prod-form")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name, slug: p.slug, description: p.description ?? "",
      price: String(p.price), comparePrice: p.comparePrice ? String(p.comparePrice) : "",
      category: p.category, inStock: p.inStock, featured: p.featured,
      stockCount: p.stockCount ? String(p.stockCount) : "", sortOrder: String(p.sortOrder),
      images: p.images, videoUrl: p.videoUrl ?? "",
    });
    setShowForm(true);
    setTimeout(() => document.getElementById("prod-form")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function closeForm() { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setSaveError(null); }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const body = {
      name: form.name,
      slug: form.slug || autoSlug(form.name),
      description: form.description || null,
      price: parseFloat(form.price),
      comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
      category: form.category,
      inStock: form.inStock,
      featured: form.featured,
      stockCount: form.stockCount ? parseInt(form.stockCount) : null,
      sortOrder: parseInt(form.sortOrder) || 0,
      images: form.images,
      videoUrl: form.videoUrl || null,
    };
    try {
      const res = await fetch(
        editingId ? `/api/admin/products/${editingId}` : "/api/admin/products",
        { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error ?? `Save failed (${res.status})`);
        setSaving(false);
        return;
      }
    } catch (err) {
      setSaveError(String(err));
      setSaving(false);
      return;
    }
    setSaving(false);
    closeForm();
    await loadAll();
  }

  async function toggleField(id: string, field: "inStock" | "featured", val: boolean) {
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: !val }),
    });
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: !val } : p));
  }

  async function deleteProduct(id: string) {
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setProducts(prev => prev.filter(p => p.id !== id));
    setDeleteConfirm(null);
  }

  async function saveCategories(cats: string[]) {
    setCategories(cats);
    await fetch("/api/admin/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "store.categories": JSON.stringify(cats) }),
    });
  }

  async function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const updated = [...categories, trimmed];
    await saveCategories(updated);
    setNewCategory("");
  }

  async function removeCategory(cat: string) {
    const updated = categories.filter(c => c !== cat);
    await saveCategories(updated);
  }

  async function saveTaxSettings() {
    setSavingSettings(true);
    await fetch("/api/admin/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "store.taxEnabled": String(taxEnabled), "store.taxRate": taxRate }),
    });
    setSavingSettings(false);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setForm(f => ({ ...f, videoUrl: data.url }));
      } else {
        setUploadError(data.error ?? `Video upload failed (${res.status})`);
      }
    } catch (err) {
      setUploadError(String(err));
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.url) {
          urls.push(data.url);
        } else {
          setUploadError(data.error ?? `Upload failed (${res.status})`);
        }
      }
      if (urls.length > 0) setForm(f => ({ ...f, images: [...f.images, ...urls] }));
    } catch (err) {
      setUploadError(String(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(url: string) {
    setForm(f => ({ ...f, images: f.images.filter(i => i !== url) }));
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "products", label: "Products", icon: Package },
    { key: "categories", label: "Categories", icon: Tag },
    { key: "settings", label: "Tax & Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} products · {categories.length} categories</p>
        </div>
        {tab === "products" && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7921A] text-white rounded-lg text-sm font-semibold hover:bg-[#E07F10] transition-colors">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── PRODUCTS TAB ── */}
      {tab === "products" && (
        <div className="space-y-4">
          {/* Product form */}
          {showForm && (
            <div id="prod-form" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">{editingId ? "Edit Product" : "New Product"}</h2>
                <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={saveProduct} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Product Name *</label>
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, ...(editingId ? {} : { slug: autoSlug(e.target.value) }) }))}
                      placeholder="e.g. HVAC Air Filter 16x25"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
                  </div>
                  {/* Slug */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Slug (URL)</label>
                    <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
                  </div>
                  {/* Price */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Price ($) *</label>
                    <input required type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
                  </div>
                  {/* Compare price */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Compare Price ($) <span className="text-gray-400 font-normal">— original before sale</span></label>
                    <input type="number" step="0.01" min="0" value={form.comparePrice} onChange={e => setForm(f => ({ ...f, comparePrice: e.target.value }))}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
                  </div>
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Category *</label>
                    <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30">
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {/* Stock count */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Stock Count</label>
                    <input type="number" min="0" value={form.stockCount} onChange={e => setForm(f => ({ ...f, stockCount: e.target.value }))}
                      placeholder="Leave empty for unlimited"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
                  </div>
                  {/* Sort order */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Sort Order <span className="text-gray-400 font-normal">— lower = first</span></label>
                    <input type="number" min="0" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
                  </div>
                  {/* Toggles */}
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.inStock} onChange={e => setForm(f => ({ ...f, inStock: e.target.checked }))}
                        className="w-4 h-4 accent-[#1B3FA8]" />
                      <span className="text-sm font-medium text-gray-700">In Stock</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))}
                        className="w-4 h-4 accent-[#F7921A]" />
                      <span className="text-sm font-medium text-gray-700">Featured</span>
                    </label>
                  </div>
                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                    <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Product description, features, specifications…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
                  </div>
                  {/* Video */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Product Video <span className="text-gray-400 font-normal">— upload a file or paste a YouTube/Vimeo link</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={form.videoUrl}
                        onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
                      />
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        id="product-video-upload"
                        onChange={handleVideoUpload}
                        disabled={uploadingVideo}
                      />
                      <label
                        htmlFor="product-video-upload"
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 cursor-pointer whitespace-nowrap transition-colors ${uploadingVideo ? "opacity-60 pointer-events-none bg-gray-50 text-gray-400" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                      >
                        {uploadingVideo ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : "📁 Upload file"}
                      </label>
                    </div>
                    {form.videoUrl && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                        <span className="font-medium">✓ Video set:</span>
                        <span className="truncate text-gray-500">{form.videoUrl}</span>
                        <button type="button" onClick={() => setForm(f => ({ ...f, videoUrl: "" }))} className="ml-auto text-red-400 hover:text-red-600 shrink-0">✕ Remove</button>
                      </div>
                    )}
                  </div>

                  {/* Images */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Product Images</label>
                    {form.images.length > 0 && (
                      <div className="flex flex-wrap gap-3 mb-3">
                        {form.images.map((url, i) => (
                          <div key={url} className="relative group">
                            <img src={url} alt={`img-${i}`} className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                            <button type="button" onClick={() => removeImage(url)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-3 h-3" />
                            </button>
                            {i === 0 && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded">Main</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {uploadError && (
                      <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2">{uploadError}</p>
                    )}
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2">
                      <ImagePlus className="w-6 h-6 text-gray-400" />
                      <p className="text-xs text-gray-500">Upload up to 8 images (8MB each)</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploading}
                        onChange={handleImageUpload}
                        className="hidden"
                        id="product-image-upload"
                      />
                      <label
                        htmlFor="product-image-upload"
                        className={`inline-flex items-center gap-2 px-4 py-2 bg-[#1B3FA8] text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-[#1B3FA8]/90 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}
                      >
                        {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</> : <><ImagePlus className="w-3.5 h-3.5" /> Choose Images</>}
                      </label>
                    </div>
                  </div>
                </div>
                {saveError && (
                  <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{saveError}</p>
                )}
                <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
                  <button type="submit" disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1B3FA8] text-white rounded-lg text-sm font-bold disabled:opacity-60 hover:bg-[#1B3FA8]/90 transition-colors">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> {editingId ? "Update Product" : "Create Product"}</>}
                  </button>
                  <button type="button" onClick={closeForm}
                    className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Products table */}
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Category</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Stock</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.images[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-gray-100 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">{p.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-sm text-gray-900">{formatCurrency(p.price)}</p>
                        {p.comparePrice && <p className="text-xs text-gray-400 line-through">{formatCurrency(p.comparePrice)}</p>}
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.inStock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          {p.inStock ? (p.stockCount !== null ? `${p.stockCount} left` : "In Stock") : "Out of Stock"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button title={p.featured ? "Remove from featured" : "Mark as featured"} onClick={() => toggleField(p.id, "featured", p.featured)}
                            className={`p-1.5 rounded-lg transition-colors ${p.featured ? "text-[#F7921A] bg-orange-50 hover:bg-orange-100" : "text-gray-300 hover:bg-gray-100 hover:text-gray-500"}`}>
                            {p.featured ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                          </button>
                          <button title={p.inStock ? "Mark out of stock" : "Mark in stock"} onClick={() => toggleField(p.id, "inStock", p.inStock)}
                            className={`p-1.5 rounded-lg transition-colors ${p.inStock ? "text-green-600 bg-green-50 hover:bg-green-100" : "text-gray-300 hover:bg-gray-100 hover:text-gray-500"}`}>
                            {p.inStock ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {deleteConfirm === p.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => deleteProduct(p.id)} className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg font-semibold">Confirm</button>
                              <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs border border-gray-200 rounded-lg">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-12 text-center">
                      <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No products yet. Click "Add Product" to get started.</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CATEGORIES TAB ── */}
      {tab === "categories" && (
        <div className="space-y-4 max-w-xl">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-1">Product Categories</h2>
            <p className="text-sm text-gray-500 mb-5">These categories appear in the store and product forms.</p>

            <div className="flex gap-2 mb-5">
              <input
                value={newCategory} onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }}
                placeholder="New category name…"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
              />
              <button onClick={addCategory} disabled={!newCategory.trim()}
                className="px-4 py-2 bg-[#1B3FA8] text-white text-sm font-semibold rounded-lg hover:bg-[#1B3FA8]/90 disabled:opacity-40 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {categories.map((cat, i) => (
                <div key={cat} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <span className="text-sm font-medium text-gray-800">{cat}</span>
                    <span className="text-xs text-gray-400">({products.filter(p => p.category === cat).length} products)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { const c = [...categories]; [c[i], c[i-1]] = [c[i-1], c[i]]; saveCategories(c); }} disabled={i === 0}
                      className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                    <button onClick={() => { const c = [...categories]; [c[i], c[i+1]] = [c[i+1], c[i]]; saveCategories(c); }} disabled={i === categories.length - 1}
                      className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                    <button onClick={() => removeCategory(cat)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No categories yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === "settings" && (
        <div className="space-y-4 max-w-xl">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-1">Tax Settings</h2>
            <p className="text-sm text-gray-500 mb-6">Applied automatically at checkout to all orders.</p>

            <div className="space-y-5">
              {/* Toggle */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Apply Tax to Orders</p>
                  <p className="text-xs text-gray-500 mt-0.5">When enabled, tax is added to every checkout</p>
                </div>
                <button onClick={() => setTaxEnabled(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${taxEnabled ? "bg-[#1B3FA8]" : "bg-gray-200"}`}>
                  <span className={`inline-block w-4 h-4 transform rounded-full bg-white shadow transition-transform ${taxEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {/* Rate */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Tax Rate (%)</label>
                <p className="text-xs text-gray-500 mb-2">Houston, TX standard sales tax rate is 8.25%</p>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" min="0" max="30" value={taxRate} onChange={e => setTaxRate(e.target.value)}
                    className="w-32 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">Preview — $100 order</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>$100.00</span></div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax ({taxRate}%)</span>
                    <span>{taxEnabled ? `$${(100 * parseFloat(taxRate || "0") / 100).toFixed(2)}` : "$0.00"}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                    <span>Total</span>
                    <span>{taxEnabled ? `$${(100 + 100 * parseFloat(taxRate || "0") / 100).toFixed(2)}` : "$100.00"}</span>
                  </div>
                </div>
              </div>

              <button onClick={saveTaxSettings} disabled={savingSettings}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B3FA8] text-white text-sm font-bold rounded-lg hover:bg-[#1B3FA8]/90 disabled:opacity-60 transition-colors">
                {savingSettings ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Settings</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
