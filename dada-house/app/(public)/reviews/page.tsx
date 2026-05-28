import type { Metadata } from "next";
import { db } from "@/lib/db";
import ReviewGrid from "@/components/reviews/review-grid";
import ReviewForm from "@/components/reviews/review-form";
import { Star } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer Reviews — DADA HOUSE Houston",
  description:
    "Read customer reviews for DADA HOUSE home services in Houston TX. See what our customers say about our plumbing, AC, heating, and remodeling services.",
};

export default async function ReviewsPage() {
  const reviews = await db.review
    .findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        service: true,
        rating: true,
        content: true,
        createdAt: true,
      },
    })
    .catch(() => []);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

  return (
    <>
      {/* Hero */}
      <section className="hero-gradient py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-3 py-1 bg-[#F7921A]/10 border border-[#F7921A]/30 text-[#F7921A] text-xs font-bold rounded-full uppercase tracking-wider mb-5">
            Customer Feedback
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
            What Our Customers Say
          </h1>

          <div className="flex items-center justify-center gap-2 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={24} className="text-yellow-400 fill-yellow-400" />
            ))}
          </div>
          <p className="text-white text-2xl font-black">
            {avgRating}
            <span className="text-blue-200 text-base font-normal ml-2">
              · {reviews.length > 0 ? `${reviews.length} reviews` : "100+ reviews"}
            </span>
          </p>
        </div>
        <div className="wave-divider">
          <svg viewBox="0 0 1440 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,25 C360,50 1080,0 1440,25 L1440,50 L0,50 Z" fill="#f8fafc" />
          </svg>
        </div>
      </section>

      {/* Reviews grid */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ReviewGrid reviews={reviews} />
        </div>
      </section>

      {/* Submit review */}
      <section className="py-20 section-navy">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-3">
              Share Your Experience
            </h2>
            <p className="text-blue-200">
              Had service with DADA HOUSE? We&apos;d love to hear how it went.
            </p>
          </div>
          <div className="bg-[#0D1D5E] border border-[#1A3490] rounded-2xl p-8">
            <ReviewForm />
          </div>
        </div>
      </section>
    </>
  );
}
