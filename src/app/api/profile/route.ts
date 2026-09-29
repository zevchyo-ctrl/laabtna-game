import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { gameResults, gameSessions, subscriptionRequests, userProfiles } from "@/db/schema";
import { getAuthenticatedUser, getUserProfileBundle, makeEntityId } from "@/lib/platform-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "يجب تسجيل الدخول لعرض حسابك" }, { status: 401 });
  const bundle = await getUserProfileBundle(user.id);
  return Response.json({ user, ...bundle });
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return Response.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });

    const body = (await request.json()) as {
      action?: "recordResult" | "saveSession" | "clearSession" | "requestSubscription";
      gameKey?: string;
      gameName?: string;
      mode?: string;
      roomCode?: string | null;
      score?: number;
      rounds?: number;
      roundNumber?: number;
      totalRounds?: number;
      rankLabel?: string;
      stats?: Record<string, unknown>;
      statePayload?: Record<string, unknown>;
      note?: string;
    };

    if (body.action === "recordResult") {
      const gameKey = typeof body.gameKey === "string" ? body.gameKey.slice(0, 24) : "secret";
      const gameName = typeof body.gameName === "string" ? body.gameName.slice(0, 48) : "لعبتنا";
      const mode = body.mode === "online" ? "online" : "local";
      const score = typeof body.score === "number" && Number.isFinite(body.score) ? Math.max(0, Math.round(body.score)) : 0;
      const rounds = typeof body.rounds === "number" && Number.isFinite(body.rounds) ? Math.max(1, Math.round(body.rounds)) : 1;
      const rankLabel = typeof body.rankLabel === "string" ? body.rankLabel.slice(0, 40) : "—";

      await db.insert(gameResults).values({
        id: makeEntityId("res"),
        userId: user.id,
        gameKey,
        gameName,
        mode,
        score,
        rounds,
        rankLabel,
        stats: body.stats ?? {},
      });

      await db
        .update(userProfiles)
        .set({
          gamesPlayed: user.gamesPlayed + 1,
          bestScore: Math.max(user.bestScore, score),
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, user.id));

      await db
        .delete(gameSessions)
        .where(and(eq(gameSessions.userId, user.id), eq(gameSessions.gameKey, gameKey)));

      return Response.json({ ok: true });
    }

    if (body.action === "saveSession") {
      const gameKey = typeof body.gameKey === "string" ? body.gameKey.slice(0, 24) : "secret";
      const gameName = typeof body.gameName === "string" ? body.gameName.slice(0, 48) : "لعبتنا";
      const mode = body.mode === "online" ? "online" : "local";
      const roundNumber = typeof body.roundNumber === "number" ? Math.max(1, Math.round(body.roundNumber)) : 1;
      const totalRounds = typeof body.totalRounds === "number" ? Math.max(1, Math.round(body.totalRounds)) : 1;
      const score = typeof body.score === "number" ? Math.max(0, Math.round(body.score)) : 0;

      const existing = await db
        .select()
        .from(gameSessions)
        .where(and(eq(gameSessions.userId, user.id), eq(gameSessions.gameKey, gameKey)))
        .limit(1);

      if (existing.length) {
        await db
          .update(gameSessions)
          .set({
            gameName,
            mode,
            roomCode: body.roomCode ?? null,
            roundNumber,
            totalRounds,
            score,
            statePayload: body.statePayload ?? {},
            status: "unfinished",
            updatedAt: new Date(),
          })
          .where(eq(gameSessions.id, existing[0].id));
      } else {
        await db.insert(gameSessions).values({
          id: makeEntityId("sess"),
          userId: user.id,
          gameKey,
          gameName,
          mode,
          roomCode: body.roomCode ?? null,
          roundNumber,
          totalRounds,
          score,
          statePayload: body.statePayload ?? {},
          status: "unfinished",
        });
      }
      return Response.json({ ok: true });
    }

    if (body.action === "clearSession") {
      const gameKey = typeof body.gameKey === "string" ? body.gameKey : "";
      if (gameKey) {
        await db
          .delete(gameSessions)
          .where(and(eq(gameSessions.userId, user.id), eq(gameSessions.gameKey, gameKey)));
      }
      return Response.json({ ok: true });
    }

    if (body.action === "requestSubscription") {
      const existingPending = await db
        .select()
        .from(subscriptionRequests)
        .where(and(eq(subscriptionRequests.userId, user.id), eq(subscriptionRequests.status, "Pending")))
        .orderBy(desc(subscriptionRequests.createdAt))
        .limit(1);

      if (existingPending.length) {
        return Response.json({ ok: true, requestId: existingPending[0].id, alreadyPending: true });
      }

      const id = makeEntityId("subreq");
      await db.insert(subscriptionRequests).values({
        id,
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        status: "Pending",
        adminNotes: typeof body.note === "string" ? body.note.slice(0, 140) : "",
      });
      return Response.json({ ok: true, requestId: id });
    }

    return Response.json({ error: "أمر غير معروف" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "تعذر تحديث بيانات الحساب" }, { status: 500 });
  }
}
