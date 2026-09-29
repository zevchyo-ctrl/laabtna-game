import { randomBytes, randomInt } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { roomPlayers, rooms, rushGames, rushPlayerStats, rushTurns } from "@/db/schema";
import {
  calculateRushScore,
  evaluateRushSubmission,
  generateRushChallenge,
  safeRushSettings,
  type RushChallengePublic,
  type RushChallengeSecret,
  type RushSettings,
} from "@/lib/rush";

export class RushError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function rushId(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

export function rushRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => chars[randomInt(chars.length)]).join("");
}

export async function rushRoomByCode(codeInput: string) {
  const [room] = await db.select().from(rooms).where(eq(rooms.code, codeInput.trim().toUpperCase())).limit(1);
  if (!room || room.gameType !== "rush") throw new RushError("رمز الغرفة غير صحيح", 404);
  return room;
}

async function rushRoomById(roomId: string) {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!room || room.gameType !== "rush") throw new RushError("الغرفة غير موجودة", 404);
  return room;
}

export async function rushPlayer(roomId: string, token: string) {
  const [player] = await db
    .select()
    .from(roomPlayers)
    .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.sessionToken, token)))
    .limit(1);
  if (!player) throw new RushError("جلسة اللاعب غير موجودة", 403);
  return player;
}

export async function rushMembers(roomId: string) {
  return db.select().from(roomPlayers).where(eq(roomPlayers.roomId, roomId)).orderBy(roomPlayers.joinedAt);
}

async function rushGameForRoom(roomId: string) {
  const [game] = await db.select().from(rushGames).where(eq(rushGames.roomId, roomId)).limit(1);
  return game ?? null;
}

async function currentTurn(game: NonNullable<Awaited<ReturnType<typeof rushGameForRoom>>>) {
  if (!game.currentTurnId) return null;
  const [turn] = await db.select().from(rushTurns).where(eq(rushTurns.id, game.currentTurnId)).limit(1);
  return turn ?? null;
}

async function createActiveTurn(
  game: NonNullable<Awaited<ReturnType<typeof rushGameForRoom>>>,
  roomId: string,
  playerId: string,
  roundNumber: number,
  turnIndex: number,
) {
  const settings = safeRushSettings(game.settings as Partial<RushSettings>);
  const prevTurn = await currentTurn(game);
  const prevType = prevTurn ? (prevTurn.challengePublic as RushChallengePublic).type : undefined;
  const bundle = generateRushChallenge(settings, roundNumber, prevType);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + bundle.publicChallenge.durationMs);
  const turnId = rushId("rush_turn");

  await db.insert(rushTurns).values({
    id: turnId,
    gameId: game.id,
    roomId,
    roundNumber,
    turnIndex,
    playerId,
    challengePublic: bundle.publicChallenge,
    challengeSecret: bundle.secret,
    status: "active",
    pointsEarned: 0,
    startedAt: now,
    expiresAt,
  });

  await db
    .update(rushGames)
    .set({ status: "challenge", roundNumber, turnIndex, currentTurnId: turnId, updatedAt: now })
    .where(eq(rushGames.id, game.id));
}

async function resolveTurn(
  game: NonNullable<Awaited<ReturnType<typeof rushGameForRoom>>>,
  turn: NonNullable<Awaited<ReturnType<typeof currentTurn>>>,
  status: "correct" | "wrong" | "timeout",
  elapsedMs: number,
) {
  if (turn.status !== "active") return;
  const challenge = turn.challengePublic as RushChallengePublic;
  const points = calculateRushScore({
    correct: status === "correct",
    elapsedMs,
    durationMs: challenge.durationMs,
    difficulty: challenge.difficulty,
    special: challenge.special,
  });

  const [stat] = await db
    .select()
    .from(rushPlayerStats)
    .where(and(eq(rushPlayerStats.gameId, game.id), eq(rushPlayerStats.playerId, turn.playerId)))
    .limit(1);

  if (stat) {
    const nextStreak = status === "correct" ? stat.currentStreak + 1 : 0;
    const bestStreak = Math.max(stat.bestStreak, nextStreak);
    const fastestMs =
      status === "correct"
        ? stat.fastestMs === null
          ? elapsedMs
          : Math.min(stat.fastestMs, elapsedMs)
        : stat.fastestMs;
    await db
      .update(rushPlayerStats)
      .set({
        correctCount: stat.correctCount + (status === "correct" ? 1 : 0),
        wrongCount: stat.wrongCount + (status === "wrong" ? 1 : 0),
        timeoutCount: stat.timeoutCount + (status === "timeout" ? 1 : 0),
        currentStreak: nextStreak,
        bestStreak,
        fastestMs,
      })
      .where(eq(rushPlayerStats.id, stat.id));
  }

  if (points > 0) {
    const [player] = await db.select().from(roomPlayers).where(eq(roomPlayers.id, turn.playerId)).limit(1);
    if (player) {
      await db.update(roomPlayers).set({ score: player.score + points }).where(eq(roomPlayers.id, player.id));
    }
  }

  await db
    .update(rushTurns)
    .set({
      status,
      pointsEarned: points,
      responseMs: status === "timeout" ? challenge.durationMs : elapsedMs,
      resolvedAt: new Date(),
    })
    .where(eq(rushTurns.id, turn.id));

  await db.update(rushGames).set({ status: "result", updatedAt: new Date() }).where(eq(rushGames.id, game.id));
}

