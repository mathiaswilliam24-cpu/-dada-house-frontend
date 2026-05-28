"use client";
import { useEffect, useState } from "react";
import { Home, Plus, MapPin } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

type Property = {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  type: string;
  sqft?: number | null;
  yearBuilt?: number | null;
  equipment: string[];
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ address: "", city: "Houston", state: "TX", zipCode: "", type: "Residential" });

  useEffect(() => {
    fetch("/api/portal/properties").then((r) => r.json()).then((d) => {
      setProperties(d.properties ?? []);
      setLoading(false);
    });
  }, []);

  async function addProperty(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/portal/properties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.property) {
      setProperties((prev) => [data.property, ...prev]);
      setShowForm(false);
      setForm({ address: "", city: "Houston", state: "TX", zipCode: "", type: "Residential" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Properties</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your service addresses</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className={buttonVariants({ variant: "default" })}>
          <Plus size={16} className="mr-1.5" />
          Add Property
        </button>
      </div>

      {showForm && (
        <form onSubmit={addProperty} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">New Property</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="123 Main St" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input required value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="77001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option>Residential</option>
                <option>Commercial</option>
                <option>Rental</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className={buttonVariants({ variant: "default" })}>Save Property</button>
            <button type="button" onClick={() => setShowForm(false)} className={buttonVariants({ variant: "outline" })}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {properties.map((prop) => (
            <div key={prop.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Home size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{prop.address}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                    <MapPin size={13} />
                    {prop.city}, {prop.state} {prop.zipCode}
                  </div>
                  <span className="mt-1.5 inline-block text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{prop.type}</span>
                </div>
              </div>
            </div>
          ))}
          {properties.length === 0 && !loading && (
            <div className="sm:col-span-2 bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              No properties added yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
