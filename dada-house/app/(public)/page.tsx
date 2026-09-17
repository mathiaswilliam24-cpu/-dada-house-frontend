import type { Metadata } from "next";
import HeroSection from "@/components/home/hero-section";
import ServicesGrid from "@/components/home/services-grid";
import WhyChooseUs from "@/components/home/why-choose-us";
import StatsBanner from "@/components/home/stats-banner";
import GallerySection from "@/components/home/gallery-section";
import ReviewsStrip from "@/components/home/reviews-strip";
import StoreTeaser from "@/components/home/store-teaser";
import AppDownloadSection from "@/components/home/app-download-section";
import CTASection from "@/components/home/cta-section";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DADA HOUSE — Home Services in Texas & North Carolina",
  description:
    "Trusted home services in Texas & North Carolina. Expert plumbing, AC repair, heating & remodeling. Same-day service, 24/7 emergency, licensed technicians. Call (844) 928-0875.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [reviews, heroSetting, galleryProjects] = await Promise.all([
    db.review.findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, name: true, service: true, rating: true, content: true, createdAt: true },
    }).catch(() => []),
    db.setting.findUnique({ where: { key: "site.heroImage" } }).catch(() => null),
    db.galleryProject.findMany({
      where: { published: true, images: { isEmpty: false } },
      orderBy: { sortOrder: "asc" },
      take: 6,
      select: { id: true, title: true, category: true, images: true },
    }).catch(() => []),
  ]);

  const heroImage = heroSetting?.value ?? "/hero-desktop.webp";

  return (
    <>
      <HeroSection heroImage={heroImage} />
      <ServicesGrid />
      <StatsBanner />
      <WhyChooseUs />
      <GallerySection projects={galleryProjects} />
      <ReviewsStrip reviews={reviews} />
      <StoreTeaser />
      <AppDownloadSection />
      <CTASection />
    </>
  );
}
