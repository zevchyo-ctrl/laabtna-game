import { randomBytes, randomInt } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { quizGames, quizPlayerStats, quizQuestions, quizTurns, roomPlayers, rooms } from "@/db/schema";
import { localizedQuizQuestions } from "@/lib/quiz-data";
import { safeQuizSettings, type QuizSettings } from "@/lib/quiz";

export class QuizError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function quizId(prefix: string) { return `${prefix}_${randomBytes(12).toString("hex")}`; }
export function quizRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => chars[randomInt(chars.length)]).join("");
}

export async function seedQuizQuestions() {
  const rows = [...localizedQuizQuestions("ar"), ...localizedQuizQuestions("en")];
  await db.insert(quizQuestions).values(rows.map((question) => ({
    id: question.id,
    questionText: question.text,
    correctAnswer: question.answer,
    choices: question.choices,
    category: question.category,
    difficulty: question.difficulty,
    language: question.language,
    enabled: true,
  }))).onConflictDoNothing();
}

export async function quizRoomByCode(codeInput: string) {
  const code = codeInput.trim().toUpperCase();
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  if (!room || room.gameType !== "quiz") throw new QuizError("رمز الغرفة غير صحيح", 404);
  return room;
}

export async function quizRoomById(roomId: string) {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!room || room.gameType !== "quiz") throw new QuizError("الغرفة غير موجودة", 404);
  return room;
}

export async function quizPlayer(roomId: string, token: string) {
  const [player] = await db.select().from(roomPlayers).where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.sessionToken, token))).limit(1);
  if (!player) throw new QuizError("جلسة اللاعب غير موجودة", 403);
  return player;
}

export async function quizMembers(roomId: string) {
  return db.select().from(roomPlayers).where(eq(roomPlayers.roomId, roomId)).orderBy(roomPlayers.joinedAt);
}

export async function quizGameForRoom(roomId: string) {
  const [game] = await db.select().from(quizGames).where(eq(quizGames.roomId, roomId)).limit(1);
  return game ?? null;
}

async function currentTurn(game: NonNullable<Awaited<ReturnType<typeof quizGameForRoom>>>) {
  if (!game.currentTurnId) return null;
  const [turn] = await db.select().from(quizTurns).where(eq(quizTurns.id, game.currentTurnId)).limit(1);
  return turn ?? null;
}

async function questionById(id: string) {
  const [question] = await db.select().from(quizQuestions).where(eq(quizQuestions.id, id)).limit(1);
  if (!question) throw new QuizError("تعذر العثور على السؤال", 500);
  return question;
}

async function pickQuestion(settings: QuizSettings, usedQuestionIds: string[]) {
  const available = await db.select().from(quizQuestions).where(and(eq(quizQuestions.enabled, true), eq(quizQuestions.language, settings.language)));
  const accepted = available.filter((question) => settings.categories.includes(question.category) && (settings.difficulty === "mixed" || question.difficulty === settings.difficulty));
  const fresh = accepted.filter((question) => !usedQuestionIds.includes(question.id));
  const pool = fresh.length ? fresh : accepted.length ? accepted : available;
  if (!pool.length) throw new QuizError("لا توجد أسئلة متاحة لهذه الإعدادات", 409);
  return pool[randomInt(pool.length)];
}

async function createActiveTurn(game: NonNullable<Awaited<ReturnType<typeof quizGameForRoom>>>, roomId: string, playerId: string, roundNumber: number, turnIndex: number) {
  const settings = safeQuizSettings(game.settings as Partial<QuizSettings>);
  const existing = await db.select({ questionId: quizTurns.questionId }).from(quizTurns).where(eq(quizTurns.gameId, game.id));
  const question = await pickQuestion(settings, existing.map((turn) => turn.questionId));
  const now = new Date();
  const turnId = quizId("quiz_turn");
  await db.insert(quizTurns).values({
    id: turnId,
    gameId: game.id,
    roomId,
    roundNumber,
    turnIndex,
    playerId,
    questionId: question.id,
    status: "active",
    changedQuestion: false,
    assignedAt: now,
    expiresAt: new Date(now.getTime() + settings.timerSeconds * 1000),
  });
  await db.update(quizGames).set({ status: "question", roundNumber, turnIndex, currentTurnId: turnId, updatedAt: now }).where(eq(quizGames.id, game.id));
  return turnId;
}

