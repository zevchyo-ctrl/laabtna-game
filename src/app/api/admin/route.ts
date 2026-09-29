import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  adminSettings,
  categoryAccess,
  featureAccess,
  gameAccess,
  gameResults,
  subscriptionRequests,
  userProfiles,
  users,
  userSubscriptions,
} from "@/db/schema";
import {
  clearAdminSessionCookie,
  ensurePlatformCatalogSeeded,
  getPublicAccessMatrix,
  isAdminAuthenticated,
  setAdminSessionCookie,
  verifyAdminPasscodeServerSide,
  type AccessTier,
  type GlobalAccessMode,
} from "@/lib/platform-server";

export const dynamic = "force-dynamic";

async function buildAdminDashboardPayload() {
  await ensurePlatformCatalogSeeded();
  const [allUsers, profiles, subs, requests, results, matrix, settings] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)),
    db.select().from(userProfiles),
    db.select().from(userSubscriptions),
    db.select().from(subscriptionRequests).orderBy(desc(subscriptionRequests.createdAt)),
    db.select().from(gameResults).orderBy(desc(gameResults.createdAt)).limit(200),
    getPublicAccessMatrix(),
    db.select().from(adminSettings),
  ]);

  const settingsMap = Object.fromEntries(settings.map((s) => [s.settingKey, s.settingValue]));

  const profileMap = Object.fromEntries(profiles.map((p) => [p.userId, p]));
  const subMap = Object.fromEntries(subs.map((s) => [s.userId, s]));

  const userRows = allUsers.map((u) => {
    const prof = profileMap[u.id];
    const sub = subMap[u.id];
    const userRequests = requests.filter((r) => r.userId === u.id);
    const userHistory = results.filter((r) => r.userId === u.id).slice(0, 15);
    return {
      id: u.id,
      email: u.email,
      displayName: prof?.displayName ?? u.email.split("@")[0],
      createdAt: u.createdAt.toISOString(),
      isPremium: Boolean(sub?.isPremium),
      gamesPlayed: prof?.gamesPlayed ?? 0,
      bestScore: prof?.bestScore ?? 0,
      pendingRequest: userRequests.some((r) => r.status === "Pending"),
      latestRequestStatus: userRequests[0]?.status ?? null,
      history: userHistory.map((h) => ({
        id: h.id,
        gameName: h.gameName,
        mode: h.mode,
        score: h.score,
        rounds: h.rounds,
        rankLabel: h.rankLabel,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  });

  const premiumCount = userRows.filter((u) => u.isPremium).length;
  const pendingCount = requests.filter((r) => r.status === "Pending").length;

  return {
    authenticated: true,
    stats: {
      totalUsers: userRows.length,
      premiumUsers: premiumCount,
      freeUsers: userRows.length - premiumCount,
      pendingRequests: pendingCount,
      totalGamesPlayed: results.length,
    },
    globalMode: matrix.globalMode,
    telegramUrl: matrix.telegramUrl,
    seo: {
      title: settingsMap.SEO_TITLE || "لعبتنا | ألعاب جماعية أونلاين للأصدقاء بدون تسجيل",
      description: settingsMap.SEO_DESCRIPTION || "لعبتنا جمعتنا — منصة ألعاب جماعية أونلاين للأصدقاء بدون تسجيل. العب الكلمة السرية، الأسئلة العامة، خمن المشهد والتحدي السريع على الجوال والكمبيوتر.",
      keywords: settingsMap.SEO_KEYWORDS || "ألعاب جماعية أونلاين, ألعاب جماعية للأصدقاء, ألعاب بدون تسجيل, ألعاب بدون تحميل, ألعاب جماعية على الجوال, ألعاب أونلاين مجانية, ألعاب جماعية عربية, ألعاب للأصدقاء, ألعاب للسهرات والجلسات, ألعاب ذكاء وتخمين, ألعاب أسئلة وأجوبة, ألعاب تنافسية للأصدقاء",
      canonicalUrl: settingsMap.SEO_CANONICAL || "",
      ogImage: settingsMap.SEO_OG_IMAGE || "",
      googleVerification: settingsMap.GOOGLE_VERIFICATION || "",
      bingVerification: settingsMap.BING_VERIFICATION || "",
      secretTitle: settingsMap.SEO_SECRET_TITLE || "الكلمة السرية | لعبة جماعية لاكتشاف المتخفي | لعبتنا",
      secretDesc: settingsMap.SEO_SECRET_DESC || "لعبة الكلمة السرية من لعبتنا — لعبة جماعية للأصدقاء تعتمد على الأسئلة والنقاش واكتشاف اللاعب المتخفي. العب أونلاين أو على نفس الهاتف.",
      quizTitle: settingsMap.SEO_QUIZ_TITLE || "الأسئلة العامة | لعبة أسئلة جماعية للأصدقاء | لعبتنا",
      quizDesc: settingsMap.SEO_QUIZ_DESC || "اختبر معلوماتك مع أصدقائك في لعبة الأسئلة العامة من لعبتنا. أسئلة في الجغرافيا والتاريخ والعلوم والرياضة والثقافة وغيرها.",
      sceneTitle: settingsMap.SEO_SCENE_TITLE || "خمن المشهد | لعبة تمثيل وتخمين جماعية | لعبتنا",
      sceneDesc: settingsMap.SEO_SCENE_DESC || "خمن المشهد مع أصدقائك في لعبة جماعية ممتعة تعتمد على التمثيل والتخمين والسرعة. العب على نفس الهاتف أو أونلاين.",
      rushTitle: settingsMap.SEO_RUSH_TITLE || "التحدي السريع | ألعاب سرعة وذكاء جماعية | لعبتنا",
      rushDesc: settingsMap.SEO_RUSH_DESC || "اختبر سرعة رد فعلك وذاكرتك وتركيزك في التحدي السريع من لعبتنا. تحديات قصيرة ومنافسة جماعية للأصدقاء.",
    },
    games: matrix.rawGames,
    categories: matrix.rawCategories,
    features: matrix.rawFeatures,
    users: userRows,
    requests: requests.map((r) => ({
      id: r.id,
      userId: r.userId,
      email: r.email,
      displayName: r.displayName,
      status: r.status,
      adminNotes: r.adminNotes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}

export async function GET() {
  const authed = await isAdminAuthenticated();
  if (!authed) return Response.json({ authenticated: false }, { status: 401 });
  return Response.json(await buildAdminDashboardPayload());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      passcode?: string;
      globalMode?: GlobalAccessMode;
      telegramUrl?: string;
      gameKey?: string;
      categoryKey?: string;
      featureKey?: string;
      tier?: AccessTier;
      userId?: string;
      isPremium?: boolean;
      requestId?: string;
      decision?: "Approved" | "Rejected";
      adminNotes?: string;
      nameAr?: string;
      nameEn?: string;
      descriptionAr?: string;
    };

    if (body.action === "login") {
      const ok = verifyAdminPasscodeServerSide(typeof body.passcode === "string" ? body.passcode : "");
      if (!ok) {
        return Response.json({ error: "كلمة المرور غير صحيحة" }, { status: 401 });
      }
      await setAdminSessionCookie();
      return Response.json(await buildAdminDashboardPayload());
    }

    if (body.action === "logout") {
      await clearAdminSessionCookie();
      return Response.json({ authenticated: false });
    }

    const authed = await isAdminAuthenticated();
    if (!authed) {
      return Response.json({ error: "غير مصرح بالوصول إلى لوحة المشرف" }, { status: 403 });
    }

    if (body.action === "setGlobalMode") {
      const mode: GlobalAccessMode = ["EVERYTHING_FREE", "MIXED", "PREMIUM"].includes(body.globalMode as string)
        ? (body.globalMode as GlobalAccessMode)
        : "EVERYTHING_FREE";
      await db
        .insert(adminSettings)
        .values({ settingKey: "GLOBAL_ACCESS_MODE", settingValue: mode, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: adminSettings.settingKey,
          set: { settingValue: mode, updatedAt: new Date() },
        });
      return Response.json(await buildAdminDashboardPayload());
    }

    if (body.action === "setTelegramUrl") {
      const url = typeof body.telegramUrl === "string" ? body.telegramUrl.trim().slice(0, 180) : "";
      await db
        .insert(adminSettings)
        .values({ settingKey: "ADMIN_TELEGRAM_URL", settingValue: url, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: adminSettings.settingKey,
          set: { settingValue: url, updatedAt: new Date() },
        });
      return Response.json(await buildAdminDashboardPayload());
    }

    if (body.action === "setSeoSettings") {
      const seoData = (body as {
        seo?: {
          title?: string;
          description?: string;
          keywords?: string;
          canonicalUrl?: string;
          ogImage?: string;
          googleVerification?: string;
          bingVerification?: string;
          secretTitle?: string;
          secretDesc?: string;
          quizTitle?: string;
          quizDesc?: string;
          sceneTitle?: string;
          sceneDesc?: string;
          rushTitle?: string;
          rushDesc?: string;
        };
      }).seo ?? {};
      const updates = [
        { settingKey: "SEO_TITLE", settingValue: (seoData.title || "").slice(0, 160) },
        { settingKey: "SEO_DESCRIPTION", settingValue: (seoData.description || "").slice(0, 320) },
        { settingKey: "SEO_KEYWORDS", settingValue: (seoData.keywords || "").slice(0, 320) },
        { settingKey: "SEO_CANONICAL", settingValue: (seoData.canonicalUrl || "").slice(0, 180) },
        { settingKey: "SEO_OG_IMAGE", settingValue: (seoData.ogImage || "").slice(0, 240) },
        { settingKey: "GOOGLE_VERIFICATION", settingValue: (seoData.googleVerification || "").slice(0, 120) },
        { settingKey: "BING_VERIFICATION", settingValue: (seoData.bingVerification || "").slice(0, 120) },
        { settingKey: "SEO_SECRET_TITLE", settingValue: (seoData.secretTitle || "").slice(0, 160) },
        { settingKey: "SEO_SECRET_DESC", settingValue: (seoData.secretDesc || "").slice(0, 320) },
        { settingKey: "SEO_QUIZ_TITLE", settingValue: (seoData.quizTitle || "").slice(0, 160) },
        { settingKey: "SEO_QUIZ_DESC", settingValue: (seoData.quizDesc || "").slice(0, 320) },
        { settingKey: "SEO_SCENE_TITLE", settingValue: (seoData.sceneTitle || "").slice(0, 160) },
        { settingKey: "SEO_SCENE_DESC", settingValue: (seoData.sceneDesc || "").slice(0, 320) },
        { settingKey: "SEO_RUSH_TITLE", settingValue: (seoData.rushTitle || "").slice(0, 160) },
        { settingKey: "SEO_RUSH_DESC", settingValue: (seoData.rushDesc || "").slice(0, 320) },
      ];
      for (const item of updates) {
        await db
          .insert(adminSettings)
          .values({ ...item, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: adminSettings.settingKey,
            set: { settingValue: item.settingValue, updatedAt: new Date() },
          });
      }
      return Response.json(await buildAdminDashboardPayload());
    }

    if (body.action === "setGameTier" && body.gameKey) {
      const tier: AccessTier = body.tier === "PREMIUM" ? "PREMIUM" : "FREE";
      await db
        .update(gameAccess)
        .set({ tier, updatedAt: new Date() })
        .where(eq(gameAccess.gameKey, body.gameKey));
      return Response.json(await buildAdminDashboardPayload());
    }

    if (body.action === "setCategoryTier" && body.categoryKey) {
      const tier: AccessTier = body.tier === "PREMIUM" ? "PREMIUM" : "FREE";
      await db
        .update(categoryAccess)
        .set({ tier, updatedAt: new Date() })
        .where(eq(categoryAccess.categoryKey, body.categoryKey));
      return Response.json(await buildAdminDashboardPayload());
    }

    if (body.action === "setFeatureTier" && body.featureKey) {
      const tier: AccessTier = body.tier === "PREMIUM" ? "PREMIUM" : "FREE";
      await db
        .update(featureAccess)
        .set({ tier, updatedAt: new Date() })
        .where(eq(featureAccess.featureKey, body.featureKey));
      return Response.json(await buildAdminDashboardPayload());
    }

    if (body.action === "addFeature" && body.featureKey && body.nameAr) {
      const cleanKey = body.featureKey.trim().toLowerCase().replace(/[^a-z0-9_:-]/g, "_").slice(0, 40);
      if (cleanKey) {
        await db
          .insert(featureAccess)
          .values({
            featureKey: cleanKey,
            nameAr: body.nameAr.trim().slice(0, 60),
            nameEn: (body.nameEn || body.nameAr).trim().slice(0, 60),
            descriptionAr: (body.descriptionAr || "").trim().slice(0, 120),
            tier: body.tier === "PREMIUM" ? "PREMIUM" : "FREE",
          })
          .onConflictDoNothing();
      }
      return Response.json(await buildAdminDashboardPayload());
    }

    if (body.action === "setUserPremium" && body.userId) {
      const isPremium = Boolean(body.isPremium);
      await db
        .insert(userSubscriptions)
        .values({
          userId: body.userId,
          isPremium,
          activatedBy: "admin",
          notes: body.adminNotes ?? "",
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userSubscriptions.userId,
          set: {
            isPremium,
            activatedBy: "admin",
            notes: body.adminNotes ?? "",
            updatedAt: new Date(),
          },
        });
      return Response.json(await buildAdminDashboardPayload());
    }

    if (body.action === "decideRequest" && body.requestId && body.decision) {
      const [reqRow] = await db
        .select()
        .from(subscriptionRequests)
        .where(eq(subscriptionRequests.id, body.requestId))
        .limit(1);

      if (reqRow) {
        await db
          .update(subscriptionRequests)
          .set({
            status: body.decision,
            adminNotes: typeof body.adminNotes === "string" ? body.adminNotes.slice(0, 160) : reqRow.adminNotes,
            updatedAt: new Date(),
          })
          .where(eq(subscriptionRequests.id, reqRow.id));

        const activate = body.decision === "Approved";
        await db
          .insert(userSubscriptions)
          .values({
            userId: reqRow.userId,
            isPremium: activate,
            activatedBy: "admin_request",
            notes: body.adminNotes ?? "",
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: userSubscriptions.userId,
            set: {
              isPremium: activate,
              activatedBy: "admin_request",
              notes: body.adminNotes ?? "",
              updatedAt: new Date(),
            },
          });
      }
      return Response.json(await buildAdminDashboardPayload());
    }

    return Response.json({ error: "أمر إداري غير معروف" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "تعذر تنفيذ الأمر الإداري" }, { status: 500 });
  }
}
