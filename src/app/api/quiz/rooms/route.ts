import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roomPlayers, rooms } from "@/db/schema";
import { canCurrentUserAccess } from "@/lib/platform-server";
import { safeQuizSettings } from "@/lib/quiz";
import { quizApiError, quizId, quizRoomCode } from "@/lib/quiz-server";

function nickname(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 18) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: "create" | "join"; nickname?: string; code?: string; settings?: Record<string, unknown> };
    const name = nickname(body.nickname);
    if (!name) return Response.json({ error: "أدخل اسمًا مستعارًا صحيحًا" }, { status: 400 });

    if (body.action === "join") {
      const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
      if (!room || room.gameType !== "quiz") return Response.json({ error: "رمز الغرفة غير صحيح" }, { status: 404 });
      if (room.status !== "lobby") return Response.json({ error: "بدأت المسابقة بالفعل" }, { status: 409 });
      const players = await db.select().from(roomPlayers).where(eq(roomPlayers.roomId, room.id));
      if (players.length >= 8) return Response.json({ error: "الغرفة مكتملة" }, { status: 409 });
      if (players.some((player) => player.nickname.toLocaleLowerCase() === name.toLocaleLowerCase())) return Response.json({ error: "هذا الاسم مستخدم داخل الغرفة" }, { status: 409 });
      const player = { id: quizId("quiz_player"), roomId: room.id, nickname: name, sessionToken: quizId("quiz_session"), isHost: false };
      await db.insert(roomPlayers).values(player);
      return Response.json({ code: room.code, token: player.sessionToken, playerId: player.id });
    }

    if (body.action !== "create") return Response.json({ error: "طلب غير صالح" }, { status: 400 });
    const rawCats = Array.isArray((body.settings as { categories?: string[] } | undefined)?.categories)
      ? ((body.settings as { categories: string[] }).categories)
      : [];
    const check = await canCurrentUserAccess({
      gameKey: "quiz",
      categoryKeys: rawCats.map((c) => `quiz:${c}`),
    });
    if (!check.allowed) {
      return Response.json({ error: "🔒 هذه الميزة متاحة ضمن الميزات المتقدمة", code: "PREMIUM_REQUIRED" }, { status: 403 });
    }
    let code = "";
    for (let tries = 0; tries < 8; tries += 1) {
      const candidate = quizRoomCode();
      const existing = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, candidate)).limit(1);
      if (!existing.length) { code = candidate; break; }
    }
    if (!code) return Response.json({ error: "تعذر توليد رمز الغرفة" }, { status: 503 });
    const roomId = quizId("quiz_room");
    const player = { id: quizId("quiz_player"), roomId, nickname: name, sessionToken: quizId("quiz_session"), isHost: true };
    await db.insert(rooms).values({ id: roomId, code, mode: "online", gameType: "quiz", hostPlayerId: player.id, status: "lobby", settings: safeQuizSettings(body.settings ?? {}), roundNumber: 0 });
    await db.insert(roomPlayers).values(player);
    return Response.json({ code, token: player.sessionToken, playerId: player.id });
  } catch (error) {
    return quizApiError(error);
  }
}
