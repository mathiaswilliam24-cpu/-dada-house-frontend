"use client";

import { useState } from "react";
import { Star, Check, X, Mail } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Review {
  id: string;
  name: string;
  email: string;
  service: string | null;
  rating: number;
  content: string;
  approved: boolean;
  createdAt: string;
}

export function ReviewModerationCard({ review }: { review: Review }) {
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);

  const act = async (approve: boolean) => {
    setLoading(true);
    await fetch(`/api/admin/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: approve }),
    });
    setHidden(true);
    setLoading(false);
  };

  if (hidden) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-gray-900 text-sm">
              {review.name}
            </span>
            <span className="flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < review.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-200"
                  }`}
                />
              ))}
            </span>
            {review.service && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {review.service}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <Mail className="w-3 h-3" />
            {review.email}
            <span>·</span>
            {formatDate(review.createdAt)}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {review.content}
          </p>
        </div>

        {!review.approved && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => act(true)}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              onClick={() => act(false)}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
