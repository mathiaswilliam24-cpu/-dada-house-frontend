"use client";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

// Without this, an uncaught client-side render error anywhere under
// /technician unmounts the whole tree and leaves a blank white page with no
// way to recover except force-quitting the app — exactly what happened to a
// technician mid-job. This keeps the header/bottom nav (rendered by the
// layout, which sits above this boundary) alive so he can still navigate
// away even if one screen breaks.
export default function TechnicianError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <div>
        <p className="font-semibold text-gray-900">Something went wrong</p>
        <p className="text-sm text-gray-500 mt-1">This screen hit an error. Your saved job data is safe — try again.</p>
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => reset()}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold"
        >
          <RotateCcw className="w-4 h-4" /> Try Again
        </button>
        <a
          href="/technician"
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold"
        >
          <Home className="w-4 h-4" /> Back to Jobs
        </a>
      </div>
    </div>
  );
}
