import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roomPlayers, rooms } from "@/db/schema";
import { canCurrentUserAccess } from "@/lib/platform-server";
import { safeRushSettings } from "@/lib/rush";
import { rushApiError, rushId, rushRoomCode } from "@/lib/rush-server";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 18) : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "create" | "join";
      nickname?: string;
      code?: string;
      settings?: Record<string, unknown>;
    };
    const nickname = clean(body.nickname);
    if (!nickname) return Response.json({ error: "أدخل اسمًا مستعارًا صحيحًا" }, { status: 400 });

    if (body.action === "join") {
      const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
      if (!room || room.gameType !== "rush") return Response.json({ error: "رمز الغرفة غير صحيح" }, { status: 404 });
      if (room.status !== "lobby") return Response.json({ error: "بدأ التحدي بالفعل" }, { status: 409 });
      const members = await db.select().from(roomPlayers).where(eq(roomPlayers.roomId, room.id));
      if (members.length >= 10) return Response.json({ error: "الغرفة مكتملة" }, { status: 409 });
      if (members.some((member) => member.nickname.toLocaleLowerCase() === nickname.toLocaleLowerCase())) {
        return Response.json({ error: "هذا الاسم مستخدم داخل الغرفة" }, { status: 409 });
      }
      const player = { id: rushId("rush_player"), roomId: room.id, nickname, sessionToken: rushId("rush_session"), isHost: false };
      await db.insert(roomPlayers).values(player);
      return Response.json({ code: room.code, token: player.sessionToken, playerId: player.id });
    }

    if (body.action !== "create") return Response.json({ error: "طلب غير صالح" }, { status: 400 });
    const rawTypes = Array.isArray((body.settings as { challengeTypes?: string[] } | undefined)?.challengeTypes)
      ? ((body.settings as { challengeTypes: string[] }).challengeTypes)
      : [];
    const specialOn = (body.settings as { specialRounds?: boolean } | undefined)?.specialRounds === true;
    const check = await canCurrentUserAccess({
      gameKey: "rush",
      categoryKeys: rawTypes.map((c) => `rush:${c}`),
      featureKeys: specialOn ? ["rush_special_rounds"] : [],
    });
    if (!check.allowed) {
      return Response.json({ error: "🔒 هذه الميزة متاحة ضمن الميزات المتقدمة", code: "PREMIUM_REQUIRED" }, { status: 403 });
    }
    let code = "";
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = rushRoomCode();
      const existing = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, candidate)).limit(1);
      if (!existing.length) {
        code = candidate;
        break;
      }
    }
    if (!code) return Response.json({ error: "تعذر توليد رمز الغرفة" }, { status: 503 });

    const roomId = rushId("rush_room");
    const player = { id: rushId("rush_player"), roomId, nickname, sessionToken: rushId("rush_session"), isHost: true };
    await db.insert(rooms).values({
      id: roomId,
      code,
      mode: "online",
      gameType: "rush",
      hostPlayerId: player.id,
      status: "lobby",
      settings: safeRushSettings(body.settings ?? {}),
      roundNumber: 0,
    });
    await db.insert(roomPlayers).values(player);
    return Response.json({ code, token: player.sessionToken, playerId: player.id });
  } catch (error) {
    return rushApiError(error);
  }
}
