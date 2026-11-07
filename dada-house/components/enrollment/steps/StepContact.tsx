"use client";

import type { ContactInput } from "../EnrollmentWizard";

interface Props {
  value: ContactInput;
  onChange: (c: ContactInput) => void;
}

const CUSTOMER_TYPES = ["Homeowner", "Landlord / Property Owner", "Property Manager", "Business Owner"];
const CONTACT_METHODS = ["email", "sms", "phone"];
const LANGUAGES = [{ value: "en", label: "English" }, { value: "es", label: "Spanish" }, { value: "fr", label: "French" }];
const US_STATES = ["TX", "NC", "AL", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

export default function StepContact({ value, onChange }: Props) {
  function set<K extends keyof ContactInput>(key: K, val: ContactInput[K]) {
    onChange({ ...value, [key]: val });
  }

  function field(key: keyof ContactInput, label: string, type = "text", required = false, placeholder?: string) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
          type={type}
          placeholder={placeholder}
          value={value[key] as string}
          onChange={e => set(key, e.target.value as ContactInput[typeof key])}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1B3FA8] transition-colors"
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-[#0A1628] mb-2">Your Contact Information</h2>
        <p className="text-slate-500 text-sm">Used for appointment scheduling, reminders, and your membership account.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        {/* Customer type */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">I am a <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {CUSTOMER_TYPES.map(t => (
              <button
                key={t}
                onClick={() => set("customerType", t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  value.customerType === t
                    ? "bg-[#1B3FA8] border-[#1B3FA8] text-white"
                    : "border-slate-200 text-slate-600 hover:border-[#1B3FA8]/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field("firstName", "First Name", "text", true)}
          {field("lastName", "Last Name", "text", true)}
        </div>

        {/* Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field("email", "Email Address", "email", true)}
          {field("phone", "Mobile Phone", "tel", true, "+1 (xxx) xxx-xxxx")}
        </div>

        {/* Preferred contact & language */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Preferred Contact Method</label>
            <select
              value={value.preferredContact}
              onChange={e => set("preferredContact", e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1B3FA8]"
            >
              {CONTACT_METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Preferred Language</label>
            <select
              value={value.preferredLanguage}
              onChange={e => set("preferredLanguage", e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1B3FA8]"
            >
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>

        {/* Billing address */}
        <div>
          <p className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Billing Address</p>
          {field("billingAddress", "Street Address", "text", true)}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div className="col-span-2">
              {field("billingCity", "City", "text", true)}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">State <span className="text-red-500">*</span></label>
              <select
                value={value.billingState}
                onChange={e => set("billingState", e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1B3FA8]"
              >
                {US_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              {field("billingZip", "ZIP", "text", true)}
            </div>
          </div>
        </div>

        {/* Consents */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value.marketingSmsConsent}
              onChange={e => set("marketingSmsConsent", e.target.checked)}
              className="mt-0.5 accent-[#1B3FA8]"
            />
            <span className="text-xs text-slate-500">
              I consent to receive marketing SMS messages from DADA HOUSE. Msg &amp; data rates may apply. Reply STOP to unsubscribe.
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value.marketingEmailConsent}
              onChange={e => set("marketingEmailConsent", e.target.checked)}
              className="mt-0.5 accent-[#1B3FA8]"
            />
            <span className="text-xs text-slate-500">
              I consent to receive marketing emails from DADA HOUSE.
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value.privacyAccepted}
              onChange={e => set("privacyAccepted", e.target.checked)}
              className="mt-0.5 accent-[#1B3FA8]"
            />
            <span className="text-xs text-slate-700 font-semibold">
              I have read and agree to the <a href="/privacy" className="text-[#1B3FA8] hover:underline" target="_blank">Privacy Policy</a>. <span className="text-red-500">*</span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value.agreementAccepted}
              onChange={e => set("agreementAccepted", e.target.checked)}
              className="mt-0.5 accent-[#F7921A]"
            />
            <span className="text-xs text-slate-700 font-semibold">
              I agree to the <a href="/services/maintenance-plan" className="text-[#1B3FA8] hover:underline" target="_blank">HVAC Maintenance Plan Agreement</a>. I understand the plan covers two seasonal tune-ups and does not include the cost of repairs or refrigerant. <span className="text-red-500">*</span>
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
