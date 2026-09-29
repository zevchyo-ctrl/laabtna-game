import { quizCategories, type QuizDifficulty, type QuizLanguage } from "@/lib/quiz-data";

export type QuizDifficultySetting = QuizDifficulty | "mixed";
export type QuizSettings = {
  categories: string[];
  difficulty: QuizDifficultySetting;
  rounds: number;
  timerSeconds: number;
  language: QuizLanguage;
  pointsCorrect: number;
};

export const defaultQuizSettings: QuizSettings = {
  categories: quizCategories.map((category) => category.id),
  difficulty: "mixed",
  rounds: 3,
  timerSeconds: 20,
  language: "ar",
  pointsCorrect: 10,
};

function clamp(value: unknown, minimum: number, maximum: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

export function safeQuizSettings(input: Partial<QuizSettings>): QuizSettings {
  const categories = Array.isArray(input.categories)
    ? input.categories.filter((id) => quizCategories.some((category) => category.id === id))
    : defaultQuizSettings.categories;
  const difficulty: QuizDifficultySetting = ["easy", "medium", "hard", "mixed"].includes(input.difficulty as string)
    ? input.difficulty as QuizDifficultySetting
    : defaultQuizSettings.difficulty;
  return {
    categories: categories.length ? categories : defaultQuizSettings.categories,
    difficulty,
    rounds: clamp(input.rounds, 1, 4, defaultQuizSettings.rounds),
    timerSeconds: clamp(input.timerSeconds, 5, 60, defaultQuizSettings.timerSeconds),
    language: input.language === "en" ? "en" : "ar",
    pointsCorrect: 10,
  };
}

export function difficultyLabel(difficulty: QuizDifficultySetting, language: QuizLanguage) {
  const labels = {
    ar: { easy: "سهل", medium: "متوسط", hard: "صعب", mixed: "مختلط" },
    en: { easy: "Easy", medium: "Medium", hard: "Hard", mixed: "Mixed" },
  };
  return labels[language][difficulty];
}
