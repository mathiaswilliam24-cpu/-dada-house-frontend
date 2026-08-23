"use client";

import { useRef, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing-components";
import { ImagePlus, Loader2, X, Film } from "lucide-react";

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
}

function isVideo(url: string) {
  return /\.(mp4|mov|avi|webm|mkv)/i.test(url);
}

export default function JobMediaUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const { startUpload } = useUploadThing("jobPhotos", {
    onUploadProgress: (p) => setProgress(p),
    onClientUploadComplete: (res) => {
      setUploading(false);
      setProgress(0);
      if (res?.length) {
        const urls = res
          .map((f) => {
            const r = f as unknown as Record<string, string>;
            return r.ufsUrl ?? r.url ?? "";
          })
          .filter(Boolean);
        onChange([...value, ...urls]);
      }
    },
    onUploadError: (err) => {
      setUploading(false);
      setProgress(0);
      setUploadError(err.message);
    },
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError("");
    setUploading(true);
    await startUpload(Array.from(files));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url) => (
            <div
              key={url}
              className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square"
            >
              {isVideo(url) ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white">
                  <Film className="w-8 h-8 opacity-70" />
                  <span className="text-[10px] mt-1 opacity-60">video</span>
                </div>
              ) : (
                <img src={url} alt="" className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((u) => u !== url))}
                className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {uploading ? (
        <div className="border-2 border-[#1B3FA8] border-dashed rounded-xl p-4 text-center bg-blue-50">
          <Loader2 className="w-6 h-6 text-[#1B3FA8] mx-auto mb-1.5 animate-spin" />
          <p className="text-sm font-medium text-[#1B3FA8]">Uploading… {progress}%</p>
          <div className="mt-2 h-1.5 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1B3FA8] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.value = "";
              inputRef.current.click();
            }
          }}
          className="w-full border-2 border-dashed border-slate-300 hover:border-[#1B3FA8] hover:bg-blue-50 rounded-xl p-4 text-center transition-all group"
        >
          <ImagePlus className="w-6 h-6 text-slate-400 group-hover:text-[#1B3FA8] mx-auto mb-1 transition-colors" />
          <p className="text-sm font-medium text-slate-600 group-hover:text-[#1B3FA8]">
            Add photos & videos
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Images up to 16 MB · Videos up to 64 MB
          </p>
        </button>
      )}
      {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
    </div>
  );
}
