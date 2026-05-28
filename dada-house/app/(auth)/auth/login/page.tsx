"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import {
  Home,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
  Phone,
} from "lucide-react";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [authError, setAuthError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setAuthError("");
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setAuthError("Invalid email or password. Please try again.");
      return;
    }

    const session = await getSession();
    const role = (session?.user as { role?: string })?.role;
    if (role === "ADMIN") {
      router.push("/admin");
    } else if (role === "TECHNICIAN") {
      router.push("/technician");
    } else if (role === "DISPATCHER") {
      router.push("/dispatcher");
    } else {
      router.push(callbackUrl);
    }
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {authError && (
        <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-700/30 rounded-xl text-red-300 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {authError}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-white mb-1.5">
          Email Address
        </label>
        <div className="relative">
          <Mail
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            className="form-input pl-10"
          />
        </div>
        {errors.email && (
          <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-white mb-1.5">
          Password
        </label>
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            {...register("password")}
            type="password"
            placeholder="••••••••"
            className="form-input pl-10"
          />
        </div>
        {errors.password && (
          <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" loading={isSubmitting} size="lg" className="w-full font-black">
        Sign In
      </Button>

      <p className="text-center text-slate-400 text-sm">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/register"
          className="text-[#F7921A] font-semibold hover:text-orange-400 transition-colors"
        >
          Create Account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#1B3FA8] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 hero-gradient relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#F7921A] rounded-xl flex items-center justify-center">
              <Home size={24} className="text-white" />
            </div>
            <div>
              <div className="font-black text-white text-2xl tracking-tight">DADA</div>
              <div className="font-black text-[#F7921A] text-2xl tracking-tight -mt-1">HOUSE</div>
            </div>
          </Link>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-black text-white mb-4 leading-tight">
            Your Home Is In
            <br />
            <span className="gradient-text">Good Hands</span>
          </h2>
          <p className="text-blue-200 text-lg mb-8">
            Sign in to access your appointments, invoices, and account dashboard.
          </p>
          <div className="space-y-3">
            {[
              "Track your service appointments",
              "Download invoices and receipts",
              "View service history",
              "24/7 account access",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle size={16} className="text-[#F7921A]" />
                <span className="text-blue-200 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <a href="tel:+19106858042" className="flex items-center gap-2 text-blue-300 text-sm hover:text-white transition-colors">
            <Phone size={14} />
            Need help? Call +1 (910) 685-8042
          </a>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#F7921A] rounded-xl flex items-center justify-center">
              <Home size={20} className="text-white" />
            </div>
            <div>
              <div className="font-black text-white text-xl">DADA</div>
              <div className="font-black text-[#F7921A] text-xl -mt-1">HOUSE</div>
            </div>
          </div>

          <h1 className="text-3xl font-black text-white mb-2">Welcome back</h1>
          <p className="text-slate-400 mb-8">
            Sign in to your DADA HOUSE account.
          </p>

          <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-white/5" />}>
            <LoginFormInner />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
