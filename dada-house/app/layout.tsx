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
                "Premier home services in Houston TX — Plumbing, Air Conditioning, Heating, Remodeling",
              url: "https://dada-house.com",
              telephone: "+19106858042",
              email: "customerservice@dada-house.com",
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
