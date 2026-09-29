import { db } from "@/db";
import { adminSettings } from "@/db/schema";
import { gamesSeoCatalog, getSiteUrl } from "@/lib/seo";

export async function getPlatformSeoConfig() {
  const siteUrl = getSiteUrl();
  try {
    const rows = await db.select().from(adminSettings);
    const map = Object.fromEntries(rows.map((r) => [r.settingKey, r.settingValue]));

    return {
      siteUrl,
      title: map.SEO_TITLE || "لعبتنا | ألعاب جماعية أونلاين للأصدقاء بدون تسجيل",
      description: map.SEO_DESCRIPTION || "لعبتنا جمعتنا — منصة ألعاب جماعية أونلاين للأصدقاء بدون تسجيل. العب الكلمة السرية، الأسئلة العامة، خمن المشهد والتحدي السريع على الجوال والكمبيوتر.",
      keywords: map.SEO_KEYWORDS || "ألعاب جماعية أونلاين, ألعاب جماعية للأصدقاء, ألعاب بدون تسجيل, ألعاب بدون تحميل, ألعاب جماعية على الجوال, ألعاب أونلاين مجانية, ألعاب جماعية عربية, ألعاب للأصدقاء, ألعاب للسهرات والجلسات, ألعاب ذكاء وتخمين, ألعاب أسئلة وأجوبة, ألعاب تنافسية للأصدقاء",
      canonicalUrl: map.SEO_CANONICAL || siteUrl,
      ogImage: map.SEO_OG_IMAGE || `${siteUrl}/images/laabtna-og.png`,
      googleVerification: map.GOOGLE_VERIFICATION || process.env.GOOGLE_SITE_VERIFICATION || "",
      bingVerification: map.BING_VERIFICATION || process.env.BING_SITE_VERIFICATION || "",
      gameOverrides: {
        secret: {
          title: map.SEO_SECRET_TITLE || gamesSeoCatalog.secret.title,
          description: map.SEO_SECRET_DESC || gamesSeoCatalog.secret.description,
        },
        quiz: {
          title: map.SEO_QUIZ_TITLE || gamesSeoCatalog.quiz.title,
          description: map.SEO_QUIZ_DESC || gamesSeoCatalog.quiz.description,
        },
        scene: {
          title: map.SEO_SCENE_TITLE || gamesSeoCatalog.scene.title,
          description: map.SEO_SCENE_DESC || gamesSeoCatalog.scene.description,
        },
        rush: {
          title: map.SEO_RUSH_TITLE || gamesSeoCatalog.rush.title,
          description: map.SEO_RUSH_DESC || gamesSeoCatalog.rush.description,
        },
      },
    };
  } catch {
    return {
      siteUrl,
      title: "لعبتنا | ألعاب جماعية أونلاين للأصدقاء بدون تسجيل",
      description: "لعبتنا جمعتنا — منصة ألعاب جماعية أونلاين للأصدقاء بدون تسجيل. العب الكلمة السرية، الأسئلة العامة، خمن المشهد والتحدي السريع على الجوال والكمبيوتر.",
      keywords: "ألعاب جماعية أونلاين, ألعاب جماعية للأصدقاء, ألعاب بدون تسجيل, ألعاب بدون تحميل, ألعاب جماعية على الجوال, ألعاب أونلاين مجانية, ألعاب جماعية عربية, ألعاب للأصدقاء, ألعاب للسهرات والجلسات, ألعاب ذكاء وتخمين, ألعاب أسئلة وأجوبة, ألعاب تنافسية للأصدقاء",
      canonicalUrl: siteUrl,
      ogImage: `${siteUrl}/images/laabtna-og.png`,
      googleVerification: process.env.GOOGLE_SITE_VERIFICATION || "",
      bingVerification: process.env.BING_SITE_VERIFICATION || "",
      gameOverrides: {
        secret: { title: gamesSeoCatalog.secret.title, description: gamesSeoCatalog.secret.description },
        quiz: { title: gamesSeoCatalog.quiz.title, description: gamesSeoCatalog.quiz.description },
        scene: { title: gamesSeoCatalog.scene.title, description: gamesSeoCatalog.scene.description },
        rush: { title: gamesSeoCatalog.rush.title, description: gamesSeoCatalog.rush.description },
      },
    };
  }
}
