import type { Metadata } from "next";
import HeroSection from "@/components/home/hero-section";
import ServicesGrid from "@/components/home/services-grid";
import WhyChooseUs from "@/components/home/why-choose-us";
import StatsBanner from "@/components/home/stats-banner";
import GallerySection from "@/components/home/gallery-section";
import ReviewsStrip from "@/components/home/reviews-strip";
import StoreTeaser from "@/components/home/store-teaser";
import CTASection from "@/components/home/cta-section";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "DADA HOUSE — Premier Home Services Houston | Plumbing, AC, Heating, Remodeling",
  description:
    "Houston's premier home services company. Available 24/7 for plumbing, air conditioning, heating, and remodeling. Emergency service available.",
};

export default async function HomePage() {
  const reviews = await db.review
    .findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" },
      take: 3,
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

  return (
    <>
      <HeroSection />
      <ServicesGrid />
      <StatsBanner />
      <WhyChooseUs />
      <GallerySection />
      <ReviewsStrip reviews={reviews} />
      <StoreTeaser />
      <CTASection />
    </>
  );
}
