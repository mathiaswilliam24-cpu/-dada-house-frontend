import { Star } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ReviewCardProps {
  name: string;
  service: string | null;
  rating: number;
  content: string;
  createdAt: Date;
}

export default function ReviewCard({
  name,
  service,
  rating,
  content,
  createdAt,
}: ReviewCardProps) {
  return (
    <div className="bg-white border border-slate-200 hover:border-[#F7921A]/30 rounded-2xl p-6 flex flex-col service-card">
      {/* Stars */}
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={15}
            className={i < rating ? "text-yellow-400 fill-yellow-400" : "text-slate-300"}
          />
        ))}
      </div>

      {/* Content */}
      <p className="text-slate-600 text-sm leading-relaxed flex-1 mb-5">
        &ldquo;{content}&rdquo;
      </p>

      {/* Author */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1B3FA8] flex items-center justify-center text-white text-sm font-black flex-shrink-0">
            {name[0]}
          </div>
          <div>
            <p className="text-[#1B3FA8] font-bold text-sm">{name}</p>
            {service && (
              <p className="text-[#F7921A] text-xs font-medium">{service}</p>
            )}
          </div>
        </div>
        <span className="text-slate-400 text-xs">{formatDate(createdAt)}</span>
      </div>
    </div>
  );
}