async function resolveTurn(game: NonNullable<Awaited<ReturnType<typeof quizGameForRoom>>>, turn: NonNullable<Awaited<ReturnType<typeof currentTurn>>>, status: "correct" | "incorrect" | "passed" | "timedOut") {
  if (turn.status !== "active") return;
  const settings = safeQuizSettings(game.settings as Partial<QuizSettings>);
  const [stat] = await db.select().from(quizPlayerStats).where(and(eq(quizPlayerStats.gameId, game.id), eq(quizPlayerStats.playerId, turn.playerId))).limit(1);
  if (!stat) throw new QuizError("إحصاءات اللاعب غير موجودة", 500);
  const changed = {
    correctCount: stat.correctCount + (status === "correct" ? 1 : 0),
    incorrectCount: stat.incorrectCount + (status === "incorrect" || status === "timedOut" ? 1 : 0),
    passedCount: stat.passedCount + (status === "passed" ? 1 : 0),
  };
  await db.update(quizTurns).set({ status, resolvedAt: new Date() }).where(eq(quizTurns.id, turn.id));
  await db.update(quizPlayerStats).set(changed).where(eq(quizPlayerStats.id, stat.id));
  if (status === "correct") {
    const [player] = await db.select().from(roomPlayers).where(eq(roomPlayers.id, turn.playerId)).limit(1);
    if (player) await db.update(roomPlayers).set({ score: player.score + settings.pointsCorrect }).where(eq(roomPlayers.id, player.id));
  }
  await db.update(quizGames).set({ status: "result", updatedAt: new Date() }).where(eq(quizGames.id, game.id));
}

export async function resolveExpiredQuizTurn(roomId: string) {
  const game = await quizGameForRoom(roomId);
  if (!game || game.status !== "question") return;
  const turn = await currentTurn(game);
  if (turn?.status === "active" && turn.expiresAt.getTime() <= Date.now()) await resolveTurn(game, turn, "timedOut");
}

function publicPlayer(player: { id: string; nickname: string; isHost: boolean; isConnected: boolean; score: number }) {
  return { id: player.id, nickname: player.nickname, isHost: player.isHost, isConnected: player.isConnected, score: player.score };
}

export async function quizSnapshot(code: string, token: string) {
  const room = await quizRoomByCode(code);
  const self = await quizPlayer(room.id, token);
  await db.update(roomPlayers).set({ isConnected: true }).where(eq(roomPlayers.id, self.id));
  await resolveExpiredQuizTurn(room.id);
  const players = await quizMembers(room.id);
  let game = await quizGameForRoom(room.id);
  // Timer resolution updates the game state; use the fresh row for this same response.
  if (game) game = await quizGameForRoom(room.id);
  const base = {
    room: { code: room.code, mode: room.mode, gameType: room.gameType, status: room.status, settings: room.settings as QuizSettings },
    self: publicPlayer(self),
    players: players.map(publicPlayer),
  };
  if (!game) return base;
  const turn = await currentTurn(game);
  const stats = await db.select().from(quizPlayerStats).where(eq(quizPlayerStats.gameId, game.id));
  const statMap = Object.fromEntries(stats.map((stat) => [stat.playerId, {
    correct: stat.correctCount, incorrect: stat.incorrectCount, passed: stat.passedCount, changed: stat.changedCount,
  }]));
  let result: Record<string, unknown> | null = null;
  if (turn && turn.status !== "active") {
    const question = await questionById(turn.questionId);
    result = { playerId: turn.playerId, status: turn.status, correctAnswer: question.correctAnswer, questionText: question.questionText };
  }
  return {
    ...base,
    game: {
      status: game.status,
      roundNumber: game.roundNumber,
      totalRounds: safeQuizSettings(game.settings as Partial<QuizSettings>).rounds,
      turnIndex: game.turnIndex,
      currentPlayerId: turn?.playerId ?? null,
      currentTurnId: turn?.id ?? null,
      currentPlayerChangeUsed: turn?.changedQuestion ?? false,
      expiresAt: turn?.status === "active" ? turn.expiresAt.toISOString() : null,
      result,
      stats: statMap,
    },
  };
}

