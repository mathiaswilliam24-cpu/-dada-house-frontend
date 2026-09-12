"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Wrench, Plus, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Equipment = {
  id: string; type: string; makeModel: string | null; serialNumber: string | null;
  installDate: string | null; age: string | null; location: string | null; notes: string | null;
  createdAt: string;
};

const EQUIPMENT_TYPES = ["HVAC System", "Furnace", "Water Heater", "Heat Pump", "Thermostat", "Ductwork", "Other"];

export default function TechEquipmentPage() {
  const { id } = useParams<{ id: string }>();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState(EQUIPMENT_TYPES[0]);
  const [makeModel, setMakeModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [installDate, setInstallDate] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}/equipment`)
      .then((r) => r.json())
      .then((d) => { if (d.equipment) setEquipment(d.equipment); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/technician/jobs/${id}/equipment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, makeModel, serialNumber, installDate, age, location, notes }),
    });
    if (res.ok) {
      setType(EQUIPMENT_TYPES[0]); setMakeModel(""); setSerialNumber("");
      setInstallDate(""); setAge(""); setLocation(""); setNotes("");
      setShowForm(false);
      load();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job</Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-xl font-bold text-gray-900">Existing Equipment</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B3FA8] text-white rounded-lg text-sm font-semibold"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "Add"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
            {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={makeModel} onChange={(e) => setMakeModel(e.target.value)} placeholder="Make / Model" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          <input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Serial Number" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} placeholder="Install Date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age (e.g. 5 years)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Attic, Backyard)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
          <button type="submit" disabled={saving} className="w-full py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold disabled:opacity-60">
            {saving ? "Saving…" : "Save Equipment"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#1B3FA8]" /></div>
      ) : equipment.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">No equipment on file for this customer yet.</p>
      ) : (
        <div className="space-y-2">
          {equipment.map((eq) => (
            <div key={eq.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Wrench className="w-4 h-4 text-[#1B3FA8]" />
                <p className="font-semibold text-gray-900 text-sm">{eq.type}</p>
              </div>
              {eq.makeModel && <p className="text-sm text-gray-700">{eq.makeModel}</p>}
              <div className="flex flex-wrap gap-x-4 text-xs text-gray-500 mt-1.5">
                {eq.serialNumber && <span>SN: {eq.serialNumber}</span>}
                {eq.age && <span>Age: {eq.age}</span>}
                {eq.installDate && <span>Installed: {formatDate(eq.installDate)}</span>}
                {eq.location && <span>{eq.location}</span>}
              </div>
              {eq.notes && <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-2">{eq.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
