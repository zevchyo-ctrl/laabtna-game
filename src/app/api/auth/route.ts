import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userProfiles, users, userSubscriptions } from "@/db/schema";
import {
  clearUserSessionCookie,
  getAuthenticatedUser,
  getPublicAccessMatrix,
  getUserProfileBundle,
  hashPassword,
  makeEntityId,
  setUserSessionCookie,
  verifyPassword,
} from "@/lib/platform-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [user, access] = await Promise.all([getAuthenticatedUser(), getPublicAccessMatrix()]);
    const bundle = user ? await getUserProfileBundle(user.id) : { results: [], unfinishedGames: [] };
    return Response.json({
      user,
      results: bundle.results,
      unfinishedGames: bundle.unfinishedGames,
      access: {
        globalMode: access.globalMode,
        telegramUrl: access.telegramUrl,
        games: access.games,
        categories: access.categories,
        features: access.features,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "تعذر تحميل بيانات الحساب" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "register" | "login" | "logout";
      email?: string;
      password?: string;
      displayName?: string;
    };

    if (body.action === "logout") {
      await clearUserSessionCookie();
      return Response.json({ ok: true });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "أدخل بريدًا إلكترونيًا صحيحًا" }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
    }

    if (body.action === "register") {
      const displayName =
        typeof body.displayName === "string" && body.displayName.trim()
          ? body.displayName.trim().slice(0, 28)
          : email.split("@")[0];
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing.length) {
        return Response.json({ error: "هذا البريد الإلكتروني مسجل مسبقًا" }, { status: 409 });
      }

      const userId = makeEntityId("user");
      await db.insert(users).values({
        id: userId,
        email,
        passwordHash: hashPassword(password),
      });
      await db.insert(userProfiles).values({
        userId,
        displayName,
        gamesPlayed: 0,
        bestScore: 0,
      });
      await db.insert(userSubscriptions).values({
        userId,
        isPremium: false,
      });

      await setUserSessionCookie(userId);
      const user = await getAuthenticatedUser();
      return Response.json({ ok: true, user });
    }

    if (body.action === "login") {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return Response.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
      }
      await setUserSessionCookie(user.id);
      const authUser = await getAuthenticatedUser();
      const bundle = authUser ? await getUserProfileBundle(authUser.id) : { results: [], unfinishedGames: [] };
      return Response.json({ ok: true, user: authUser, ...bundle });
    }

    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "تعذر إتمام عملية المصادقة" }, { status: 500 });
  }
}