export async function privateQuizQuestion(code: string, token: string) {
  const room = await quizRoomByCode(code);
  const player = await quizPlayer(room.id, token);
  await resolveExpiredQuizTurn(room.id);
  const game = await quizGameForRoom(room.id);
  if (!game || game.status !== "question") return { question: null };
  const turn = await currentTurn(game);
  if (!turn || turn.playerId !== player.id || turn.status !== "active") return { question: null };
  const question = await questionById(turn.questionId);
  return { question: { id: question.id, text: question.questionText, choices: question.choices as string[], category: question.category, difficulty: question.difficulty, expiresAt: turn.expiresAt.toISOString() } };
}

export async function requireQuizHost(roomId: string, token: string) {
  const player = await quizPlayer(roomId, token);
  if (!player.isHost) throw new QuizError("هذه الخطوة بيد مدير الغرفة", 403);
  return player;
}

export async function startQuiz(roomId: string, token: string) {
  await seedQuizQuestions();
  await requireQuizHost(roomId, token);
  const members = await quizMembers(roomId);
  if (members.length < 2) throw new QuizError("نحتاج لاعبين على الأقل لبدء المسابقة", 409);
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!room) throw new QuizError("الغرفة غير موجودة", 404);
  const old = await quizGameForRoom(roomId);
  if (old && !["finished", "lobby"].includes(old.status)) throw new QuizError("المسابقة بدأت بالفعل", 409);
  const settings = safeQuizSettings(room.settings as Partial<QuizSettings>);
  const gameId = old?.id ?? quizId("quiz_game");
  if (old) {
    await db.delete(quizTurns).where(eq(quizTurns.gameId, old.id));
    await db.delete(quizPlayerStats).where(eq(quizPlayerStats.gameId, old.id));
    await db.update(quizGames).set({ status: "lobby", settings, roundNumber: 0, turnIndex: 0, currentTurnId: null, updatedAt: new Date() }).where(eq(quizGames.id, old.id));
  } else {
    await db.insert(quizGames).values({ id: gameId, roomId, status: "lobby", settings, roundNumber: 0, turnIndex: 0, currentTurnId: null });
  }
  for (const member of members) {
    await db.update(roomPlayers).set({ score: 0 }).where(eq(roomPlayers.id, member.id));
    await db.insert(quizPlayerStats).values({ id: quizId("quiz_stat"), gameId, playerId: member.id, correctCount: 0, incorrectCount: 0, passedCount: 0, changedCount: 0 });
  }
  const game = (await quizGameForRoom(roomId))!;
  await db.update(rooms).set({ status: "playing", updatedAt: new Date() }).where(eq(rooms.id, roomId));
  await createActiveTurn(game, roomId, members[0].id, 1, 0);
}

async function assertActivePlayer(roomId: string, token: string) {
  const room = await quizRoomById(roomId);
  const player = await quizPlayer(room.id, token);
  await resolveExpiredQuizTurn(room.id);
  const game = await quizGameForRoom(room.id);
  if (!game || game.status !== "question") throw new QuizError("لا يوجد سؤال نشط", 409);
  const turn = await currentTurn(game);
  if (!turn || turn.status !== "active") throw new QuizError("انتهى هذا الدور", 409);
  if (turn.playerId !== player.id) throw new QuizError("هذا السؤال ليس لك", 403);
  return { room, player, game, turn };
}

