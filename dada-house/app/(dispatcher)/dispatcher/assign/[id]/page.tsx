"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";

type Appointment = { id: string; service: string; name: string; address: string; city: string; preferredDate?: string; appointmentNumber: string };
type Technician = { id: string; name: string };

export default function AssignTechnicianPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTech, setSelectedTech] = useState("");
  const [eta, setEta] = useState("");
  const [saving, setSaving] = useState(false);
  const [appt, setAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    fetch("/api/dispatcher/requests")
      .then((r) => r.json())
      .then((d) => {
        const found = d.appointments?.find((a: Appointment) => a.id === id);
        if (found) setAppt(found);
      });
    fetch("/api/admin/users/technicians")
      .then((r) => r.json())
      .then((d) => setTechnicians(d.technicians ?? []));
  }, [id]);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTech) return;
    setSaving(true);
    const res = await fetch("/api/dispatcher/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: id, technicianId: selectedTech, eta: eta || undefined }),
    });
    if (res.ok) router.push("/dispatcher/requests");
    else setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <a href="/dispatcher/requests" className="text-sm text-gray-500">← Requests</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Assign Technician</h1>
      </div>

      {appt && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="font-semibold text-gray-900">{appt.service}</p>
          <p className="text-sm text-gray-500">{appt.appointmentNumber} · {appt.name}</p>
          <p className="text-sm text-gray-600 mt-1">{appt.address}, {appt.city}</p>
        </div>
      )}

      <form onSubmit={assign} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Technician</label>
          <select
            required
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Choose a technician…</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ETA (optional)</label>
          <input
            type="datetime-local"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" disabled={saving || !selectedTech} className={buttonVariants({ variant: "default" })}>
          {saving ? "Assigning…" : "Assign & Notify Technician"}
        </button>
      </form>
    </div>
  );
}
