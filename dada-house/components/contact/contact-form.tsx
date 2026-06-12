"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle } from "lucide-react";

const services = [
  "Plumbing",
  "Air Conditioning",
  "Heating",
  "Remodeling",
  "Other",
];

export default function ContactForm() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactInput) => {
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      setSuccess(true);
      reset();
    } catch {
      setError("Failed to send message. Please call us directly.");
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-[#1B3FA8] mb-2">
          Message Sent!
        </h3>
        <p className="text-slate-500">
          We&apos;ll get back to you as soon as possible. For urgent needs, call{" "}
          <a
            href="tel:+13466499353"
            className="text-[#F7921A] font-semibold"
          >
            +1 (346) 649-9353
          </a>
          .
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-6 text-sm text-slate-400 hover:text-[#1B3FA8] transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-[#1B3FA8] mb-1.5">
            Full Name *
          </label>
          <input
            {...register("name")}
            placeholder="John Smith"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-[#1B3FA8] focus:outline-none focus:border-[#F7921A] focus:ring-2 focus:ring-[#F7921A]/20 transition-all"
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1B3FA8] mb-1.5">
            Email *
          </label>
          <input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-[#1B3FA8] focus:outline-none focus:border-[#F7921A] focus:ring-2 focus:ring-[#F7921A]/20 transition-all"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-[#1B3FA8] mb-1.5">
            Phone
          </label>
          <input
            {...register("phone")}
            type="tel"
            placeholder="+1 (555) 000-0000"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-[#1B3FA8] focus:outline-none focus:border-[#F7921A] focus:ring-2 focus:ring-[#F7921A]/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1B3FA8] mb-1.5">
            Service Needed
          </label>
          <select
            {...register("service")}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-[#1B3FA8] focus:outline-none focus:border-[#F7921A] focus:ring-2 focus:ring-[#F7921A]/20 transition-all bg-white"
          >
            <option value="">Select a service</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1B3FA8] mb-1.5">
          Message *
        </label>
        <textarea
          {...register("message")}
          rows={5}
          placeholder="Describe your issue or question..."
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-[#1B3FA8] focus:outline-none focus:border-[#F7921A] focus:ring-2 focus:ring-[#F7921A]/20 transition-all resize-none"
        />
        {errors.message && (
          <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>
        )}
      </div>

      <Button type="submit" loading={isSubmitting} size="lg" className="w-full font-black">
        <Send size={16} />
        Send Message
      </Button>
    </form>
  );
}
