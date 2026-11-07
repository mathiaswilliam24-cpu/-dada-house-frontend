"use client";

import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { PropertyInput } from "../EnrollmentWizard";

const PROPERTY_TYPES = ["Residential", "Condo/Townhouse", "Multi-Family", "Commercial", "Other"];
const US_STATES = ["TX", "NC", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

interface Props {
  properties: PropertyInput[];
  totalSystems: number;
  onChange: (props: PropertyInput[]) => void;
  makeDefault: () => PropertyInput;
}

function PropertyCard({
  prop,
  index,
  total,
  onChange,
  onRemove,
}: {
  prop: PropertyInput;
  index: number;
  total: number;
  onChange: (p: PropertyInput) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  function field(name: keyof PropertyInput, label: string, type = "text", required = false) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
          type={type}
          value={prop[name] as string}
          onChange={e => onChange({ ...prop, [name]: e.target.value })}
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
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-[#1B3FA8] text-white text-xs font-black flex items-center justify-center">
            {index + 1}
          </span>
          <div className="text-left">
            <p className="font-bold text-[#0A1628] text-sm">
              {prop.nickname || `Property ${index + 1}`}
            </p>
            <p className="text-slate-400 text-xs">
              {prop.address ? `${prop.address}, ${prop.city}` : "No address yet"} · {prop.systemCount} system{prop.systemCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {total > 1 && (
            <button
              onClick={e => { e.stopPropagation(); onRemove(); }}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100">
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field("nickname", "Property Nickname (optional)")}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Property Type</label>
              <select
                value={prop.propertyType}
                onChange={e => onChange({ ...prop, propertyType: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1B3FA8]"
              >
                {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {field("address", "Street Address", "text", true)}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {field("apt", "Apt / Unit")}
            {field("city", "City", "text", true)}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">State <span className="text-red-500">*</span></label>
              <select
                value={prop.state}
                onChange={e => onChange({ ...prop, state: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1B3FA8]"
              >
                {US_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            {field("zipCode", "ZIP", "text", true)}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              HVAC Systems at this property <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onChange({ ...prop, systemCount: Math.max(1, prop.systemCount - 1) })}
                className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-lg transition-colors"
              >−</button>
              <span className="font-black text-xl text-[#0A1628] w-8 text-center">{prop.systemCount}</span>
              <button
                onClick={() => onChange({ ...prop, systemCount: prop.systemCount + 1 })}
                className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-lg transition-colors"
              >+</button>
            </div>
          </div>

          {field("accessInstructions", "Access Instructions (optional)")}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field("gateCode", "Gate Code (optional)")}
            {field("tenantName", "Tenant Name (optional)")}
            {field("tenantPhone", "Tenant Phone (optional)", "tel")}
            {field("tenantEmail", "Tenant Email (optional)", "email")}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StepProperties({ properties, totalSystems, onChange, makeDefault }: Props) {
  const assignedSystems = properties.reduce((s, p) => s + p.systemCount, 0);
  const diff = totalSystems - assignedSystems;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-[#0A1628] mb-2">Your Service Properties</h2>
        <p className="text-slate-500 text-sm">Add each property where HVAC systems will be maintained.</p>
      </div>

      {diff !== 0 && (
        <div className={`mb-5 p-3 rounded-xl text-sm flex items-center gap-2 ${diff > 0 ? "bg-orange-50 border border-orange-200 text-orange-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          <span className="font-bold">
            {diff > 0
              ? `${diff} system${diff > 1 ? "s" : ""} not yet assigned to a property.`
              : `${Math.abs(diff)} more system${Math.abs(diff) > 1 ? "s" : ""} assigned than selected.`}
          </span>
          Adjust property system counts to match your total of {totalSystems}.
        </div>
      )}

      <div className="space-y-4 mb-6">
        {properties.map((p, i) => (
          <PropertyCard
            key={p.id}
            prop={p}
            index={i}
            total={properties.length}
            onChange={updated => {
              const next = [...properties];
              next[i] = updated;
              onChange(next);
            }}
            onRemove={() => {
              const next = properties.filter((_, j) => j !== i);
              onChange(next);
            }}
          />
        ))}
      </div>

      <button
        onClick={() => onChange([...properties, makeDefault()])}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#1B3FA8]/30 hover:border-[#1B3FA8] text-[#1B3FA8] font-bold text-sm rounded-xl transition-colors"
      >
        <Plus size={16} />
        Add Another Property
      </button>

      <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
        <strong className="text-slate-700">Total:</strong> {properties.length} propert{properties.length !== 1 ? "ies" : "y"} · {assignedSystems} system{assignedSystems !== 1 ? "s" : ""} assigned
      </div>
    </div>
  );
}
