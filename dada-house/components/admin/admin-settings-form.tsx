"use client";

import { useState } from "react";
import { Save } from "lucide-react";

interface Props {
  settings: Record<string, string>;
}

const FIELDS = [
  { key: "business_hours", label: "Business Hours", placeholder: "Mon-Fri 8am-6pm, Sat 9am-4pm" },
  { key: "service_areas", label: "Service Areas", placeholder: "Houston, Katy, Sugar Land, Pearland..." },
  { key: "announcement", label: "Announcement Bar Text", placeholder: "Special promotion or message..." },
  { key: "booking_notice", label: "Booking Notice (hours)", placeholder: "24" },
];

export function AdminSettingsForm({ settings }: Props) {
  const [values, setValues] = useState<Record<string, string>>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
          <input
            value={values[key] ?? ""}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [key]: e.target.value }))
            }
            placeholder={placeholder}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F7921A]/30 focus:border-[#F7921A]"
          />
        </div>
      ))}

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          Settings saved successfully!
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#1B3FA8] text-white rounded-lg text-sm font-medium hover:bg-[#1B3FA8]/90 transition-colors disabled:opacity-60"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
