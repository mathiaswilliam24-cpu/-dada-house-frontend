import type { Metadata } from "next";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import GalleryClient from "@/components/gallery/gallery-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project Gallery — DADA HOUSE",
  description:
    "Browse our completed plumbing, air conditioning, heating and remodeling projects across Houston TX. Quality work backed by 5-star reviews.",
  openGraph: {
    title: "Project Gallery — DADA HOUSE",
    description: "See our completed home service projects across Houston TX.",
  },
};

export default async function GalleryPage() {
  const projects = await db.galleryProject.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1B3FA8] to-[#0D1D5E] py-20 px-4 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}
        />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#F7921A]/15 border border-[#F7921A]/30 rounded-full mb-6">
            <span className="text-[#F7921A] text-sm font-bold uppercase tracking-widest">Our Work</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
            Project <span className="text-[#F7921A]">Gallery</span>
          </h1>
          <p className="text-blue-200 text-lg max-w-xl mx-auto mb-8">
            Real projects, real results. Browse our completed work across Houston TX — from emergency repairs to full renovations.
          </p>
          <Link
            href="/booking"
            className={cn(buttonVariants({ size: "lg" }), "gap-2 shadow-2xl shadow-orange-900/30")}
          >
            <Calendar size={18} />
            Book Your Project
          </Link>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16 px-4 bg-slate-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto">
          {projects.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <p className="text-xl font-semibold mb-2">Gallery coming soon</p>
              <p className="text-sm">We&apos;re adding our project photos — check back shortly.</p>
            </div>
          ) : (
            <GalleryClient projects={projects} />
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1B3FA8] py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-3">Ready to Start Your Project?</h2>
          <p className="text-blue-200 mb-8">Our team is available 24/7. Book an appointment online or call us now.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/booking" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
              <Calendar size={18} />
              Book Appointment
            </Link>
            <a href="tel:+19106858042" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}>
              Call (910) 685-8042
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