export async function resolveExpiredRushTurn(roomId: string) {
  const game = await rushGameForRoom(roomId);
  if (!game || game.status !== "challenge") return;
  const turn = await currentTurn(game);
  if (turn?.status === "active" && turn.expiresAt.getTime() <= Date.now()) {
    const challenge = turn.challengePublic as RushChallengePublic;
    await resolveTurn(game, turn, "timeout", challenge.durationMs);
  }
}

function publicPlayer(player: { id: string; nickname: string; isHost: boolean; isConnected: boolean; score: number }) {
  return {
    id: player.id,
    nickname: player.nickname,
    isHost: player.isHost,
    isConnected: player.isConnected,
    score: player.score,
  };
}

export async function rushSnapshot(code: string, token: string) {
  const room = await rushRoomByCode(code);
  const self = await rushPlayer(room.id, token);
  await db.update(roomPlayers).set({ isConnected: true }).where(eq(roomPlayers.id, self.id));
  await resolveExpiredRushTurn(room.id);
  const players = await rushMembers(room.id);
  const game = await rushGameForRoom(room.id);
  const base = {
    room: { code: room.code, mode: room.mode, gameType: room.gameType, status: room.status, settings: room.settings as RushSettings },
    self: publicPlayer(self),
    players: players.map(publicPlayer),
  };
  if (!game) return base;
  const refreshed = await rushGameForRoom(room.id);
  if (!refreshed) return base;
  const turn = await currentTurn(refreshed);
  const stats = await db.select().from(rushPlayerStats).where(eq(rushPlayerStats.gameId, refreshed.id));
  const statMap = Object.fromEntries(
    stats.map((stat) => [
      stat.playerId,
      {
        correct: stat.correctCount,
        wrong: stat.wrongCount,
        timeout: stat.timeoutCount,
        streak: stat.currentStreak,
        bestStreak: stat.bestStreak,
        fastestMs: stat.fastestMs,
      },
    ]),
  );

  const pub = turn?.challengePublic as RushChallengePublic | undefined;

  return {
    ...base,
    game: {
      status: refreshed.status,
      roundNumber: refreshed.roundNumber,
      totalRounds: safeRushSettings(refreshed.settings as Partial<RushSettings>).rounds,
      turnIndex: refreshed.turnIndex,
      currentPlayerId: turn?.playerId ?? null,
      currentTurnId: turn?.id ?? null,
      special: pub?.special ?? "none",
      challengeTitle: pub?.title ?? "",
      challengeType: pub?.type ?? "reaction",
      durationMs: pub?.durationMs ?? 10000,
      expiresAt: turn?.status === "active" ? turn.expiresAt.toISOString() : null,
      result:
        turn && turn.status !== "active"
          ? {
              playerId: turn.playerId,
              status: turn.status,
              pointsEarned: turn.pointsEarned,
              responseMs: turn.responseMs ?? pub?.durationMs ?? 0,
              challengeTitle: pub?.title ?? "",
            }
          : null,
      stats: statMap,
    },
  };
}

export async function privateRushChallenge(code: string, token: string) {
  const room = await rushRoomByCode(code);
  const player = await rushPlayer(room.id, token);
  await resolveExpiredRushTurn(room.id);
  const game = await rushGameForRoom(room.id);
  if (!game || game.status !== "challenge") return { challenge: null };
  const turn = await currentTurn(game);
  if (!turn || turn.playerId !== player.id || turn.status !== "active") return { challenge: null };
  return {
    challenge: {
      ...(turn.challengePublic as RushChallengePublic),
      expiresAt: turn.expiresAt.toISOString(),
    },
  };
}

