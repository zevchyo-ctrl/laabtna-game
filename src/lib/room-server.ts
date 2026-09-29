import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { gameRounds, roomPlayers, rooms, votes } from "@/db/schema";
import type { GamePhase, GameSettings, Pairing, QuestionNote } from "@/lib/game";

export class RoomError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function tokenFromRequest(request: Request) {
  const token = request.headers.get("x-laabtna-token");
  if (!token) throw new RoomError("جلسة اللاعب غير موجودة", 401);
  return token;
}

export async function findRoom(codeInput: string) {
  const code = codeInput.trim().toUpperCase();
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  if (!room) throw new RoomError("لم نعثر على هذه الغرفة", 404);
  return room;
}

export async function findPlayer(roomId: string, token: string) {
  const [player] = await db
    .select()
    .from(roomPlayers)
    .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.sessionToken, token)))
    .limit(1);
  if (!player) throw new RoomError("هذه الجلسة لا تنتمي إلى الغرفة", 403);
  return player;
}

export async function roomMembers(roomId: string) {
  return db.select().from(roomPlayers).where(eq(roomPlayers.roomId, roomId)).orderBy(roomPlayers.joinedAt);
}

export async function currentRound(roomId: string, roundNumber: number) {
  if (!roundNumber) return null;
  const [round] = await db
    .select()
    .from(gameRounds)
    .where(and(eq(gameRounds.roomId, roomId), eq(gameRounds.number, roundNumber)))
    .orderBy(desc(gameRounds.startedAt))
    .limit(1);
  return round ?? null;
}

export async function getRoomSnapshot(codeInput: string, token: string) {
  const room = await findRoom(codeInput);
  const self = await findPlayer(room.id, token);
  const players = await roomMembers(room.id);
  const round = await currentRound(room.id, room.roundNumber);
  await db
    .update(roomPlayers)
    .set({ isConnected: true })
    .where(eq(roomPlayers.id, self.id));

  const response: Record<string, unknown> = {
    room: {
      code: room.code,
      mode: room.mode,
      status: room.status,
      settings: room.settings as GameSettings,
      roundNumber: room.roundNumber,
    },
    self: { id: self.id, nickname: self.nickname, isHost: self.isHost, score: self.score },
    players: players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      isHost: player.isHost,
      isConnected: player.isConnected,
      score: player.score,
    })),
  };

  if (!round) return response;

  const pairings = round.pairings as Pairing[][];
  const questionLog = round.questionLog as QuestionNote[];
  const activePairing = pairings[round.questionRound - 1]?.[round.turnIndex] ?? null;
  const voteRows = await db.select().from(votes).where(eq(votes.roundId, round.id));
  const phase = round.phase as GamePhase;
  const activeNote = questionLog.find((note) => note.turn === round.turnIndex && note.askerId === activePairing?.askerId);
  const canReadQuestion = activePairing && (activePairing.askerId === self.id || activePairing.targetId === self.id);

  response.round = {
    number: round.number,
    phase,
    questionRound: round.questionRound,
    totalQuestionRounds: pairings.length,
    turnIndex: round.turnIndex,
    activePairing,
    voteCount: voteRows.length,
    playerCount: players.length,
    votedPlayerIds: voteRows.map((vote) => vote.voterId),
    activeQuestionText: canReadQuestion ? activeNote?.text ?? null : null,
    hasVoted: voteRows.some((vote) => vote.voterId === self.id),
    yourVote: voteRows.find((vote) => vote.voterId === self.id)?.targetId ?? null,
    revealData: (phase === "reveal" || phase === "result") ? round.revealData : null,
  };

  return response;
}

export async function getPrivateRoundInfo(codeInput: string, token: string) {
  const room = await findRoom(codeInput);
  const player = await findPlayer(room.id, token);
  const round = await currentRound(room.id, room.roundNumber);
  if (!round) throw new RoomError("لم تبدأ جولة بعد", 409);
  const impostorIds = round.impostorIds as string[];
  return {
    roundNumber: round.number,
    phase: round.phase,
    role: impostorIds.includes(player.id) ? "impostor" : "agent",
    secretWord: impostorIds.includes(player.id) ? null : round.secretWord,
  };
}

export function assertHost(player: { isHost: boolean }) {
  if (!player.isHost) throw new RoomError("هذه الخطوة بيد مدير الغرفة", 403);
}

export function assertRound(round: Awaited<ReturnType<typeof currentRound>>) {
  if (!round) throw new RoomError("لا توجد جولة نشطة", 409);
  return round;
}

export function apiError(error: unknown) {
  if (error instanceof RoomError) return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json({ error: "تعذر إكمال العملية، حاول مجددًا" }, { status: 500 });
}
