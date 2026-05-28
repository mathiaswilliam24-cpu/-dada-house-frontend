"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Camera, Loader2, Trash2, ImagePlus } from "lucide-react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

type Photo = { id: string; url: string; category: string; caption: string | null };

const CATEGORIES = [
  { key: "before", label: "Before", color: "bg-blue-100 text-blue-700" },
  { key: "during", label: "During", color: "bg-yellow-100 text-yellow-700" },
  { key: "after", label: "After", color: "bg-green-100 text-green-700" },
  { key: "damage", label: "Damage", color: "bg-red-100 text-red-700" },
  { key: "proof", label: "Proof", color: "bg-purple-100 text-purple-700" },
  { key: "general", label: "General", color: "bg-gray-100 text-gray-700" },
];

export default function JobPhotosPage() {
  const { id } = useParams<{ id: string }>();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("before");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}/photos`)
      .then((r) => r.json())
      .then((d) => { setPhotos(d.photos ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function deletePhoto(photoId: string) {
    if (!confirm("Delete this photo?")) return;
    await fetch(`/api/technician/jobs/${id}/photos/${photoId}`, { method: "DELETE" });
    setPhotos((p) => p.filter((x) => x.id !== photoId));
  }

  async function onUploadComplete(res: { url: string }[]) {
    for (const file of res) {
      const r = await fetch(`/api/technician/jobs/${id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: file.url, category: activeCategory }),
      });
      if (r.ok) {
        const d = await r.json();
        setPhotos((p) => [...p, d.photo]);
      }
    }
    setUploading(false);
  }

  const byCategory = CATEGORIES.reduce<Record<string, Photo[]>>((acc, c) => {
    acc[c.key] = photos.filter((p) => p.category === c.key);
    return acc;
  }, {});

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job Detail</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
          <Camera className="w-5 h-5 text-purple-600" /> Job Photos
        </h1>
        <p className="text-xs text-gray-500">{photos.length} photo{photos.length !== 1 ? "s" : ""} uploaded</p>
      </div>

      {/* Category selector */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Upload as…</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                activeCategory === c.key ? `${c.color} border-current` : "bg-white text-gray-500 border-gray-200"
              }`}
            >
              {c.label}
              {byCategory[c.key].length > 0 && (
                <span className="ml-1 text-[10px]">({byCategory[c.key].length})</span>
              )}
            </button>
          ))}
        </div>
        <div className="pt-2">
          <UploadButton<OurFileRouter, "jobPhotos">
            endpoint="jobPhotos"
            onClientUploadComplete={onUploadComplete}
            onUploadBegin={() => setUploading(true)}
            onUploadError={(err) => { setUploading(false); alert(err.message); }}
            appearance={{
              button: "bg-[#1B3FA8] text-white font-semibold rounded-xl px-4 py-2.5 text-sm w-full after:bg-[#1A3490]",
              allowedContent: "text-xs text-gray-400",
            }}
          />
        </div>
      </div>

      {/* Photos by category */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#1B3FA8]" /></div>
      ) : photos.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <ImagePlus className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No photos yet. Upload before, during, and after photos.</p>
        </div>
      ) : (
        CATEGORIES.filter((c) => byCategory[c.key].length > 0).map((c) => (
          <div key={c.key}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${c.color}`}>{c.label}</span>
              <span className="text-xs text-gray-400">{byCategory[c.key].length} photo{byCategory[c.key].length !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {byCategory[c.key].map((photo) => (
                <div key={photo.id} className="relative group">
                  <a href={photo.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={photo.url}
                      alt={`${c.label} photo`}
                      className="w-full h-28 object-cover rounded-xl"
                    />
                  </a>
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 bg-red-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
