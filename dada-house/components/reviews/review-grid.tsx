import ReviewCard from "./review-card";

interface Review {
  id: string;
  name: string;
  service: string | null;
  rating: number;
  content: string;
  createdAt: Date;
}

const fallbackReviews: Review[] = [
  {
    id: "1",
    name: "Maria G.",
    service: "Plumbing",
    rating: 5,
    content:
      "DADA HOUSE fixed our burst pipe at 2am without hesitation. Technician was here in under an hour and had everything repaired quickly. Amazing service!",
    createdAt: new Date("2024-12-01"),
  },
  {
    id: "2",
    name: "James T.",
    service: "Air Conditioning",
    rating: 5,
    content:
      "AC died on the hottest day of summer. Called DADA HOUSE and they had a tech at my house same day. Fixed it in 2 hours. Fair price, great people.",
    createdAt: new Date("2024-11-15"),
  },
  {
    id: "3",
    name: "Patricia K.",
    service: "Remodeling",
    rating: 5,
    content:
      "They completely transformed our kitchen. Professional, clean, on schedule. The quality exceeded our expectations. Will definitely hire again.",
    createdAt: new Date("2024-10-20"),
  },
  {
    id: "4",
    name: "David R.",
    service: "Heating",
    rating: 5,
    content:
      "Furnace stopped working in winter. DADA HOUSE came out the same evening and got it running again. Very professional and reasonably priced.",
    createdAt: new Date("2024-09-05"),
  },
  {
    id: "5",
    name: "Sandra L.",
    service: "Plumbing",
    rating: 5,
    content:
      "Had a serious drain clog that two other plumbers couldn't fix. DADA HOUSE solved it in one visit. Excellent work and great customer service.",
    createdAt: new Date("2024-08-12"),
  },
  {
    id: "6",
    name: "Robert M.",
    service: "Remodeling",
    rating: 5,
    content:
      "Bathroom renovation turned out beautiful. They were respectful, kept the work area clean, and finished on time. Very happy with the result.",
    createdAt: new Date("2024-07-28"),
  },
];

export default function ReviewGrid({ reviews }: { reviews: Review[] }) {
  const displayReviews = reviews.length > 0 ? reviews : fallbackReviews;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {displayReviews.map((review) => (
        <ReviewCard
          key={review.id}
          name={review.name}
          service={review.service}
          rating={review.rating}
          content={review.content}
          createdAt={review.createdAt}
        />
      ))}
    </div>
  );
}
