"use client";
import { useState, useEffect } from "react";
import { Clock, LogIn, LogOut } from "lucide-react";

export default function TechClockPage() {
  const [now, setNow] = useState(new Date());
  const [clocked, setClocked] = useState(false);
  const [clockTime, setClockTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (clocked && clockTime) {
      const t = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(clockTime).getTime()) / 1000)), 1000);
      return () => clearInterval(t);
    }
  }, [clocked, clockTime]);

  async function toggle() {
    setSaving(true);
    const res = await fetch("/api/technician/clock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: clocked ? "out" : "in" }) });
    const d = await res.json();
    if (res.ok) { setClocked(!clocked); setClockTime(clocked ? null : new Date().toISOString()); setElapsed(0); }
    setSaving(false);
  }

  const fmt = (s: number) => { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = s%60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; };

  return (
    <div className="space-y-6 text-center">
      <div><h1 className="text-xl font-bold text-gray-900">Clock In / Out</h1><p className="text-sm text-gray-500">Track your work hours</p></div>
      <div className="bg-[#1B3FA8] rounded-3xl p-8 text-white">
        <p className="text-5xl font-black font-mono">{now.toLocaleTimeString()}</p>
        <p className="text-blue-200 mt-2">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        {clocked && <p className="text-blue-100 text-2xl font-mono mt-4">{fmt(elapsed)}</p>}
      </div>
      <button onClick={toggle} disabled={saving}
        className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-60 ${clocked ? "bg-red-500 text-white hover:bg-red-600" : "bg-green-500 text-white hover:bg-green-600"}`}>
        {clocked ? <><LogOut className="w-6 h-6" />Clock Out</> : <><LogIn className="w-6 h-6" />Clock In</>}
      </button>
      {clocked && <p className="text-sm text-gray-500">Clocked in at {clockTime ? new Date(clockTime).toLocaleTimeString() : "--"}</p>}
    </div>
  );
}