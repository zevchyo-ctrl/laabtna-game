import { randomBytes, randomInt } from "crypto";
import { wordBank } from "@/lib/categories";

export { wordBank } from "@/lib/categories";

export type GameMode = "local" | "online";
export type GamePhase =
  | "opening"
  | "secret"
  | "questions"
  | "questionsComplete"
  | "discussion"
  | "voting"
  | "reveal"
  | "result";

export type GameSettings = {
  categories: string[];
  questionRounds: number;
  timerSeconds: number;
  allowExtraRound: boolean;
  impostorCount: number;
  writtenQuestions: boolean;
};

export type Pairing = { askerId: string; targetId: string };
export type QuestionNote = Pairing & { turn: number; text: string };

export const defaultSettings: GameSettings = {
  categories: wordBank.map((category) => category.id),
  questionRounds: 2,
  timerSeconds: 45,
  allowExtraRound: true,
  impostorCount: 1,
  writtenQuestions: true,
};

export function safeSettings(input: Partial<GameSettings>, playerCount = 4): GameSettings {
  const selected = Array.isArray(input.categories)
    ? input.categories.filter((category) => wordBank.some((item) => item.id === category))
    : defaultSettings.categories;
  return {
    categories: selected.length ? selected : defaultSettings.categories,
    questionRounds: clampNumber(input.questionRounds, 1, 5, defaultSettings.questionRounds),
    timerSeconds: clampNumber(input.timerSeconds, 0, 120, defaultSettings.timerSeconds),
    allowExtraRound: typeof input.allowExtraRound === "boolean" ? input.allowExtraRound : defaultSettings.allowExtraRound,
    impostorCount: clampNumber(input.impostorCount, 1, Math.max(1, Math.floor(playerCount / 3)), 1),
    writtenQuestions: typeof input.writtenQuestions === "boolean" ? input.writtenQuestions : defaultSettings.writtenQuestions,
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function generateId(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

export function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

export function chooseSecret(categories: string[]) {
  const choices = wordBank.filter((category) => categories.includes(category.id));
  const category = choices[randomInt(choices.length)];
  return { word: category.words[randomInt(category.words.length)], category: category.id };
}

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function chooseImpostors(playerIds: string[], count: number) {
  return shuffled(playerIds).slice(0, Math.min(count, Math.max(1, playerIds.length - 1)));
}

/** Every active player asks once per round; shifting targets prevents self-pairs and repeats. */
export function createFairPairings(playerIds: string[], rounds: number): Pairing[][] {
  const order = shuffled(playerIds);
  const playerCount = order.length;
  return Array.from({ length: rounds }, (_, roundIndex) => {
    const shift = (roundIndex % (playerCount - 1)) + 1;
    return order.map((askerId, index) => ({
      askerId,
      targetId: order[(index + shift) % playerCount],
    }));
  });
}

export function phaseOrder(phase: GamePhase) {
  const phases: GamePhase[] = ["opening", "secret", "questions", "discussion", "voting", "reveal", "result"];
  return phases.indexOf(phase);
}

export function buildRoundResult(
  playerIds: string[],
  impostorIds: string[],
  voteRows: Array<{ voterId: string; targetId: string }>,
) {
  const tally: Record<string, number> = Object.fromEntries(playerIds.map((id) => [id, 0]));
  voteRows.forEach(({ targetId }) => {
    if (targetId in tally) tally[targetId] += 1;
  });
  const highest = Math.max(0, ...Object.values(tally));
  const leaders = highest > 0 ? playerIds.filter((id) => tally[id] === highest) : [];
  const caught = leaders.some((id) => impostorIds.includes(id));
  const points: Record<string, number> = Object.fromEntries(playerIds.map((id) => [id, 0]));

  playerIds.forEach((playerId) => {
    const vote = voteRows.find((row) => row.voterId === playerId);
    if (!impostorIds.includes(playerId) && vote && impostorIds.includes(vote.targetId)) points[playerId] += 100;
    if (!impostorIds.includes(playerId) && caught) points[playerId] += 30;
    if (impostorIds.includes(playerId) && !caught) points[playerId] += 180;
  });

  return { tally, leaders, caught, points, voteCount: voteRows.length };
}
