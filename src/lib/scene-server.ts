import { randomBytes, randomInt } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { roomPlayers, rooms, sceneCards, sceneGames, sceneTurns } from "@/db/schema";
import { localizedScenes } from "@/lib/scene-data";
import { safeSceneSettings, type SceneSettings } from "@/lib/scene";

export type SceneTeam = "red" | "blue";
type Teams = { red: string[]; blue: string[] };
type Scores = { red: number; blue: number };

export class SceneError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function sceneId(prefix: string) { return `${prefix}_${randomBytes(12).toString("hex")}`; }
export function sceneRoomCode() { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; return Array.from({ length: 5 }, () => chars[randomInt(chars.length)]).join(""); }

export async function seedScenes() {
  const rows = [...localizedScenes("ar"), ...localizedScenes("en")];
  await db.insert(sceneCards).values(rows.map((scene) => ({ id: scene.id, title: scene.title, description: scene.description, category: scene.category, difficulty: scene.difficulty, language: scene.language, enabled: true }))).onConflictDoNothing();
}

export async function sceneRoomByCode(codeInput: string) {
  const [room] = await db.select().from(rooms).where(eq(rooms.code, codeInput.trim().toUpperCase())).limit(1);
  if (!room || room.gameType !== "scene") throw new SceneError("رمز الغرفة غير صحيح", 404);
  return room;
}
async function sceneRoomById(roomId: string) {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!room || room.gameType !== "scene") throw new SceneError("الغرفة غير موجودة", 404);
  return room;
}
export async function scenePlayer(roomId: string, token: string) {
  const [player] = await db.select().from(roomPlayers).where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.sessionToken, token))).limit(1);
  if (!player) throw new SceneError("جلسة اللاعب غير موجودة", 403);
  return player;
}
export async function sceneMembers(roomId: string) { return db.select().from(roomPlayers).where(eq(roomPlayers.roomId, roomId)).orderBy(roomPlayers.joinedAt); }
async function sceneGame(roomId: string) { const [game] = await db.select().from(sceneGames).where(eq(sceneGames.roomId, roomId)).limit(1); return game ?? null; }
async function activeTurn(game: NonNullable<Awaited<ReturnType<typeof sceneGame>>>) { if (!game.currentTurnId) return null; const [turn] = await db.select().from(sceneTurns).where(eq(sceneTurns.id, game.currentTurnId)).limit(1); return turn ?? null; }
async function card(id: string) { const [item] = await db.select().from(sceneCards).where(eq(sceneCards.id, id)).limit(1); if (!item) throw new SceneError("تعذر العثور على المشهد", 500); return item; }

function shuffled<T>(items: T[]) { const copy = [...items]; for (let index = copy.length - 1; index > 0; index -= 1) { const target = randomInt(index + 1); [copy[index], copy[target]] = [copy[target], copy[index]]; } return copy; }
function makeTeams(ids: string[]): Teams { const red: string[] = []; const blue: string[] = []; shuffled(ids).forEach((id, index) => (index % 2 ? blue : red).push(id)); return { red, blue }; }
function publicPlayer(player: { id: string; nickname: string; isHost: boolean; isConnected: boolean; score: number }) { return { id: player.id, nickname: player.nickname, isHost: player.isHost, isConnected: player.isConnected, score: player.score }; }

async function pickScene(settings: SceneSettings, used: string[]) {
  const all = await db.select().from(sceneCards).where(and(eq(sceneCards.enabled, true), eq(sceneCards.language, settings.language)));
  const accepted = all.filter((item) => settings.categories.includes(item.category) && (settings.difficulty === "mixed" || item.difficulty === settings.difficulty));
  const fresh = accepted.filter((item) => !used.includes(item.id));
  const pool = fresh.length ? fresh : accepted.length ? accepted : all;
  if (!pool.length) throw new SceneError("لا توجد مشاهد متاحة لهذه الإعدادات", 409);
  return pool[randomInt(pool.length)];
}

async function createTurn(game: NonNullable<Awaited<ReturnType<typeof sceneGame>>>, roomId: string, round: number, teamIndex: number) {
  const settings = safeSceneSettings(game.settings as Partial<SceneSettings>);
  const teams = game.teams as Teams;
  const team: SceneTeam = teamIndex === 0 ? "red" : "blue";
  const teamMembers = teams[team];
  const actorId = teamMembers[(round - 1) % teamMembers.length];
  const used = await db.select({ sceneId: sceneTurns.sceneId }).from(sceneTurns).where(eq(sceneTurns.gameId, game.id));
  const chosen = await pickScene(settings, used.map((turn) => turn.sceneId));
  const turnId = sceneId("scene_turn");
  await db.insert(sceneTurns).values({ id: turnId, gameId: game.id, roomId, roundNumber: round, teamTurnIndex: teamIndex, team, actorId, sceneId: chosen.id, status: "handoff" });
  await db.update(sceneGames).set({ status: "handoff", roundNumber: round, teamTurnIndex: teamIndex, currentTurnId: turnId, updatedAt: new Date() }).where(eq(sceneGames.id, game.id));
}

