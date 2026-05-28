"use client";

import { useRef, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing-components";
import { ImagePlus, Loader2, X } from "lucide-react";

interface Props {
  endpoint: "galleryPhoto" | "technicianPhoto";
  onUpload: (urls: string[]) => void;
  onError?: (msg: string) => void;
  maxFiles?: number;
  remaining?: number;
}

export default function PhotoUploader({ endpoint, onUpload, onError, maxFiles = 10, remaining = 10 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const { startUpload } = useUploadThing(endpoint, {
    onUploadProgress: (p) => setProgress(p),
    onClientUploadComplete: (res) => {
      setUploading(false);
      setProgress(0);
      if (res?.length) {
        const urls = res.map((f) => {
          const r = f as unknown as Record<string, string>;
          return r.ufsUrl ?? r.url ?? "";
        }).filter(Boolean);
        onUpload(urls);
      }
    },
    onUploadError: (err) => {
      setUploading(false);
      setProgress(0);
      onError?.(err.message);
    },
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).slice(0, remaining);
    setUploading(true);
    await startUpload(arr);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={maxFiles > 1}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {uploading ? (
        <div className="border-2 border-[#1B3FA8] border-dashed rounded-xl p-6 text-center bg-blue-50">
          <Loader2 size={28} className="text-[#1B3FA8] mx-auto mb-2 animate-spin" />
          <p className="text-sm font-semibold text-[#1B3FA8]">Uploading… {progress}%</p>
          <div className="mt-3 h-2 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1B3FA8] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { if (inputRef.current) { inputRef.current.value = ""; inputRef.current.click(); } }}
          className="w-full border-2 border-dashed border-slate-300 hover:border-[#1B3FA8] hover:bg-blue-50 rounded-xl p-6 text-center transition-all group"
        >
          <ImagePlus size={28} className="text-slate-400 group-hover:text-[#1B3FA8] mx-auto mb-2 transition-colors" />
          <p className="text-sm font-semibold text-slate-600 group-hover:text-[#1B3FA8] transition-colors">
            Click to choose photos
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Up to {remaining} photo{remaining !== 1 ? "s" : ""} · Max 12 MB each · JPG, PNG, WEBP
          </p>
        </button>
      )}
    </div>
  );
}
