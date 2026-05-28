"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Home, Mail, Lock, User, Phone, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [authError, setAuthError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setAuthError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAuthError(body.error || "Registration failed");
        return;
      }
      router.push("/auth/login?registered=1");
    } catch {
      setAuthError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#1B3FA8] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#F7921A] rounded-xl flex items-center justify-center">
            <Home size={20} className="text-white" />
          </div>
          <div>
            <div className="font-black text-white text-xl">DADA</div>
            <div className="font-black text-[#F7921A] text-xl -mt-1">HOUSE</div>
          </div>
        </div>

        <h1 className="text-3xl font-black text-white mb-2">Create Account</h1>
        <p className="text-slate-400 mb-8">
          Join DADA HOUSE to track your appointments and manage your home services.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {authError && (
            <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-700/30 rounded-xl text-red-300 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {authError}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input {...register("name")} placeholder="John Smith" className="form-input pl-10" />
            </div>
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input {...register("email")} type="email" placeholder="you@example.com" className="form-input pl-10" />
            </div>
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">Phone (optional)</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input {...register("phone")} type="tel" placeholder="+1 (555) 000-0000" className="form-input pl-10" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input {...register("password")} type="password" placeholder="Min. 8 characters" className="form-input pl-10" />
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input {...register("confirmPassword")} type="password" placeholder="Repeat password" className="form-input pl-10" />
            </div>
            {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" loading={isSubmitting} size="lg" className="w-full font-black">
            Create Account
          </Button>

          <p className="text-center text-slate-400 text-sm">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-[#F7921A] font-semibold hover:text-orange-400 transition-colors">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
