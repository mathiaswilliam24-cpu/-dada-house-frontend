"use client";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  User, Mail, Phone, Car, Award, MapPin, Star, Loader2, CheckCircle, LogOut, Camera,
} from "lucide-react";

type Profile = {
  name: string; email: string; phone: string;
  bio: string; specialties: string[]; skills: string[];
  serviceAreas: string[]; vehicle: string; licenseNumber: string;
  vehicleInfo: { make: string; model: string; year: string; plate: string; color: string };
};

const EMPTY: Profile = {
  name: "", email: "", phone: "", bio: "", specialties: [], skills: [],
  serviceAreas: [], vehicle: "", licenseNumber: "",
  vehicleInfo: { make: "", model: "", year: "", plate: "", color: "" },
};

export default function TechProfilePage() {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");

  useEffect(() => {
    fetch("/api/technician/profile")
      .then((r) => r.json())
      .then((d) => {
        setProfile({
          ...EMPTY,
          name: d.user?.name ?? "",
          email: d.user?.email ?? "",
          phone: d.user?.phone ?? "",
          bio: d.profile?.bio ?? "",
          specialties: d.profile?.specialties ?? [],
          skills: d.profile?.skills ?? [],
          serviceAreas: d.profile?.serviceAreas ?? [],
          vehicle: d.profile?.vehicle ?? "",
          licenseNumber: d.profile?.licenseNumber ?? "",
          vehicleInfo: d.profile?.vehicleInfo ?? EMPTY.vehicleInfo,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/technician/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  }

  function addTag(field: "skills" | "serviceAreas" | "specialties", value: string, setter: (v: string) => void) {
    if (!value.trim()) return;
    setProfile((p) => ({ ...p, [field]: [...p[field], value.trim()] }));
    setter("");
  }

  function removeTag(field: "skills" | "serviceAreas" | "specialties", idx: number) {
    setProfile((p) => ({ ...p, [field]: p[field].filter((_, i) => i !== idx) }));
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500">Manage your technician profile</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-5">
        <div className="w-16 h-16 bg-[#1B3FA8] rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {profile.name?.[0]?.toUpperCase() ?? "T"}
        </div>
        <div>
          <p className="font-bold text-gray-900 text-lg">{profile.name || "Technician"}</p>
          <p className="text-sm text-[#F7921A] font-medium">DADA HOUSE Technician</p>
          <p className="text-xs text-gray-500 mt-0.5">{profile.email}</p>
        </div>
      </div>

      {/* Basic info */}
      <Section icon={<User className="w-4 h-4 text-[#1B3FA8]" />} title="Basic Information">
        <LabelInput label="Full Name" value={profile.name} onChange={(v) => setProfile((p) => ({ ...p, name: v }))} placeholder="Your full name" />
        <LabelInput label="Phone" value={profile.phone} onChange={(v) => setProfile((p) => ({ ...p, phone: v }))} placeholder="+1 (000) 000-0000" type="tel" />
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Bio</label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            rows={3}
            placeholder="Brief professional bio…"
            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#1B3FA8]"
          />
        </div>
      </Section>

      {/* Skills */}
      <Section icon={<Star className="w-4 h-4 text-yellow-500" />} title="Skills">
        <TagInput
          tags={profile.skills}
          newTag={newSkill}
          onNewTagChange={setNewSkill}
          onAdd={() => addTag("skills", newSkill, setNewSkill)}
          onRemove={(i) => removeTag("skills", i)}
          placeholder="e.g. HVAC Repair"
          color="bg-blue-100 text-blue-700"
        />
      </Section>

      {/* Specialties */}
      <Section icon={<Award className="w-4 h-4 text-purple-500" />} title="Specialties">
        <TagInput
          tags={profile.specialties}
          newTag={newSpecialty}
          onNewTagChange={setNewSpecialty}
          onAdd={() => addTag("specialties", newSpecialty, setNewSpecialty)}
          onRemove={(i) => removeTag("specialties", i)}
          placeholder="e.g. Plumbing, AC Repair"
          color="bg-purple-100 text-purple-700"
        />
      </Section>

      {/* Service areas */}
      <Section icon={<MapPin className="w-4 h-4 text-red-500" />} title="Service Areas">
        <TagInput
          tags={profile.serviceAreas}
          newTag={newArea}
          onNewTagChange={setNewArea}
          onAdd={() => addTag("serviceAreas", newArea, setNewArea)}
          onRemove={(i) => removeTag("serviceAreas", i)}
          placeholder="e.g. Houston Heights"
          color="bg-red-100 text-red-700"
        />
      </Section>

      {/* Vehicle info */}
      <Section icon={<Car className="w-4 h-4 text-gray-600" />} title="Vehicle Information">
        <div className="grid grid-cols-2 gap-2">
          {(["make", "model", "year", "plate", "color"] as const).map((k) => (
            <LabelInput
              key={k}
              label={k.charAt(0).toUpperCase() + k.slice(1)}
              value={profile.vehicleInfo?.[k] ?? ""}
              onChange={(v) => setProfile((p) => ({ ...p, vehicleInfo: { ...p.vehicleInfo, [k]: v } }))}
              placeholder={k === "year" ? "e.g. 2022" : `Vehicle ${k}`}
            />
          ))}
        </div>
      </Section>

      {/* License / certifications */}
      <Section icon={<Award className="w-4 h-4 text-green-600" />} title="License & Certifications">
        <LabelInput
          label="License Number"
          value={profile.licenseNumber}
          onChange={(v) => setProfile((p) => ({ ...p, licenseNumber: v }))}
          placeholder="License #"
        />
      </Section>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3.5 bg-[#1B3FA8] text-white rounded-2xl font-bold disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          : saved ? <><CheckCircle className="w-4 h-4" /> Saved!</>
          : "Save Profile"}
      </button>

      {/* Sign out */}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="w-full py-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-semibold flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function LabelInput({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
      />
    </div>
  );
}

function TagInput({
  tags, newTag, onNewTagChange, onAdd, onRemove, placeholder, color,
}: {
  tags: string[]; newTag: string; onNewTagChange: (v: string) => void;
  onAdd: () => void; onRemove: (i: number) => void;
  placeholder: string; color: string;
}) {
  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span key={i} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${color}`}>
              {tag}
              <button onClick={() => onRemove(i)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={newTag}
          onChange={(e) => onNewTagChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]"
        />
        <button onClick={onAdd} className="px-3 py-2 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold shrink-0">Add</button>
      </div>
    </div>
  );
}
