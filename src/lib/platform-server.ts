import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  adminSettings,
  categoryAccess,
  featureAccess,
  gameAccess,
  gameResults,
  gameSessions,
  subscriptionRequests,
  userProfiles,
  users,
  userSubscriptions,
} from "@/db/schema";
import { wordBank } from "@/lib/categories";
import { quizCategories } from "@/lib/quiz-data";
import { sceneCategories } from "@/lib/scene-data";
import { rushChallengeCatalog } from "@/lib/rush";

export type GlobalAccessMode = "EVERYTHING_FREE" | "MIXED" | "PREMIUM";
export type AccessTier = "FREE" | "PREMIUM";

const USER_COOKIE = "laabtna_user_session";
const ADMIN_COOKIE = "laabtna_admin_session";

function sessionSecret() {
  return process.env.SESSION_SECRET || "laabtna_fallback_hmac_secret_do_not_expose";
}

export function makeEntityId(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;
  const derived = scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, "hex");
  if (derived.length !== storedBuf.length) return false;
  return timingSafeEqual(derived, storedBuf);
}

function signToken(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken<T extends Record<string, unknown>>(token?: string | null): T | null {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp?: number };
    if (parsed.exp && parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setUserSessionCookie(userId: string) {
  const jar = await cookies();
  const token = signToken({ sub: userId, role: "user", exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
  jar.set(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearUserSessionCookie() {
  const jar = await cookies();
  jar.delete(USER_COOKIE);
}

export async function setAdminSessionCookie() {
  const jar = await cookies();
  const token = signToken({ role: "admin", exp: Date.now() + 1000 * 60 * 60 * 12 });
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSessionCookie() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  const parsed = verifyToken<{ role?: string }>(token);
  return parsed?.role === "admin";
}

export function verifyAdminPasscodeServerSide(candidate: string): boolean {
  const configured = (process.env.ADMIN_PASSCODE || "9770327").trim();
  if (!configured || !candidate) return false;
  const a = Buffer.from(candidate.trim());
  const b = Buffer.from(configured);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

let seededDefaults = false;

export async function ensurePlatformCatalogSeeded() {
  if (seededDefaults) return;
  await db
    .insert(adminSettings)
    .values([
      { settingKey: "GLOBAL_ACCESS_MODE", settingValue: "EVERYTHING_FREE" },
      { settingKey: "ADMIN_TELEGRAM_URL", settingValue: "https://t.me/" },
    ])
    .onConflictDoNothing();

  await db
    .insert(gameAccess)
    .values([
      { gameKey: "secret", nameAr: "🎭 الكلمة السرية", nameEn: "🎭 The Secret Word", tier: "FREE" },
      { gameKey: "quiz", nameAr: "🧠 الأسئلة العامة", nameEn: "🧠 General Questions", tier: "FREE" },
      { gameKey: "scene", nameAr: "🎬 خمن المشهد", nameEn: "🎬 Guess the Scene", tier: "FREE" },
      { gameKey: "rush", nameAr: "⚡ التحدي السريع", nameEn: "⚡ Quick Challenge", tier: "FREE" },
    ])
    .onConflictDoNothing();

  const categoryRows = [
    ...wordBank.map((c) => ({
      categoryKey: `secret:${c.id}`,
      gameKey: "secret",
      nameAr: c.ar,
      nameEn: c.en,
      tier: "FREE",
    })),
    ...quizCategories.map((c) => ({
      categoryKey: `quiz:${c.id}`,
      gameKey: "quiz",
      nameAr: c.ar,
      nameEn: c.en,
      tier: "FREE",
    })),
    ...sceneCategories.map((c) => ({
      categoryKey: `scene:${c.id}`,
      gameKey: "scene",
      nameAr: c.ar,
      nameEn: c.en,
      tier: "FREE",
    })),
    ...rushChallengeCatalog.map((c) => ({
      categoryKey: `rush:${c.id}`,
      gameKey: "rush",
      nameAr: `${c.icon} ${c.ar}`,
      nameEn: `${c.icon} ${c.en}`,
      tier: "FREE",
    })),
  ];
  await db.insert(categoryAccess).values(categoryRows).onConflictDoNothing();

  await db
    .insert(featureAccess)
    .values([
      {
        featureKey: "secret_extra_round",
        nameAr: "جولة أسئلة إضافية (الكلمة السرية)",
        nameEn: "Extra Question Round (Secret Word)",
        descriptionAr: "السماح بفتح جولة أسئلة إضافية قبل النقاش",
        tier: "FREE",
      },
      {
        featureKey: "scene_speed_mode",
        nameAr: "نمط السرعة القصوى (خمن المشهد)",
        nameEn: "Speed Mode (Guess the Scene)",
        descriptionAr: "تخمين أكبر عدد من المشاهد قبل نفاد الوقت",
        tier: "FREE",
      },
      {
        featureKey: "rush_special_rounds",
        nameAr: "الجولات الخاصة (التحدي السريع)",
        nameEn: "Special Rounds (Quick Challenge)",
        descriptionAr: "تفعيل جولات النقاط المضاعفة والفرصة الواحدة",
        tier: "FREE",
      },
      {
        featureKey: "cloud_continue_save",
        nameAr: "حفظ ومتابعة الألعاب غير المكتملة",
        nameEn: "Save & Continue Unfinished Games",
        descriptionAr: "حفظ التقدم والعودة لاحقًا من حسابي",
        tier: "FREE",
      },
      {
        featureKey: "detailed_analytics",
        nameAr: "إحصاءات الأداء المتقدمة",
        nameEn: "Advanced Performance Analytics",
        descriptionAr: "عرض تفاصيل النتائج والسرعة والسلاسل في سجل النتائج",
        tier: "FREE",
      },
    ])
    .onConflictDoNothing();

  seededDefaults = true;
}

export async function getAuthenticatedUser() {
  const jar = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  const parsed = verifyToken<{ sub?: string; role?: string }>(token);
  if (!parsed?.sub || parsed.role !== "user") return null;

  const [user] = await db.select().from(users).where(eq(users.id, parsed.sub)).limit(1);
  if (!user) return null;
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
  const [sub] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, user.id)).limit(1);
  const requests = await db
    .select()
    .from(subscriptionRequests)
    .where(eq(subscriptionRequests.userId, user.id))
    .orderBy(desc(subscriptionRequests.createdAt))
    .limit(5);

  return {
    id: user.id,
    email: user.email,
    displayName: profile?.displayName ?? user.email.split("@")[0],
    createdAt: user.createdAt.toISOString(),
    isPremium: Boolean(sub?.isPremium),
    gamesPlayed: profile?.gamesPlayed ?? 0,
    bestScore: profile?.bestScore ?? 0,
    latestRequestStatus: requests[0]?.status ?? null,
    requests: requests.map((r) => ({
      id: r.id,
      status: r.status,
      adminNotes: r.adminNotes,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function getPublicAccessMatrix() {
  await ensurePlatformCatalogSeeded();
  const settings = await db.select().from(adminSettings);
  const settingsMap = Object.fromEntries(settings.map((s) => [s.settingKey, s.settingValue]));
  const globalMode = (settingsMap.GLOBAL_ACCESS_MODE as GlobalAccessMode) || "EVERYTHING_FREE";
  const telegramUrl = settingsMap.ADMIN_TELEGRAM_URL || "";

  const games = await db.select().from(gameAccess);
  const categories = await db.select().from(categoryAccess);
  const features = await db.select().from(featureAccess);

  const resolveEffectiveTier = (rawTier: string): AccessTier => {
    if (globalMode === "EVERYTHING_FREE") return "FREE";
    if (globalMode === "PREMIUM") return "PREMIUM";
    return rawTier === "PREMIUM" ? "PREMIUM" : "FREE";
  };

  return {
    globalMode,
    telegramUrl,
    games: Object.fromEntries(games.map((g) => [g.gameKey, resolveEffectiveTier(g.tier)])),
    rawGames: games,
    categories: Object.fromEntries(categories.map((c) => [c.categoryKey, resolveEffectiveTier(c.tier)])),
    rawCategories: categories,
    features: Object.fromEntries(features.map((f) => [f.featureKey, resolveEffectiveTier(f.tier)])),
    rawFeatures: features,
  };
}

export async function canCurrentUserAccess(params: {
  gameKey?: string;
  categoryKeys?: string[];
  featureKeys?: string[];
}): Promise<{ allowed: boolean; reason?: string }> {
  const matrix = await getPublicAccessMatrix();
  if (matrix.globalMode === "EVERYTHING_FREE") return { allowed: true };

  const user = await getAuthenticatedUser();
  if (user?.isPremium) return { allowed: true };

  if (params.gameKey && matrix.games[params.gameKey] === "PREMIUM") {
    return { allowed: false, reason: "LOCKED_GAME" };
  }
  for (const catKey of params.categoryKeys ?? []) {
    if (matrix.categories[catKey] === "PREMIUM") {
      return { allowed: false, reason: "LOCKED_CATEGORY" };
    }
  }
  for (const featKey of params.featureKeys ?? []) {
    if (matrix.features[featKey] === "PREMIUM") {
      return { allowed: false, reason: "LOCKED_FEATURE" };
    }
  }
  return { allowed: true };
}

export async function getUserProfileBundle(userId: string) {
  const results = await db
    .select()
    .from(gameResults)
    .where(eq(gameResults.userId, userId))
    .orderBy(desc(gameResults.createdAt))
    .limit(40);

  const sessions = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.userId, userId))
    .orderBy(desc(gameSessions.updatedAt));

  return {
    results: results.map((r) => ({
      id: r.id,
      gameKey: r.gameKey,
      gameName: r.gameName,
      mode: r.mode,
      score: r.score,
      rounds: r.rounds,
      rankLabel: r.rankLabel,
      stats: r.stats as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
    })),
    unfinishedGames: sessions
      .filter((s) => s.status === "unfinished")
      .map((s) => ({
        id: s.id,
        gameKey: s.gameKey,
        gameName: s.gameName,
        mode: s.mode,
        roomCode: s.roomCode,
        roundNumber: s.roundNumber,
        totalRounds: s.totalRounds,
        score: s.score,
        statePayload: s.statePayload as Record<string, unknown>,
        updatedAt: s.updatedAt.toISOString(),
      })),
  };
}
