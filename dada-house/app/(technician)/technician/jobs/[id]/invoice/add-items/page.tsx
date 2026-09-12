"use client";
import { useMemo, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Search, ChevronRight, Plus, Check, ChevronUp, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAddableItems } from "@/lib/hooks/use-addable-items";
import { useEstimateItems } from "@/lib/hooks/use-estimate-items";

// Categories with no real DADA HOUSE content yet — each still gets its own
// real page (matching ServiceTitan's pattern of every tile being clickable),
// just showing an honest empty state until the content exists.
const PLACEHOLDER_CATEGORIES = ["Training", "Service Discounts and Coupons"];

// Pure navigation tiles — they don't list items, they open an existing page.
const LINK_CATEGORIES = [
  { name: "Parts Ordering Forms", hrefSuffix: "purchase-orders" },
  { name: "Service Forms", hrefSuffix: "invoice/add-items/service-forms" },
];

function AddItemsInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const estimateId = searchParams.get("estimateId");

  const { allAddable, categories, loading } = useAddableItems(id);
  const { items: selectedItems, addItem, removeItem, removingIndex } = useEstimateItems(estimateId);
  const [search, setSearch] = useState("");
  const [showSelected, setShowSelected] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  async function handleAdd(item: { id: string; name: string; price: number }) {
    if (addingId) return;
    setAddingId(item.id);
    const ok = await addItem(item);
    if (ok) setAddedIds((prev) => new Set(prev).add(item.id));
    setAddingId(null);
  }

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allAddable.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }, [allAddable, search]);

  if (!estimateId) {
    return (
      <div className="text-center py-16 text-sm text-gray-400">
        No invoice selected. <Link href={`/technician/jobs/${id}/invoice`} className="text-[#1B3FA8] font-semibold">Go back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <Link href={`/technician/jobs/${id}/invoice`} className="text-sm text-gray-500">← Invoice</Link>
        <button onClick={() => router.push(`/technician/jobs/${id}/invoice`)} className="text-sm font-bold text-[#1B3FA8]">Done</button>
      </div>
      <h1 className="text-xl font-bold text-gray-900">{search.trim() ? "Search Results" : "Categories"}</h1>

      {selectedItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200">
          <button onClick={() => setShowSelected((v) => !v)} className="flex items-center justify-between w-full px-4 py-3">
            <span className="text-sm text-gray-500">
              {selectedItems.length} item{selectedItems.length === 1 ? "" : "s"} · {formatCurrency(selectedItems.reduce((s, i) => s + i.amount, 0))}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-[#1B3FA8]">
              {showSelected ? "Hide" : "Show"}
              {showSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </button>
          {showSelected && (
            <div className="grid grid-cols-2 gap-3 px-4 pb-4">
              {selectedItems.map((item, i) => (
                <div key={i} className="text-sm">
                  <p className="text-gray-800 truncate">{item.desc}</p>
                  <p className="text-gray-500">{formatCurrency(item.amount)}</p>
                  <button
                    onClick={() => removeItem(i)}
                    disabled={removingIndex === i}
                    className="text-xs font-bold text-red-600 disabled:opacity-50 mt-0.5"
                  >
                    {removingIndex === i ? "Removing…" : "REMOVE"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items"
          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1B3FA8]"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#1B3FA8]" /></div>
      ) : search.trim() ? (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {searchResults.map((item) => {
            const added = addedIds.has(item.id);
            return (
              <div key={item.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.category} · {formatCurrency(item.price)}</p>
                </div>
                <button
                  onClick={() => handleAdd(item)}
                  disabled={addingId === item.id || added}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${added ? "bg-green-50 text-green-700" : "bg-[#1B3FA8] text-white"} disabled:opacity-60`}
                >
                  {addingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : added ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  {added ? "Added" : "Add"}
                </button>
              </div>
            );
          })}
          {searchResults.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No items found.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {categories.map((c) => (
            <Link
              key={c.name}
              href={`/technician/jobs/${id}/invoice/add-items/${encodeURIComponent(c.name)}?estimateId=${estimateId}`}
              className="flex items-center justify-between p-4 bg-[#0D1D5E] text-white rounded-2xl text-left"
            >
              <span className="text-sm font-semibold">{c.name}</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </Link>
          ))}
          {PLACEHOLDER_CATEGORIES.map((name) => (
            <Link
              key={name}
              href={`/technician/jobs/${id}/invoice/add-items/${encodeURIComponent(name)}?estimateId=${estimateId}`}
              className="flex items-center justify-between p-4 bg-[#0D1D5E]/60 text-white rounded-2xl text-left"
            >
              <span className="text-sm font-semibold">{name}</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </Link>
          ))}
          {LINK_CATEGORIES.map((c) => (
            <Link
              key={c.name}
              href={`/technician/jobs/${id}/${c.hrefSuffix}?estimateId=${estimateId}`}
              className="flex items-center justify-between p-4 bg-gray-600 text-white rounded-2xl text-left"
            >
              <span className="text-sm font-semibold">{c.name}</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AddItemsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>}>
      <AddItemsInner />
    </Suspense>
  );
}