async function resolveTimeout(roomId: string) {
  const game = await sceneGame(roomId);
  if (!game || game.status !== "active") return;
  const turn = await activeTurn(game);
  if (turn?.status === "active" && turn.expiresAt && turn.expiresAt.getTime() <= Date.now()) {
    await db.update(sceneTurns).set({ status: "timeout", resolvedAt: new Date() }).where(eq(sceneTurns.id, turn.id));
    await db.update(sceneGames).set({ status: "result", updatedAt: new Date() }).where(eq(sceneGames.id, game.id));
  }
}

export async function sceneSnapshot(code: string, token: string) {
  const room = await sceneRoomByCode(code);
  const self = await scenePlayer(room.id, token);
  await db.update(roomPlayers).set({ isConnected: true }).where(eq(roomPlayers.id, self.id));
  await resolveTimeout(room.id);
  const players = await sceneMembers(room.id);
  const game = await sceneGame(room.id);
  const base = { room: { code: room.code, mode: room.mode, gameType: room.gameType, status: room.status, settings: room.settings as SceneSettings }, self: publicPlayer(self), players: players.map(publicPlayer) };
  if (!game) return base;
  const refreshed = await sceneGame(room.id);
  if (!refreshed) return base;
  const turn = await activeTurn(refreshed);
  return { ...base, game: {
    status: refreshed.status, settings: refreshed.settings as SceneSettings, teams: refreshed.teams as Teams, scores: refreshed.scores as Scores,
    roundNumber: refreshed.roundNumber, totalRounds: safeSceneSettings(refreshed.settings as Partial<SceneSettings>).rounds, teamTurnIndex: refreshed.teamTurnIndex,
    currentTeam: turn?.team ?? null, currentActorId: turn?.actorId ?? null, currentTurnId: turn?.id ?? null,
    expiresAt: turn?.status === "active" && turn.expiresAt ? turn.expiresAt.toISOString() : null,
    sceneVersion: turn?.revealedAt?.toISOString() ?? null,
    result: turn && turn.status !== "handoff" && turn.status !== "active" ? { team: turn.team, status: turn.status, actorId: turn.actorId } : null,
  } };
}

export async function privateScene(code: string, token: string) {
  const room = await sceneRoomByCode(code); const player = await scenePlayer(room.id, token); await resolveTimeout(room.id);
  const game = await sceneGame(room.id); if (!game) return { scene: null };
  const turn = await activeTurn(game); if (!turn || turn.actorId !== player.id || !["active", "handoff"].includes(turn.status)) return { scene: null };
  if (turn.status !== "active") return { scene: null };
  const item = await card(turn.sceneId);
  return { scene: { id: item.id, title: item.title, description: item.description, category: item.category, difficulty: item.difficulty, expiresAt: turn.expiresAt?.toISOString() ?? null } };
}

export async function startSceneGame(roomId: string, token: string) {
  await seedScenes(); const host = await scenePlayer(roomId, token); if (!host.isHost) throw new SceneError("هذه الخطوة بيد مدير الغرفة", 403);
  const members = await sceneMembers(roomId); if (members.length < 2) throw new SceneError("نحتاج لاعبين على الأقل لبدء اللعبة", 409);
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1); if (!room) throw new SceneError("الغرفة غير موجودة", 404);
  const settings = safeSceneSettings(room.settings as Partial<SceneSettings>); const old = await sceneGame(roomId); const teams = makeTeams(members.map((member) => member.id));
  if (old && !["finished", "lobby"].includes(old.status)) throw new SceneError("اللعبة بدأت بالفعل", 409);
  const gameId = old?.id ?? sceneId("scene_game");
  if (old) { await db.delete(sceneTurns).where(eq(sceneTurns.gameId, old.id)); await db.update(sceneGames).set({ status: "lobby", settings, teams, scores: { red: 0, blue: 0 }, roundNumber: 0, teamTurnIndex: 0, currentTurnId: null, updatedAt: new Date() }).where(eq(sceneGames.id, old.id)); }
  else await db.insert(sceneGames).values({ id: gameId, roomId, status: "lobby", settings, teams, scores: { red: 0, blue: 0 }, roundNumber: 0, teamTurnIndex: 0, currentTurnId: null });
  const game = (await sceneGame(roomId))!;
  await db.update(rooms).set({ status: "playing", updatedAt: new Date() }).where(eq(rooms.id, roomId));
  await createTurn(game, roomId, 1, 0);
}

async function requireActor(roomId: string, token: string, requiredStatus: "handoff" | "active") {
  const room = await sceneRoomById(roomId); const player = await scenePlayer(room.id, token); await resolveTimeout(room.id);
  const game = await sceneGame(room.id); if (!game || !["handoff", "active"].includes(game.status)) throw new SceneError("لا توجد جولة نشطة", 409);
  const turn = await activeTurn(game); if (!turn || turn.status !== requiredStatus || turn.actorId !== player.id) throw new SceneError("هذه الخطوة خاصة بالممثل الحالي", 403);
  return { room, player, game, turn };
}

