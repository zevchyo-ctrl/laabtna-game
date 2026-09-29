import type { Metadata } from "next";
import PublicGameLanding from "@/components/PublicGameLanding";
import { gamesSeoCatalog, getSiteUrl } from "@/lib/seo";
import { getPlatformSeoConfig } from "@/lib/seo-server";

const game = gamesSeoCatalog.scene;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPlatformSeoConfig();
  const siteUrl = getSiteUrl();
  const title = seo.gameOverrides.scene.title || game.title;
  const description = seo.gameOverrides.scene.description || game.description;
  const pageUrl = `${siteUrl}/${game.slug}`;

  return {
    title,
    description,
    keywords: [
      "خمن المشهد",
      "لعبة تمثيل وتخمين",
      "ألعاب تمثيل حركي",
      "ألعاب جماعية للأصدقاء",
      "ألعاب سهرات وجلسات",
      "ألعاب فرق متنافسة",
      "ألعاب جماعية أونلاين",
      "لعبتنا",
    ],
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "لعبتنا | LAABTNA",
      locale: "ar_AR",
      type: "website",
      images: [
        {
          url: seo.ogImage || `${siteUrl}/images/laabtna-og.png`,
          width: 1200,
          height: 630,
          alt: "لعبة خمن المشهد - منصة لعبتنا",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [seo.ogImage || `${siteUrl}/images/laabtna-og.png`],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function GuessTheScenePage() {
  const siteUrl = getSiteUrl();
  return <PublicGameLanding game={game} siteUrl={siteUrl} />;
}
