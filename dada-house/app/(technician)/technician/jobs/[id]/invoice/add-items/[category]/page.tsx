"use client";
import { useMemo, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAddableItems } from "@/lib/hooks/use-addable-items";
import { useEstimateItems } from "@/lib/hooks/use-estimate-items";

const PLACEHOLDER_CATEGORIES = new Set(["Training", "Service Discounts and Coupons"]);

function CategoryItemsInner() {
  const { id, category } = useParams<{ id: string; category: string }>();
  const categoryName = decodeURIComponent(category);
  const searchParams = useSearchParams();
  const estimateId = searchParams.get("estimateId");

  const { allAddable, loading } = useAddableItems(id);
  const { addItem } = useEstimateItems(estimateId);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const items = useMemo(() => allAddable.filter((i) => i.category === categoryName), [allAddable, categoryName]);

  async function handleAdd(item: { id: string; name: string; price: number }) {
    if (!estimateId || addingId) return;
    setAddingId(item.id);
    const ok = await addItem(item);
    if (ok) setAddedIds((prev) => new Set(prev).add(item.id));
    setAddingId(null);
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}/invoice/add-items?estimateId=${estimateId ?? ""}`} className="text-sm text-gray-500">← Categories</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">{categoryName}</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#1B3FA8]" /></div>
      ) : PLACEHOLDER_CATEGORIES.has(categoryName) && items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No content yet for {categoryName}.</p>
          <p className="text-xs text-gray-400 mt-1">This will fill in once real content is added for this category.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {items.map((item) => {
            const added = addedIds.has(item.id);
            return (
              <div key={item.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{formatCurrency(item.price)}</p>
                </div>
                <button
                  onClick={() => handleAdd(item)}
                  disabled={addingId === item.id || added || !estimateId}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${added ? "bg-green-50 text-green-700" : "bg-[#1B3FA8] text-white"} disabled:opacity-60`}
                >
                  {addingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : added ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  {added ? "Added" : "Add"}
                </button>
              </div>
            );
          })}
          {items.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No items in this category.</p>}
        </div>
      )}
    </div>
  );
}

export default function CategoryItemsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>}>
      <CategoryItemsInner />
    </Suspense>
  );
}