export async function selectSceneActor(roomId: string, token: string, actorId: unknown) {
  const room = await sceneRoomById(roomId); const host = await scenePlayer(room.id, token); if (!host.isHost) throw new SceneError("مدير الغرفة يختار الممثل", 403);
  const game = await sceneGame(room.id); if (!game || game.status !== "handoff") throw new SceneError("يمكن اختيار الممثل قبل كشف المشهد فقط", 409);
  const turn = await activeTurn(game); const candidate = typeof actorId === "string" ? actorId : "";
  const teams = game.teams as Teams;
  if (!turn || !teams[turn.team as SceneTeam].includes(candidate)) throw new SceneError("اختر لاعبًا من الفريق الحالي", 400);
  await db.update(sceneTurns).set({ actorId: candidate }).where(eq(sceneTurns.id, turn.id));
  await db.update(sceneGames).set({ updatedAt: new Date() }).where(eq(sceneGames.id, game.id));
}

export async function revealScene(roomId: string, token: string) {
  const { game, turn } = await requireActor(roomId, token, "handoff"); const settings = safeSceneSettings(game.settings as Partial<SceneSettings>); const now = new Date();
  await db.update(sceneTurns).set({ status: "active", revealedAt: now, expiresAt: settings.timerSeconds ? new Date(now.getTime() + settings.timerSeconds * 1000) : null }).where(eq(sceneTurns.id, turn.id));
  await db.update(sceneGames).set({ status: "active", updatedAt: now }).where(eq(sceneGames.id, game.id));
}

export async function confirmScene(roomId: string, token: string, success: boolean) {
  const { game, turn } = await requireActor(roomId, token, "active"); const settings = safeSceneSettings(game.settings as Partial<SceneSettings>);
  const scores = game.scores as Scores;
  if (success) {
    const nextScores = { ...scores, [turn.team]: scores[turn.team as SceneTeam] + settings.pointsCorrect };
    if (settings.mode === "speed") {
      const used = await db.select({ sceneId: sceneTurns.sceneId }).from(sceneTurns).where(eq(sceneTurns.gameId, game.id)); const replacement = await pickScene(settings, used.map((item) => item.sceneId));
      await db.update(sceneTurns).set({ sceneId: replacement.id, revealedAt: new Date() }).where(eq(sceneTurns.id, turn.id));
      await db.update(sceneGames).set({ scores: nextScores, status: "active", updatedAt: new Date() }).where(eq(sceneGames.id, game.id));
      return;
    }
    await db.update(sceneGames).set({ scores: nextScores, status: "result", updatedAt: new Date() }).where(eq(sceneGames.id, game.id));
    await db.update(sceneTurns).set({ status: "correct", resolvedAt: new Date() }).where(eq(sceneTurns.id, turn.id));
    return;
  }
  await db.update(sceneTurns).set({ status: "failed", resolvedAt: new Date() }).where(eq(sceneTurns.id, turn.id));
  await db.update(sceneGames).set({ status: "result", updatedAt: new Date() }).where(eq(sceneGames.id, game.id));
}

export async function advanceSceneGame(roomId: string, token: string) {
  const room = await sceneRoomById(roomId); const player = await scenePlayer(room.id, token); const game = await sceneGame(room.id); if (!game) throw new SceneError("لا توجد لعبة نشطة", 409);
  const turn = await activeTurn(game); const canAdvance = player.isHost || turn?.actorId === player.id; if (!canAdvance) throw new SceneError("انتظر الممثل الحالي أو مدير الغرفة", 403);
  const settings = safeSceneSettings(game.settings as Partial<SceneSettings>);
  if (game.status === "result") {
    if (game.teamTurnIndex === 0) { await createTurn(game, room.id, game.roundNumber, 1); return; }
    if (game.roundNumber >= settings.rounds) { await db.update(sceneGames).set({ status: "finished", currentTurnId: null, updatedAt: new Date() }).where(eq(sceneGames.id, game.id)); await db.update(rooms).set({ status: "finished", updatedAt: new Date() }).where(eq(rooms.id, room.id)); return; }
    await db.update(sceneGames).set({ status: "roundResult", updatedAt: new Date() }).where(eq(sceneGames.id, game.id)); return;
  }
  if (game.status === "roundResult") { if (!player.isHost) throw new SceneError("مدير الغرفة يبدأ الجولة التالية", 403); await createTurn(game, room.id, game.roundNumber + 1, 0); return; }
  throw new SceneError("لا يمكن الانتقال الآن", 409);
}

export function sceneApiError(error: unknown) { if (error instanceof SceneError) return Response.json({ error: error.message }, { status: error.status }); console.error(error); return Response.json({ error: "تعذر إكمال العملية، حاول مجددًا" }, { status: 500 }); }
