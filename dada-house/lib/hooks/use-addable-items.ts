"use client";
import { useEffect, useMemo, useState } from "react";

export type AddableItem = { id: string; name: string; category: string; price: number };

type PriceBookItem = { id: string; category: string; name: string; description: string | null; price: number };
type MaintenancePlan = { id: string; name: string; monthlyPrice: number; annualPrice: number };

/** Shared data source for the technician "Add Items" flow — real DADA HOUSE
 *  data only (price book parts, active maintenance plans, this job's
 *  diagnostic fee). Categories with no real content yet (Training, Discounts
 *  and Coupons, warranty pricebooks) are added separately by the pages that
 *  render them, once their content exists. */
export function useAddableItems(jobId: string) {
  const [priceBookItems, setPriceBookItems] = useState<PriceBookItem[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [diagnosticFee, setDiagnosticFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/price-book").then((r) => r.json()),
      fetch("/api/technician/maintenance-plans").then((r) => r.json()),
      fetch(`/api/technician/jobs/${jobId}`).then((r) => r.json()),
    ])
      .then(([pb, mp, job]) => {
        setPriceBookItems(pb.items ?? []);
        setPlans(mp.plans ?? []);
        setDiagnosticFee(job.job?.diagnosticFee ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [jobId]);

  const planItems: AddableItem[] = useMemo(() => plans.flatMap((p) => [
    { id: `${p.id}-monthly`, name: `${p.name} Maintenance Plan — Monthly`, category: "Comfort Protection Plans", price: p.monthlyPrice },
    { id: `${p.id}-annual`, name: `${p.name} Maintenance Plan — Annual`, category: "Comfort Protection Plans", price: p.annualPrice },
  ]), [plans]);

  const diagnosticItems: AddableItem[] = useMemo(
    () => (diagnosticFee ? [{ id: "diagnostic-fee", name: "Diagnostic Fee", category: "Service Diagnostic Fees", price: diagnosticFee }] : []),
    [diagnosticFee]
  );

  const pricebookAsAddable: AddableItem[] = useMemo(
    () => priceBookItems.map((i) => ({ id: i.id, name: i.name, category: i.category, price: i.price })),
    [priceBookItems]
  );

  const allAddable = useMemo(
    () => [...pricebookAsAddable, ...planItems, ...diagnosticItems],
    [pricebookAsAddable, planItems, diagnosticItems]
  );

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of allAddable) map.set(item.category, (map.get(item.category) ?? 0) + 1);
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [allAddable]);

  return { allAddable, categories, loading };
}
