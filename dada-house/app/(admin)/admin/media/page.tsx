"use client";
import { useEffect, useState } from "react";
import {
  FolderOpen, Upload, Image as ImageIcon, FileText, Video,
  Receipt, Shield, Link as LinkIcon, Loader2, Search, Filter,
} from "lucide-react";

type MediaItem = {
  id: string;
  url: string;
  type: "photo" | "document" | "video" | "receipt" | "warranty";
  linkedTo: "appointment" | "customer" | "invoice" | null;
  linkedId: string | null;
  linkedLabel: string | null;
  uploadedAt: string;
  name: string;
};

// Media is stored across various models (appointments.photos[], invoices.pdfUrl, etc.)
// This page aggregates them from the DB via the API.
type AggregatedFile = {
  url: string; source: string; label: string; date: string; category: string;
};

const CATEGORIES = ["ALL", "Job Photos", "Invoice PDFs", "Gallery Images", "Review Photos"];

const catIcon: Record<string, React.ReactNode> = {
  "Job Photos":    <ImageIcon className="w-4 h-4" />,
  "Invoice PDFs":  <FileText className="w-4 h-4" />,
  "Gallery Images":<ImageIcon className="w-4 h-4" />,
  "Review Photos": <ImageIcon className="w-4 h-4" />,
};

export default function AdminMediaPage() {
  const [files, setFiles] = useState<AggregatedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("ALL");
  const [q, setQ] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/admin/media");
      const data = await res.json();
      setFiles(data.files ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = files.filter(f => {
    const matchCat = category === "ALL" || f.category === category;
    const matchQ = !q || f.label.toLowerCase().includes(q.toLowerCase()) || f.url.toLowerCase().includes(q.toLowerCase());
    return matchCat && matchQ;
  });

  const isImage = (url: string) => /\.(png|jpg|jpeg|gif|webp|avif)/i.test(url);
  const isPdf   = (url: string) => /\.pdf/i.test(url);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media & Documents</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {files.length} file{files.length !== 1 ? "s" : ""} across all records
          </p>
        </div>
        <a
          href="/admin/appointments"
          className="flex items-center gap-2 px-4 py-2 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold hover:bg-[#1A3490] transition-colors"
        >
          <Upload className="w-4 h-4" /> Upload via Appointment
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Job Photos",     count: files.filter(f=>f.category==="Job Photos").length,     icon: ImageIcon, color: "text-blue-600 bg-blue-50" },
          { label: "Invoice PDFs",   count: files.filter(f=>f.category==="Invoice PDFs").length,   icon: FileText,  color: "text-orange-600 bg-orange-50" },
          { label: "Gallery Images", count: files.filter(f=>f.category==="Gallery Images").length, icon: ImageIcon, color: "text-purple-600 bg-purple-50" },
          { label: "Review Photos",  count: files.filter(f=>f.category==="Review Photos").length,  icon: ImageIcon, color: "text-green-600 bg-green-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-gray-900">{s.count}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-gray-200 p-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by label or URL…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F7921A]/30 focus:border-[#F7921A]"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === c ? "bg-[#1B3FA8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No files found</p>
          <p className="text-gray-300 text-sm mt-1">
            Files are uploaded via appointments, invoices, and gallery projects
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
            >
              {/* Preview */}
              <div className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden">
                {isImage(f.url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.url}
                    alt={f.label}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : isPdf(f.url) ? (
                  <FileText className="w-10 h-10 text-orange-400" />
                ) : (
                  <FolderOpen className="w-10 h-10 text-gray-300" />
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white rounded-full shadow"
                  >
                    <LinkIcon className="w-4 h-4 text-gray-700" />
                  </a>
                </div>
              </div>
              {/* Info */}
              <div className="p-2.5">
                <p className="text-xs font-medium text-gray-800 truncate">{f.label}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-400">{f.category}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(f.date).toLocaleDateString()}
                  </span>
                </div>
                {f.source && (
                  <p className="text-[10px] text-blue-500 truncate mt-0.5">{f.source}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Upload className="w-4 h-4" /> How to upload files
        </h3>
        <ul className="space-y-1.5 text-sm text-blue-700">
          <li className="flex items-start gap-2">
            <ImageIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <span><strong>Job photos:</strong> Upload via the booking form or appointment detail page</span>
          </li>
          <li className="flex items-start gap-2">
            <FileText className="w-4 h-4 shrink-0 mt-0.5" />
            <span><strong>Invoice PDFs:</strong> Attach when creating/editing an invoice in Appointment Actions</span>
          </li>
          <li className="flex items-start gap-2">
            <ImageIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <span><strong>Gallery images:</strong> Upload via Gallery → Add Project</span>
          </li>
          <li className="flex items-start gap-2">
            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
            <span><strong>Warranty docs:</strong> Managed in the customer portal under Properties</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
