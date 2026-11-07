"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { HvacSystemInput, PropertyInput } from "../EnrollmentWizard";

const COOLING_TYPES = ["Central AC", "Heat Pump (Cooling)", "Ductless Mini-Split", "Packaged Unit", "Window/Room AC", "Evaporative Cooler", "Other"];
const HEATING_TYPES = ["Gas Furnace", "Electric Furnace", "Heat Pump (Heating)", "Boiler", "Electric Baseboard", "Other"];
const CONDITIONS = ["Excellent", "Good", "Fair", "Poor", "Unknown"];
const SYSTEM_AGES = ["Less than 2 years", "2-5 years", "5-10 years", "10-15 years", "15-20 years", "More than 20 years", "Unknown"];

interface Props {
  systems: HvacSystemInput[];
  properties: PropertyInput[];
  onChange: (systems: HvacSystemInput[]) => void;
  makeDefault: (propertyId: string) => HvacSystemInput;
}

function SystemCard({
  sys,
  propName,
  sysIndex,
  onUpdate,
}: {
  sys: HvacSystemInput;
  propName: string;
  sysIndex: number;
  onUpdate: (s: HvacSystemInput) => void;
}) {
  const [expanded, setExpanded] = useState(sysIndex === 0);

  if (sys.unknownDetails) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#0A1628] text-sm">{sys.nickname || `System ${sysIndex + 1}`}</p>
            <p className="text-slate-400 text-xs">{propName}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Details unknown</span>
            <button
              onClick={() => onUpdate({ ...sys, unknownDetails: false })}
              className="text-xs text-[#1B3FA8] hover:underline font-semibold"
            >
              Add details
            </button>
          </div>
        </div>
      </div>
    );
  }

  function sel(key: keyof HvacSystemInput, label: string, options: string[]) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
        <select
          value={sys[key] as string}
          onChange={e => onUpdate({ ...sys, [key]: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1B3FA8]"
        >
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  function txt(key: keyof HvacSystemInput, label: string, placeholder?: string) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
        <input
          type="text"
          placeholder={placeholder}
          value={sys[key] as string}
          onChange={e => onUpdate({ ...sys, [key]: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1B3FA8] transition-colors"
        />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="text-left">
          <p className="font-bold text-[#0A1628] text-sm">{sys.nickname || `System ${sysIndex + 1}`}</p>
          <p className="text-slate-400 text-xs">{propName} · {sys.coolingType}</p>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
          {txt("nickname", "System Nickname (optional)", "e.g. Upstairs AC, Master Bedroom")}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sel("coolingType", "Cooling Type", COOLING_TYPES)}
            {sel("heatingType", "Heating Type", HEATING_TYPES)}
            {txt("brand", "Brand (optional)", "e.g. Carrier, Trane")}
            {txt("model", "Model (optional)")}
            {txt("serialNumber", "Serial Number (optional)")}
            {sel("age", "Approximate Age", SYSTEM_AGES)}
            {txt("indoorLocation", "Indoor Unit Location (optional)", "e.g. Attic, Closet, Basement")}
            {txt("outdoorLocation", "Outdoor Unit Location (optional)", "e.g. Backyard, Side of house")}
          </div>
          {sel("condition", "Approximate Condition", ["", ...CONDITIONS])}

          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={sys.unknownDetails}
              onChange={e => onUpdate({ ...sys, unknownDetails: e.target.checked })}
              className="accent-[#1B3FA8]"
            />
            I don&apos;t know my system details — the technician can fill these in during the first visit
          </label>
        </div>
      )}
    </div>
  );
}

export default function StepHvacDetails({ systems, properties, onChange, makeDefault: _makeDefault }: Props) {
  function getPropertyName(propertyId: string) {
    const prop = properties.find(p => p.id === propertyId);
    return prop?.nickname || prop?.address || "Property";
  }

  const systemsByProp: { propId: string; propName: string; systems: { sys: HvacSystemInput; index: number }[] }[] = [];
  for (const prop of properties) {
    const propSystems = systems
      .map((sys, index) => ({ sys, index }))
      .filter(({ sys }) => sys.propertyId === prop.id);
    systemsByProp.push({ propId: prop.id, propName: getPropertyName(prop.id), systems: propSystems });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-[#0A1628] mb-2">HVAC System Details</h2>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Optional — but helps us prepare for your first visit. You can always skip and check &ldquo;I don&apos;t know.&rdquo;
        </p>
      </div>

      <div className="space-y-6">
        {systemsByProp.map(({ propName, systems: propSystems }) => (
          <div key={propName}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{propName}</p>
            <div className="space-y-3">
              {propSystems.map(({ sys, index }) => (
                <SystemCard
                  key={sys.id}
                  sys={sys}
                  propName={propName}
                  sysIndex={index}
                  onUpdate={updated => {
                    const next = [...systems];
                    next[index] = updated;
                    onChange(next);
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
        <strong>Tip:</strong> Brand and model info helps us bring the right parts and filter sizes. The technician will verify everything during your first tune-up.
      </div>
    </div>
  );
}