export async function startRushGame(roomId: string, token: string) {
  const room = await rushRoomById(roomId);
  const host = await rushPlayer(room.id, token);
  if (!host.isHost) throw new RushError("هذه الخطوة بيد مدير الغرفة", 403);
  const members = await rushMembers(room.id);
  if (members.length < 2) throw new RushError("نحتاج لاعبين على الأقل لبدء التحدي", 409);

  const settings = safeRushSettings(room.settings as Partial<RushSettings>);
  const old = await rushGameForRoom(room.id);
  const gameId = old?.id ?? rushId("rush_game");

  if (old) {
    await db.delete(rushTurns).where(eq(rushTurns.gameId, old.id));
    await db.delete(rushPlayerStats).where(eq(rushPlayerStats.gameId, old.id));
    await db
      .update(rushGames)
      .set({ status: "lobby", settings, roundNumber: 0, turnIndex: 0, currentTurnId: null, updatedAt: new Date() })
      .where(eq(rushGames.id, old.id));
  } else {
    await db.insert(rushGames).values({
      id: gameId,
      roomId: room.id,
      status: "lobby",
      settings,
      roundNumber: 0,
      turnIndex: 0,
      currentTurnId: null,
    });
  }

  for (const member of members) {
    await db.update(roomPlayers).set({ score: 0 }).where(eq(roomPlayers.id, member.id));
    await db.insert(rushPlayerStats).values({
      id: rushId("rush_stat"),
      gameId,
      playerId: member.id,
      correctCount: 0,
      wrongCount: 0,
      timeoutCount: 0,
      currentStreak: 0,
      bestStreak: 0,
      fastestMs: null,
    });
  }

  const game = (await rushGameForRoom(room.id))!;
  await db.update(rooms).set({ status: "playing", updatedAt: new Date() }).where(eq(rooms.id, room.id));
  await createActiveTurn(game, room.id, members[0].id, 1, 0);
}

export async function submitRushAnswer(roomId: string, token: string, submission: unknown) {
  const room = await rushRoomById(roomId);
  const player = await rushPlayer(room.id, token);
  await resolveExpiredRushTurn(room.id);
  const game = await rushGameForRoom(room.id);
  if (!game || game.status !== "challenge") throw new RushError("لا يوجد تحدٍ نشط", 409);
  const turn = await currentTurn(game);
  if (!turn || turn.status !== "active") throw new RushError("انتهى وقت التحدي", 409);
  if (turn.playerId !== player.id) throw new RushError("هذا التحدي ليس دورك", 403);

  const secret = turn.challengeSecret as RushChallengeSecret;
  const pub = turn.challengePublic as RushChallengePublic;
  const elapsedMs = Math.max(110, Math.min(pub.durationMs, Date.now() - turn.startedAt.getTime()));
  const isCorrect = evaluateRushSubmission(secret, submission);
  await resolveTurn(game, turn, isCorrect ? "correct" : "wrong", elapsedMs);
}

export async function advanceRushGame(roomId: string, token: string) {
  const room = await rushRoomById(roomId);
  const player = await rushPlayer(room.id, token);
  const game = await rushGameForRoom(room.id);
  if (!game) throw new RushError("لا توجد لعبة نشطة", 409);
  const members = await rushMembers(room.id);
  const turn = await currentTurn(game);
  const canAdvance = player.isHost || turn?.playerId === player.id;
  if (!canAdvance) throw new RushError("انتظر اللاعب الحالي أو مدير الغرفة", 403);

  const settings = safeRushSettings(game.settings as Partial<RushSettings>);
  if (game.status === "result") {
    if (game.turnIndex + 1 < members.length) {
      await createActiveTurn(game, room.id, members[game.turnIndex + 1].id, game.roundNumber, game.turnIndex + 1);
      return;
    }
    if (game.roundNumber >= settings.rounds) {
      await db.update(rushGames).set({ status: "finished", currentTurnId: null, updatedAt: new Date() }).where(eq(rushGames.id, game.id));
      await db.update(rooms).set({ status: "finished", updatedAt: new Date() }).where(eq(rooms.id, room.id));
      return;
    }
    await createActiveTurn(game, room.id, members[0].id, game.roundNumber + 1, 0);
    return;
  }
  throw new RushError("لا يمكن الانتقال الآن", 409);
}

export function rushApiError(error: unknown) {
  if (error instanceof RushError) return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json({ error: "تعذر إكمال العملية، حاول مجددًا" }, { status: 500 });
}
