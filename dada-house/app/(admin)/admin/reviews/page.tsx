import { db } from "@/lib/db";
import { ReviewModerationCard } from "@/components/admin/review-moderation-card";
import { Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const showApproved = filter === "approved";

  const reviews = await db.review.findMany({
    where: { approved: showApproved },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      service: true,
      rating: true,
      content: true,
      approved: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Moderate customer reviews
        </p>
      </div>

      <div className="flex gap-2">
        <a
          href="?filter=pending"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !showApproved
              ? "bg-[#1B3FA8] text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Pending Approval
        </a>
        <a
          href="?filter=approved"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showApproved
              ? "bg-[#1B3FA8] text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Approved
        </a>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
          <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            No {showApproved ? "approved" : "pending"} reviews
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewModerationCard
              key={review.id}
              review={{ ...review, createdAt: review.createdAt.toISOString() }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
