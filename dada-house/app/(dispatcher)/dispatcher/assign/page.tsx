"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { User, CheckCircle, Loader2 } from "lucide-react";

type Tech = { id: string; name: string | null; phone: string | null; technicianProfile?: { specialties: string[] } | null; };
type Appt = { id: string; appointmentNumber: string; service: string; name: string; address: string; technicianId: string | null; };

function AssignContent() {
  const params = useSearchParams();
  const apptId = params.get("id");
  const [appt, setAppt] = useState<Appt | null>(null);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    Promise.all([
      apptId ? fetch(`/api/appointments/${apptId}`).then(r => r.json()) : Promise.resolve(null),
      fetch("/api/admin/users/technicians").then(r => r.json()),
    ]).then(([a, t]) => { setAppt(a); setTechs(t.technicians ?? []); setLoading(false); });
  }, [apptId]);

  async function assign(techId: string) {
    setAssigning(techId);
    await fetch("/api/dispatcher/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: apptId, technicianId: techId }),
    });
    setDone(true);
    setAssigning(null);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;

  if (done) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <CheckCircle className="w-12 h-12 text-green-500" />
      <p className="font-semibold text-gray-900">Technician assigned</p>
      <a href="/dispatcher" className="text-[#F7921A] text-sm hover:underline">Back to schedule</a>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="text-2xl font-bold text-gray-900">Assign Technician</h1></div>
      {appt && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="font-semibold text-blue-900">{appt.service}</p>
          <p className="text-sm text-blue-700">{appt.name} · {appt.address}</p>
          <p className="text-xs text-blue-500 mt-0.5">#{appt.appointmentNumber}</p>
        </div>
      )}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900">Available Technicians</h2>
        {techs.map(tech => (
          <div key={tech.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1B3FA8] rounded-full flex items-center justify-center text-white font-bold">
                {tech.name?.[0] ?? "T"}
              </div>
              <div>
                <p className="font-medium text-gray-900">{tech.name}</p>
                {tech.phone && <p className="text-xs text-gray-500">{tech.phone}</p>}
                {tech.technicianProfile?.specialties && tech.technicianProfile.specialties.length > 0 && (
                  <p className="text-xs text-gray-400">{tech.technicianProfile.specialties.slice(0,3).join(" · ")}</p>
                )}
              </div>
            </div>
            <button onClick={() => assign(tech.id)} disabled={!!assigning}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${appt?.technicianId === tech.id ? "bg-green-100 text-green-700" : "bg-[#1B3FA8] text-white hover:bg-[#1A3490]"} disabled:opacity-60`}>
              {assigning === tech.id ? "Assigning…" : appt?.technicianId === tech.id ? "Assigned" : "Assign"}
            </button>
          </div>
        ))}
        {techs.length === 0 && <div className="text-center text-gray-400 py-8">No technicians available</div>}
      </div>
    </div>
  );
}

export default function DispatcherAssignPage() {
  return <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>}><AssignContent /></Suspense>;
}