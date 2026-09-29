import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roomPlayers, rooms } from "@/db/schema";
import { defaultSettings, generateId, generateRoomCode, safeSettings, type GameMode } from "@/lib/game";
import { canCurrentUserAccess } from "@/lib/platform-server";
import { apiError } from "@/lib/room-server";

function cleanNickname(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 18);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "create" | "join";
      mode?: GameMode;
      nickname?: string;
      playerNames?: string[];
      settings?: Partial<typeof defaultSettings>;
      code?: string;
    };

    if (body.action === "join") {
      const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      const nickname = cleanNickname(body.nickname);
      if (!/^[A-Z2-9]{5}$/.test(code) || !nickname) return Response.json({ error: "أدخل رمز الغرفة واسمًا صحيحًا" }, { status: 400 });
      const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
      if (!room) return Response.json({ error: "رمز الغرفة غير صحيح" }, { status: 404 });
      if (room.mode !== "online" || room.status !== "lobby") return Response.json({ error: "هذه الغرفة بدأت بالفعل أو ليست متاحة للانضمام" }, { status: 409 });
      const existing = await db.select().from(roomPlayers).where(eq(roomPlayers.roomId, room.id));
      if (existing.length >= 10) return Response.json({ error: "الغرفة مكتملة" }, { status: 409 });
      if (existing.some((player) => player.nickname.toLocaleLowerCase() === nickname.toLocaleLowerCase())) {
        return Response.json({ error: "هذا الاسم مستخدم داخل الغرفة" }, { status: 409 });
      }
      const player = {
        id: generateId("player"),
        roomId: room.id,
        nickname,
        sessionToken: generateId("session"),
        isHost: false,
      };
      await db.insert(roomPlayers).values(player);
      return Response.json({ code: room.code, token: player.sessionToken, playerId: player.id });
    }

    if (body.action !== "create") return Response.json({ error: "طلب غير صالح" }, { status: 400 });
    const check = await canCurrentUserAccess({
      gameKey: "secret",
      categoryKeys: (body.settings?.categories ?? []).map((c) => `secret:${c}`),
      featureKeys: body.settings?.allowExtraRound ? ["secret_extra_round"] : [],
    });
    if (!check.allowed) {
      return Response.json({ error: "🔒 هذه الميزة متاحة ضمن الميزات المتقدمة", code: "PREMIUM_REQUIRED" }, { status: 403 });
    }
    const mode: GameMode = body.mode === "local" ? "local" : "online";
    const provided = mode === "local" ? body.playerNames ?? [] : [body.nickname];
    const names = provided.map(cleanNickname).filter(Boolean);
    const unique = new Set(names.map((name) => name.toLocaleLowerCase()));
    if ((mode === "local" && (names.length < 3 || names.length > 10 || unique.size !== names.length)) || (mode === "online" && names.length !== 1)) {
      return Response.json({ error: mode === "local" ? "أدخل من 3 إلى 10 أسماء مختلفة" : "أدخل اسمًا مستعارًا صحيحًا" }, { status: 400 });
    }

    let code = "";
    for (let attempts = 0; attempts < 8; attempts += 1) {
      const candidate = generateRoomCode();
      const existing = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, candidate)).limit(1);
      if (!existing.length) {
        code = candidate;
        break;
      }
    }
    if (!code) return Response.json({ error: "تعذر توليد رمز الغرفة" }, { status: 503 });

    const roomId = generateId("room");
    const players = names.map((nickname, index) => ({
      id: generateId("player"),
      roomId,
      nickname,
      sessionToken: generateId("session"),
      isHost: index === 0,
    }));
    const settings = safeSettings({ ...body.settings, writtenQuestions: mode === "online" && body.settings?.writtenQuestions !== false }, mode === "online" ? 9 : players.length);
    await db.insert(rooms).values({
      id: roomId,
      code,
      mode,
      hostPlayerId: players[0].id,
      status: "lobby",
      settings,
      roundNumber: 0,
    });
    await db.insert(roomPlayers).values(players);

    return Response.json({
      code,
      token: players[0].sessionToken,
      playerId: players[0].id,
      localSessions: mode === "local" ? players.map((player) => ({ id: player.id, nickname: player.nickname, token: player.sessionToken })) : undefined,
    });
  } catch (error) {
    return apiError(error);
  }
}
