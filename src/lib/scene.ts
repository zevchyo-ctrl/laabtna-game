import { sceneCategories, type SceneDifficulty, type SceneLanguage } from "@/lib/scene-data";

export type SceneMode = "acting" | "description" | "silent" | "sound" | "speed";
export type SceneDifficultySetting = SceneDifficulty | "mixed";
export type SceneSettings = {
  categories: string[];
  difficulty: SceneDifficultySetting;
  rounds: number;
  timerSeconds: number;
  language: SceneLanguage;
  mode: SceneMode;
  pointsCorrect: number;
};

export const defaultSceneSettings: SceneSettings = {
  categories: sceneCategories.map((category) => category.id),
  difficulty: "mixed",
  rounds: 3,
  timerSeconds: 60,
  language: "ar",
  mode: "acting",
  pointsCorrect: 10,
};

function clamp(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
}

export function safeSceneSettings(input: Partial<SceneSettings>): SceneSettings {
  const categories = Array.isArray(input.categories) ? input.categories.filter((id) => sceneCategories.some((category) => category.id === id)) : [];
  const difficulty = ["easy", "medium", "hard", "mixed"].includes(input.difficulty as string) ? input.difficulty as SceneDifficultySetting : "mixed";
  const mode = ["acting", "description", "silent", "sound", "speed"].includes(input.mode as string) ? input.mode as SceneMode : "acting";
  const timer = [0, 30, 60, 90].includes(input.timerSeconds as number) ? Number(input.timerSeconds) : 60;
  return { categories: categories.length ? categories : defaultSceneSettings.categories, difficulty, rounds: clamp(input.rounds, 1, 5, 3), timerSeconds: timer, language: input.language === "en" ? "en" : "ar", mode, pointsCorrect: 10 };
}

export function sceneModeLabel(mode: SceneMode, language: SceneLanguage) {
  const labels = {
    ar: { acting: "🎭 تمثيل", description: "🗣️ وصف", silent: "🤫 بدون كلام", sound: "🔊 أصوات فقط", speed: "⚡ سرعة" },
    en: { acting: "🎭 Acting", description: "🗣️ Description", silent: "🤫 No talking", sound: "🔊 Sound only", speed: "⚡ Speed mode" },
  };
  return labels[language][mode];
}
