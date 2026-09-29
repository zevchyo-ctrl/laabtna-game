import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { getSiteUrl } from "@/lib/seo";
import { getPlatformSeoConfig } from "@/lib/seo-server";
import "./globals.css";
import "./quiz.css";
import "./scenes.css";
import "./rush.css";
import "./platform.css";

export const viewport: Viewport = {
  themeColor: "#0a0f12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPlatformSeoConfig();
  const siteUrl = getSiteUrl();

  const verification: { google?: string; other?: Record<string, string> } = {};
  if (seo.googleVerification) {
    verification.google = seo.googleVerification;
  }
  if (seo.bingVerification) {
    verification.other = {
      "msvalidate.01": seo.bingVerification,
    };
  }

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: seo.title,
      template: "%s | لعبتنا",
    },
    description: seo.description,
    keywords: seo.keywords.split(",").map((k: string) => k.trim()),
    authors: [{ name: "LAABTNA", url: siteUrl }],
    creator: "لعبتنا | LAABTNA",
    publisher: "لعبتنا | LAABTNA",
    applicationName: "لعبتنا | LAABTNA",
    alternates: {
      canonical: seo.canonicalUrl || siteUrl,
      languages: {
        "ar": `${siteUrl}`,
        "en": `${siteUrl}?lang=en`,
      },
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: siteUrl,
      siteName: "لعبتنا | LAABTNA",
      locale: "ar_AR",
      alternateLocale: ["en_US"],
      type: "website",
      images: [
        {
          url: seo.ogImage || `${siteUrl}/images/laabtna-og.png`,
          width: 1200,
          height: 630,
          alt: "لعبتنا - منصة ألعاب جماعية أونلاين للأصدقاء",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [seo.ogImage || `${siteUrl}/images/laabtna-og.png`],
      creator: "@laabtna",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification,
    other: {
      "format-detection": "telephone=no",
    },
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const siteUrl = getSiteUrl();

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "لعبتنا | LAABTNA",
    "alternateName": "LAABTNA",
    "url": siteUrl,
    "logo": `${siteUrl}/images/laabtna-logo.png`,
    "description": "منصة ألعاب جماعية أونلاين للأصدقاء بدون تسجيل وبدون تحميل.",
    "sameAs": [],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "لعبتنا | LAABTNA",
    "url": siteUrl,
    "inLanguage": ["ar", "en"],
    "description": "منصة ألعاب جماعية أونلاين للأصدقاء بدون تسجيل.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "لعبتنا | LAABTNA",
    "applicationCategory": "GameApplication",
    "operatingSystem": "All",
    "browserRequirements": "Requires JavaScript. Requires HTML5.",
    "url": siteUrl,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
    },
  };

  return (
    <html lang="ar" dir="rtl">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
