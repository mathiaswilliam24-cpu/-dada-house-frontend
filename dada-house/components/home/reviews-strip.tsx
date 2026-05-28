import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";

interface Review {
  id: string;
  name: string;
  service: string | null;
  rating: number;
  content: string;
  createdAt: Date;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < rating ? "text-yellow-400 fill-yellow-400" : "text-slate-600"}
        />
      ))}
    </div>
  );
}

export default function ReviewsStrip({ reviews }: { reviews: Review[] }) {
  const displayReviews =
    reviews.length > 0
      ? reviews.slice(0, 3)
      : [
          {
            id: "1",
            name: "Maria G.",
            service: "Plumbing",
            rating: 5,
            content:
              "DADA HOUSE fixed our burst pipe in the middle of the night. Incredible response time — our technician was here within 45 minutes. Absolutely saved us!",
            createdAt: new Date(),
          },
          {
            id: "2",
            name: "James T.",
            service: "Air Conditioning",
            rating: 5,
            content:
              "My AC died in the middle of summer. DADA HOUSE had it running again the same day. Fair price, professional team, and excellent work. Highly recommend!",
            createdAt: new Date(),
          },
          {
            id: "3",
            name: "Patricia K.",
            service: "Remodeling",
            rating: 5,
            content:
              "They completely transformed our kitchen. From design to finishing — professional, on schedule, and the result exceeded our expectations. Will use again.",
            createdAt: new Date(),
          },
        ];

  return (
    <section className="section-navy py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 bg-[#F7921A]/10 border border-[#F7921A]/30 text-[#F7921A] text-xs font-bold rounded-full uppercase tracking-wider mb-4">
            Customer Reviews
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            What Our Customers Say
          </h2>
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={20} className="text-yellow-400 fill-yellow-400" />
            ))}
            <span className="text-white font-bold ml-2">5.0</span>
            <span className="text-slate-400 text-sm">· 100+ Reviews</span>
          </div>
        </div>

        {/* Reviews */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {displayReviews.map((review) => (
            <div
              key={review.id}
              className="bg-[#0D1D5E] border border-[#1A3490] rounded-2xl p-6 flex flex-col"
            >
              {/* Stars */}
              <StarRating rating={review.rating} />

              {/* Content */}
              <p className="text-slate-300 text-sm leading-relaxed mt-4 flex-1">
                &ldquo;{review.content}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[#1A3490]">
                <div className="w-9 h-9 rounded-full bg-[#F7921A] flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                  {review.name[0]}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{review.name}</p>
                  {review.service && (
                    <p className="text-[#F7921A] text-xs">{review.service}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 px-6 py-3 border border-[#1A3490] hover:border-[#F7921A] text-blue-200 hover:text-white text-sm font-semibold rounded-xl transition-all"
          >
            Read All Reviews
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
