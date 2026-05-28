"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reviewSchema, type ReviewInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle } from "lucide-react";

const services = ["Plumbing", "Air Conditioning", "Heating", "Remodeling"];

export default function ReviewForm() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, photos: [] },
  });

  const onSubmit = async (data: ReviewInput) => {
    if (data.rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      setSuccess(true);
      reset();
      setSelectedRating(0);
    } catch {
      setError("Failed to submit review. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-900/20 border border-green-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Review Submitted!</h3>
        <p className="text-slate-400 text-sm">
          Thank you! Your review will appear after approval.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Star rating */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Your Rating *
        </label>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHoverRating(i + 1)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => {
                setSelectedRating(i + 1);
                setValue("rating", i + 1);
              }}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                size={28}
                className={
                  i < (hoverRating || selectedRating)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-slate-600"
                }
              />
            </button>
          ))}
        </div>
        {errors.rating && (
          <p className="text-red-400 text-xs mt-1">{errors.rating.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-white mb-1.5">
            Your Name *
          </label>
          <input
            {...register("name")}
            placeholder="John Smith"
            className="form-input"
          />
          {errors.name && (
            <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-white mb-1.5">
            Email *
          </label>
          <input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            className="form-input"
          />
          {errors.email && (
            <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-white mb-1.5">
          Service Used
        </label>
        <select
          {...register("service")}
          className="form-input"
        >
          <option value="">Select service (optional)</option>
          {services.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-white mb-1.5">
          Your Review *
        </label>
        <textarea
          {...register("content")}
          rows={4}
          placeholder="Tell us about your experience with DADA HOUSE..."
          className="form-input"
          style={{ resize: "none" }}
        />
        {errors.content && (
          <p className="text-red-400 text-xs mt-1">{errors.content.message}</p>
        )}
      </div>

      <Button type="submit" loading={isSubmitting} size="lg" className="w-full font-black">
        Submit Review
      </Button>
    </form>
  );
}
