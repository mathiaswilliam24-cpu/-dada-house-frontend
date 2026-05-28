import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/lib/uploadthing";
import "@uploadthing/react/styles.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default:
      "DADA HOUSE — Premier Home Services Houston | Plumbing, AC, Heating, Remodeling",
    template: "%s | DADA HOUSE",
  },
  description:
    "Houston's premier home services company. Expert plumbing, AC repair, heating, and remodeling. Available 24/7. Emergency service. Licensed & insured.",
  keywords: [
    "plumbing Houston",
    "AC repair Houston",
    "HVAC Houston",
    "home remodeling Houston",
    "emergency plumber Houston",
    "home services Houston TX",
    "heating repair Houston",
    "DADA HOUSE",
  ],
  openGraph: {
    title: "DADA HOUSE — Premier Home Services Houston",
    description:
      "Expert plumbing, AC, heating & remodeling. Available 24/7 for all your home service needs.",
    url: "https://mydadahouse.com",
    siteName: "DADA HOUSE",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "DADA HOUSE — Premier Home Services Houston",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DADA HOUSE — Premier Home Services Houston",
    description: "Expert plumbing, AC, heating & remodeling. Available 24/7.",
    images: ["/og-image.jpg"],
  },
  metadataBase: new URL("https://mydadahouse.com"),
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1B3FA8" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "DADA HOUSE",
              description:
                "Premier home services in Houston TX — Plumbing, Air Conditioning, Heating, Remodeling",
              url: "https://mydadahouse.com",
              telephone: "+19106858042",
              email: "customerservice@mydadahouse.com",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Houston",
                addressRegion: "TX",
                addressCountry: "US",
              },
              areaServed: "Houston, TX",
              openingHours: "Mo-Su 00:00-24:00",
              priceRange: "$$",
              serviceType: [
                "Plumbing",
                "Air Conditioning",
                "Heating",
                "Remodeling",
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-white text-[#1B3FA8]">
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        {children}
      </body>
    </html>
  );
}
