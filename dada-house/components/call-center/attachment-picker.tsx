"use client";

import { useRef, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing-components";
import { Paperclip, Loader2, X, Film, FileText } from "lucide-react";

function isImage(url: string) {
  return /\.(jpe?g|png|gif|webp|heic)(\?|$)/i.test(url);
}
function isVideo(url: string) {
  return /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url);
}
function fileName(url: string) {
  try {
    return decodeURIComponent(url.split("/").pop() ?? "file");
  } catch {
    return "file";
  }
}

/**
 * Inline "attach a file" control for a message/email composer — a paperclip
 * button instead of job-media-uploader's big dropzone card, since this lives
 * next to a small textarea, not a standalone form section.
 */
export function AttachmentPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const { startUpload } = useUploadThing("messageAttachments", {
    onClientUploadComplete: (res) => {
      setUploading(false);
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
      setError(err.message);
    },
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);
    await startUpload(Array.from(files));
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {value.map((url) => (
            <div key={url} className="relative group">
              {isImage(url) ? (
                <img src={url} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
              ) : isVideo(url) ? (
                <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center border border-gray-200">
                  <Film className="w-5 h-5 text-white" />
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1.5 h-12 rounded-lg bg-gray-100 border border-gray-200 max-w-[120px]">
                  <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="text-[10px] text-gray-600 truncate">{fileName(url)}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((u) => u !== url))}
                className="absolute -top-1.5 -right-1.5 bg-gray-700 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Attach photo, video, or document"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-[#1B3FA8] hover:bg-blue-50 disabled:opacity-50 transition-colors"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
      </button>
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}
