"use client";

import type { ScheduleInput, PropertyInput } from "../EnrollmentWizard";

const TIME_WINDOWS = [
  "8:00 AM – 10:00 AM",
  "10:00 AM – 12:00 PM",
  "12:00 PM – 2:00 PM",
  "2:00 PM – 4:00 PM",
  "4:00 PM – 6:00 PM",
];

interface Props {
  schedules: ScheduleInput[];
  properties: PropertyInput[];
  onChange: (s: ScheduleInput[]) => void;
}

function ScheduleCard({
  schedule,
  property,
  onUpdate,
}: {
  schedule: ScheduleInput;
  property: PropertyInput;
  onUpdate: (s: ScheduleInput) => void;
}) {
  const propLabel = property.nickname || property.address || "Property";
  const today = new Date();
  const minDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <p className="font-bold text-[#0A1628] text-sm">{propLabel}</p>
      <p className="text-slate-400 text-xs">
        {property.address}{property.city ? `, ${property.city}` : ""} · {property.systemCount} system{property.systemCount !== 1 ? "s" : ""}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Preferred Date</label>
          <input
            type="date"
            min={minDate}
            value={schedule.preferredDate}
            onChange={e => onUpdate({ ...schedule, preferredDate: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1B3FA8] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Preferred Time Window</label>
          <select
            value={schedule.preferredTime}
            onChange={e => onUpdate({ ...schedule, preferredTime: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1B3FA8]"
          >
            <option value="">Any time</option>
            {TIME_WINDOWS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Notes for Technician (optional)</label>
        <textarea
          value={schedule.notes}
          onChange={e => onUpdate({ ...schedule, notes: e.target.value })}
          rows={2}
          placeholder="Pets, parking info, special access instructions..."
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1B3FA8] resize-none transition-colors"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
        <input
          type="checkbox"
          checked={schedule.tenantAccess}
          onChange={e => onUpdate({ ...schedule, tenantAccess: e.target.checked })}
          className="accent-[#1B3FA8]"
        />
        A tenant will provide access to the unit
      </label>
    </div>
  );
}

export default function StepSchedule({ schedules, properties, onChange }: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-[#0A1628] mb-2">Schedule Your First Tune-Up</h2>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Optional — select a preferred date for each property. We&apos;ll confirm availability after enrollment.
        </p>
      </div>

      <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
        <strong>Note:</strong> Requested appointments are confirmed by our scheduling team after payment. You&apos;ll receive a confirmation SMS and email within 24 hours.
      </div>

      <div className="space-y-4">
        {schedules.map((schedule, i) => {
          const prop = properties.find(p => p.id === schedule.propertyId) ?? properties[i];
          if (!prop) return null;
          return (
            <ScheduleCard
              key={schedule.propertyId}
              schedule={schedule}
              property={prop}
              onUpdate={updated => {
                const next = [...schedules];
                next[i] = updated;
                onChange(next);
              }}
            />
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
        <strong>Spring vs Fall:</strong> Your first tune-up will be the seasonal service appropriate for the time of year.
        Spring/Summer = AC cooling tune-up · Fall/Winter = Heating tune-up.
      </div>
    </div>
  );
}
