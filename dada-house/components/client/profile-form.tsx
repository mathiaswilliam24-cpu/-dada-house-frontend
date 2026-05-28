"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Phone, Mail, Save } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
}

export function ProfileForm({ user }: { user: UserProfile }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name ?? "", phone: user.phone ?? "" },
  });

  const onSubmit = async (data: FormData) => {
    setError("");
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError("Failed to update profile. Please try again.");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
        <div className="w-16 h-16 bg-[#1B3FA8] rounded-full flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-white">
            {(user.name ?? user.email)[0].toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-semibold text-gray-900">{user.name ?? "—"}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">DADA HOUSE Client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Full Name
            </span>
          </label>
          <input
            {...register("name")}
            className="form-input"
            placeholder="Your full name"
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email Address
            </span>
          </label>
          <input
            value={user.email}
            disabled
            className="form-input opacity-60 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Phone Number
            </span>
          </label>
          <input
            {...register("phone")}
            className="form-input"
            placeholder="+1 (555) 000-0000"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            Profile updated successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1B3FA8] text-white rounded-lg text-sm font-medium hover:bg-[#1B3FA8]/90 transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
