import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/lib/uploadthing";
import NextAuthProvider from "@/components/layout/session-provider";
import "@uploadthing/react/styles.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DADA HOUSE — Home Services in Texas & North Carolina",
    template: "%s | DADA HOUSE",
  },
  description:
    "Trusted home services in Texas & North Carolina. Expert plumbing, AC repair, heating & remodeling. Same-day service, 24/7 emergency, licensed technicians. Call (844) 928-0875.",
  keywords: [
    "plumbing Houston",
    "AC repair Houston",
    "HVAC Houston",
    "home remodeling Houston",
    "emergency plumber Houston",
    "home services Houston TX",
    "heating repair Houston",
    "DADA HOUSE",
    "home services North Carolina",
    "plumbing North Carolina",
    "AC repair NC",
    "HVAC NC",
    "plumber Charlotte NC",
    "home services Raleigh NC",
    "home services Maryland",
    "plumbing Maryland",
    "AC repair MD",
    "HVAC MD",
    "plumber Baltimore MD",
    "home services Rockville MD",
  ],
  openGraph: {
    title: "DADA HOUSE — Premier Home Services Houston",
    description:
      "Expert plumbing, AC, heating & remodeling. Available 24/7 for all your home service needs.",
    url: "https://dada-house.com",
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
  metadataBase: new URL("https://dada-house.com"),
  robots: { index: true, follow: true },
  verification: {
    google: "H1hdW2K9_U_pTC-qifOtnuMFu8WT5u10PzWYcL8kRAA",
  },
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
        <meta name="theme-color" content="#0A1628" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DADA HOUSE" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <meta name="application-name" content="DADA HOUSE" />
        <meta name="msapplication-TileColor" content="#0A1628" />
        <meta name="msapplication-TileImage" content="/icon-192.png" />
        <meta name="format-detection" content="telephone=no" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "DADA HOUSE",
              description:
                "Home services in Houston, TX and across North Carolina — Plumbing, Air Conditioning, Heating, Remodeling",
              url: "https://dada-house.com",
              telephone: "+18449280875",
              email: "customerservice@dada-house.com",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Houston",
                addressRegion: "TX",
                addressCountry: "US",
              },
              areaServed: [
                { "@type": "City", name: "Houston, TX" },
                { "@type": "State", name: "North Carolina" },
              ],
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
        <NextAuthProvider>{children}</NextAuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}`,
          }}
        />
      </body>
    </html>
  );
}
