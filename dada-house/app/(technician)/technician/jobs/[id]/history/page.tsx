"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Loader2, Star, FileText, Package, Receipt, Camera, StickyNote, FolderKanban, ClipboardList } from "lucide-react";

type History = {
  previousEstimates: number;
  recurringServices: number;
  previousInvoices: number;
  photosAndVideos: number;
  notes: number;
  previousForms: number;
  existingEquipment: number;
  projects: number;
};

export default function TechJobHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/technician/jobs/${id}/history`)
      .then((r) => r.json())
      .then((d) => { if (d.history) setHistory(d.history); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;
  }
  if (!history) {
    return <div className="text-center py-16 text-gray-400">History not found</div>;
  }

  const rows: { label: string; count: number; icon: typeof Star; href?: string }[] = [
    { label: "Previous estimates", count: history.previousEstimates, icon: Star, href: "/technician/estimates" },
    { label: "Recurring services", count: history.recurringServices, icon: FileText },
    { label: "Existing Equipment", count: history.existingEquipment, icon: Package, href: `/technician/jobs/${id}/equipment` },
    { label: "Previous invoices", count: history.previousInvoices, icon: Receipt, href: "/technician/invoices" },
    { label: "Photos & videos", count: history.photosAndVideos, icon: Camera, href: `/technician/jobs/${id}/photos` },
    { label: "Notes", count: history.notes, icon: StickyNote },
    { label: "Projects", count: history.projects, icon: FolderKanban, href: `/technician/jobs/${id}/projects` },
    { label: "Previous forms", count: history.previousForms, icon: ClipboardList, href: `/technician/jobs/${id}/forms` },
  ];

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">History</h1>
        <p className="text-xs text-gray-400">Across all of this customer's past jobs</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {rows.map(({ label, count, icon: Icon, href }) => {
          const content = (
            <>
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-800">{label}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="text-sm">{count}</span>
                {href && <ChevronRight className="w-4 h-4" />}
              </div>
            </>
          );
          return href ? (
            <Link key={label} href={href} className="flex items-center justify-between p-4">{content}</Link>
          ) : (
            <div key={label} className="flex items-center justify-between p-4">{content}</div>
          );
        })}
      </div>
    </div>
  );
}
