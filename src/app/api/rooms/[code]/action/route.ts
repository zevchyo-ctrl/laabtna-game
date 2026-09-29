import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { gameRounds, roomPlayers, rooms, votes } from "@/db/schema";
import {
  buildRoundResult,
  chooseImpostors,
  chooseSecret,
  createFairPairings,
  generateId,
  safeSettings,
  type GamePhase,
  type Pairing,
  type QuestionNote,
} from "@/lib/game";
import {
  apiError,
  assertHost,
  assertRound,
  currentRound,
  findPlayer,
  findRoom,
  roomMembers,
  tokenFromRequest,
  RoomError,
} from "@/lib/room-server";

const phase = (round: { phase: string }) => round.phase as GamePhase;

async function startRound(room: Awaited<ReturnType<typeof findRoom>>, player: Awaited<ReturnType<typeof findPlayer>>) {
  assertHost(player);
  const members = await roomMembers(room.id);
  if (members.length < 3) throw new RoomError("نحتاج ثلاثة محققين على الأقل لفتح القضية", 409);
  const active = await currentRound(room.id, room.roundNumber);
  if (room.status !== "lobby" && phase(assertRound(active)) !== "result") {
    throw new RoomError("الجولة الحالية لم تنتهِ بعد", 409);
  }
  const settings = safeSettings(room.settings as Record<string, unknown>, members.length);
  const nextNumber = room.roundNumber + 1;
  const secret = chooseSecret(settings.categories);
  const memberIds = members.map((member) => member.id);
  await db.insert(gameRounds).values({
    id: generateId("round"),
    roomId: room.id,
    number: nextNumber,
    phase: "opening",
    secretWord: secret.word,
    category: secret.category,
    impostorIds: chooseImpostors(memberIds, settings.impostorCount),
    pairings: createFairPairings(memberIds, settings.questionRounds),
    questionRound: 1,
    turnIndex: 0,
    questionLog: [],
  });
  await db.update(rooms).set({ status: "playing", roundNumber: nextNumber, settings, updatedAt: new Date() }).where(eq(rooms.id, room.id));
}

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const token = tokenFromRequest(request);
    const body = (await request.json()) as { action?: string; targetId?: string; text?: string };
    const room = await findRoom(code);
    const player = await findPlayer(room.id, token);

    if (body.action === "start" || body.action === "nextRound") {
      await startRound(room, player);
      return Response.json({ ok: true });
    }

    if (body.action === "leave") {
      await db.update(roomPlayers).set({ isConnected: false }).where(eq(roomPlayers.id, player.id));
      return Response.json({ ok: true });
    }

    if (body.action === "kick") {
      assertHost(player);
      if (room.status !== "lobby") throw new RoomError("يمكن إدارة الأسماء قبل بدء القضية فقط", 409);
      if (!body.targetId || body.targetId === player.id) throw new RoomError("لا يمكنك إزالة مدير الغرفة", 400);
      await db.delete(roomPlayers).where(and(eq(roomPlayers.roomId, room.id), eq(roomPlayers.id, body.targetId)));
      return Response.json({ ok: true });
    }

    const round = assertRound(await currentRound(room.id, room.roundNumber));
    const currentPhase = phase(round);
    const members = await roomMembers(room.id);

    if (body.action === "sendQuestion") {
      if (room.mode !== "online" || !(room.settings as { writtenQuestions?: boolean }).writtenQuestions) {
        throw new RoomError("الأسئلة المكتوبة غير مفعلة في هذه القضية", 409);
      }
      if (currentPhase !== "questions") throw new RoomError("جولات الأسئلة ليست نشطة", 409);
      const pairings = round.pairings as Pairing[][];
      const active = pairings[round.questionRound - 1]?.[round.turnIndex];
      if (!active || active.askerId !== player.id) throw new RoomError("هذه ليست مهمتك في السؤال", 403);
      const text = typeof body.text === "string" ? body.text.trim().slice(0, 140) : "";
      if (!text) throw new RoomError("اكتب سؤالاً قصيرًا أولاً", 400);
      const log = (round.questionLog as QuestionNote[]).filter((note) => note.turn !== round.turnIndex);
      log.push({ ...active, turn: round.turnIndex, text });
      await db.update(gameRounds).set({ questionLog: log }).where(eq(gameRounds.id, round.id));
      return Response.json({ ok: true });
    }

    if (body.action === "advanceQuestion") {
      if (currentPhase !== "questions") throw new RoomError("لا يوجد دور أسئلة نشط", 409);
      const pairings = round.pairings as Pairing[][];
      const activeRound = pairings[round.questionRound - 1] ?? [];
      const active = activeRound[round.turnIndex];
      if (!active) throw new RoomError("تعذر تحديد دور السؤال", 409);
      if (!player.isHost && active.askerId !== player.id && active.targetId !== player.id) throw new RoomError("انتظر دورك في التحقيق", 403);
      const lastTurn = round.turnIndex + 1 >= activeRound.length;
      if (lastTurn && round.questionRound >= pairings.length) {
        await db.update(gameRounds).set({ phase: "questionsComplete" }).where(eq(gameRounds.id, round.id));
      } else if (lastTurn) {
        await db.update(gameRounds).set({ questionRound: round.questionRound + 1, turnIndex: 0 }).where(eq(gameRounds.id, round.id));
      } else {
        await db.update(gameRounds).set({ turnIndex: round.turnIndex + 1 }).where(eq(gameRounds.id, round.id));
      }
      return Response.json({ ok: true });
    }

    if (body.action === "extraRound") {
      assertHost(player);
      if (currentPhase !== "questionsComplete" || !(room.settings as { allowExtraRound?: boolean }).allowExtraRound) {
        throw new RoomError("الجولة الإضافية غير متاحة", 409);
      }
      const pairings = round.pairings as Pairing[][];
      const extraPairings = createFairPairings(members.map((member) => member.id), 1)[0];
      await db
        .update(gameRounds)
        .set({ phase: "questions", pairings: [...pairings, extraPairings], questionRound: pairings.length + 1, turnIndex: 0 })
        .where(eq(gameRounds.id, round.id));
      return Response.json({ ok: true });
    }

    if (body.action === "vote") {
      if (currentPhase !== "voting") throw new RoomError("التصويت لم يبدأ بعد", 409);
      const target = members.find((member) => member.id === body.targetId);
      if (!target || target.id === player.id) throw new RoomError("اختر مشتبهًا آخر", 400);
      await db.delete(votes).where(and(eq(votes.roundId, round.id), eq(votes.voterId, player.id)));
      await db.insert(votes).values({ id: generateId("vote"), roundId: round.id, voterId: player.id, targetId: target.id });
      return Response.json({ ok: true });
    }

    if (body.action === "reveal") {
      assertHost(player);
      if (currentPhase !== "voting") throw new RoomError("لم نصل للتصويت بعد", 409);
      const allVotes = await db.select().from(votes).where(eq(votes.roundId, round.id));
      if (allVotes.length < members.length) throw new RoomError("ما زلنا ننتظر أصوات جميع اللاعبين", 409);
      const impostorIds = round.impostorIds as string[];
      const result = buildRoundResult(members.map((member) => member.id), impostorIds, allVotes);
      for (const member of members) {
        const addition = result.points[member.id] ?? 0;
        if (addition) await db.update(roomPlayers).set({ score: member.score + addition }).where(eq(roomPlayers.id, member.id));
      }
      await db
        .update(gameRounds)
        .set({
          phase: "reveal",
          revealData: { ...result, impostorIds, secretWord: round.secretWord, category: round.category },
        })
        .where(eq(gameRounds.id, round.id));
      return Response.json({ ok: true });
    }

    if (body.action === "advance") {
      assertHost(player);
      const next: Partial<Record<GamePhase, GamePhase>> = {
        opening: "secret",
        secret: "questions",
        questionsComplete: "discussion",
        discussion: "voting",
        reveal: "result",
      };
      const nextPhase = next[currentPhase];
      if (!nextPhase) throw new RoomError("هذه المرحلة لا تنتقل بهذه الطريقة", 409);
      await db.update(gameRounds).set({ phase: nextPhase, ...(nextPhase === "result" ? { endedAt: new Date() } : {}) }).where(eq(gameRounds.id, round.id));
      return Response.json({ ok: true });
    }

    throw new RoomError("أمر غير معروف", 400);
  } catch (error) {
    return apiError(error);
  }
}
