"use client";
import { useCallback, useEffect, useState } from "react";

export type LineItem = { desc: string; rate: number; qty: number; amount: number };

export function useEstimateItems(estimateId: string | null) {
  const [items, setItems] = useState<LineItem[]>([]);
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!estimateId) return;
    fetch(`/api/technician/estimates/${estimateId}`)
      .then((r) => r.json())
      .then((d) => setItems(d.estimate?.lineItems ?? []))
      .catch(() => {});
  }, [estimateId]);

  useEffect(() => { load(); }, [load]);

  async function addItem(item: { name: string; price: number }) {
    if (!estimateId) return false;
    const res = await fetch(`/api/technician/estimates/${estimateId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ desc: item.name, rate: item.price, qty: 1 }),
    });
    if (res.ok) load();
    return res.ok;
  }

  async function removeItem(index: number) {
    if (!estimateId || removingIndex !== null) return;
    setRemovingIndex(index);
    const res = await fetch(`/api/technician/estimates/${estimateId}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index }),
    });
    if (res.ok) load();
    setRemovingIndex(null);
  }

  return { items, addItem, removeItem, removingIndex, reload: load };
}