export async function answerQuiz(roomId: string, token: string, answer: unknown) {
  const { game, turn } = await assertActivePlayer(roomId, token);
  const question = await questionById(turn.questionId);
  const value = typeof answer === "string" ? answer.trim() : "";
  await resolveTurn(game, turn, value === question.correctAnswer ? "correct" : "incorrect");
}

export async function passQuiz(roomId: string, token: string) {
  const { game, turn } = await assertActivePlayer(roomId, token);
  await resolveTurn(game, turn, "passed");
}

export async function changeQuizQuestion(roomId: string, token: string) {
  const { game, turn } = await assertActivePlayer(roomId, token);
  const used = await db.select().from(quizTurns).where(and(eq(quizTurns.gameId, game.id), eq(quizTurns.playerId, turn.playerId), eq(quizTurns.roundNumber, turn.roundNumber), eq(quizTurns.changedQuestion, true)));
  if (used.length) throw new QuizError("استخدمت تغيير السؤال في هذه الجولة", 409);
  const settings = safeQuizSettings(game.settings as Partial<QuizSettings>);
  const allTurns = await db.select({ questionId: quizTurns.questionId }).from(quizTurns).where(eq(quizTurns.gameId, game.id));
  const question = await pickQuestion(settings, allTurns.map((item) => item.questionId));
  const [stat] = await db.select().from(quizPlayerStats).where(and(eq(quizPlayerStats.gameId, game.id), eq(quizPlayerStats.playerId, turn.playerId))).limit(1);
  await db.update(quizTurns).set({ questionId: question.id, changedQuestion: true, assignedAt: new Date(), expiresAt: new Date(Date.now() + settings.timerSeconds * 1000) }).where(eq(quizTurns.id, turn.id));
  if (stat) await db.update(quizPlayerStats).set({ changedCount: stat.changedCount + 1 }).where(eq(quizPlayerStats.id, stat.id));
}

export async function advanceQuiz(roomId: string, token: string) {
  const room = await quizRoomById(roomId);
  const player = await quizPlayer(room.id, token);
  const game = await quizGameForRoom(room.id);
  if (!game) throw new QuizError("لا توجد مسابقة نشطة", 409);
  const members = await quizMembers(room.id);
  const turn = await currentTurn(game);
  const canAdvance = player.isHost || turn?.playerId === player.id;
  if (!canAdvance) throw new QuizError("انتظر اللاعب الحالي أو مدير الغرفة", 403);
  const settings = safeQuizSettings(game.settings as Partial<QuizSettings>);
  if (game.status === "result") {
    if (game.turnIndex + 1 < members.length) {
      await createActiveTurn(game, room.id, members[game.turnIndex + 1].id, game.roundNumber, game.turnIndex + 1);
      return;
    }
    if (game.roundNumber >= settings.rounds) {
      await db.update(quizGames).set({ status: "finished", currentTurnId: null, updatedAt: new Date() }).where(eq(quizGames.id, game.id));
      await db.update(rooms).set({ status: "finished", updatedAt: new Date() }).where(eq(rooms.id, room.id));
      return;
    }
    await db.update(quizGames).set({ status: "roundResult", updatedAt: new Date() }).where(eq(quizGames.id, game.id));
    return;
  }
  if (game.status === "roundResult") {
    if (!player.isHost) throw new QuizError("مدير الغرفة يبدأ الجولة التالية", 403);
    await createActiveTurn(game, room.id, members[0].id, game.roundNumber + 1, 0);
    return;
  }
  throw new QuizError("لا يمكن الانتقال الآن", 409);
}

export function quizApiError(error: unknown) {
  if (error instanceof QuizError) return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json({ error: "تعذر إكمال العملية، حاول مجددًا" }, { status: 500 });
}
