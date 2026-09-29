export type RushLanguage = "ar" | "en";
export type RushDifficulty = "easy" | "medium" | "hard" | "mixed";
export type RushChallengeType =
  | "reaction"
  | "difference"
  | "memory"
  | "math"
  | "order"
  | "target"
  | "letter"
  | "dontTap"
  | "color"
  | "wrongOne"
  | "speedChain";

export type RushSpecialRound = "none" | "double" | "speed" | "oneChance" | "precision";

export type RushSettings = {
  rounds: 5 | 10 | 15 | 20;
  timerSeconds: 5 | 10 | 15 | 20;
  difficulty: RushDifficulty;
  challengeTypes: RushChallengeType[];
  specialRounds: boolean;
  language: RushLanguage;
};

export type RushOption = {
  id: string;
  label: string;
  sub?: string;
  color?: string;
  tone?: string;
  forbidden?: boolean;
};

export type RushMiniStep = {
  prompt: string;
  options: RushOption[];
  correctOptionId: string;
};

export type RushChallengePublic = {
  id: string;
  type: RushChallengeType;
  difficulty: Exclude<RushDifficulty, "mixed">;
  special: RushSpecialRound;
  title: string;
  instruction: string;
  options: RushOption[];
  memorySymbols?: string[];
  memoryHideMs?: number;
  reactionDelayMs?: number;
  requiredSequenceLength?: number;
  chainSteps?: Array<{ prompt: string; options: RushOption[] }>;
  durationMs: number;
};

export type RushChallengeSecret = {
  correctOptionId?: string;
  correctSequence?: string[];
  safeOptionIds?: string[];
  chainAnswers?: string[];
};

export type RushChallengeBundle = {
  publicChallenge: RushChallengePublic;
  secret: RushChallengeSecret;
};

export const rushChallengeCatalog: Array<{
  id: RushChallengeType;
  icon: string;
  ar: string;
  en: string;
}> = [
  { id: "reaction", icon: "⚡", ar: "سرعة الاستجابة", en: "Reaction" },
  { id: "difference", icon: "👀", ar: "اكتشف المختلف", en: "Find the Difference" },
  { id: "memory", icon: "🧠", ar: "الذاكرة السريعة", en: "Memory" },
  { id: "math", icon: "🔢", ar: "حساب سريع", en: "Quick Math" },
  { id: "order", icon: "🧩", ar: "رتّبها", en: "Order It" },
  { id: "target", icon: "🎯", ar: "الهدف الصحيح", en: "Correct Target" },
  { id: "letter", icon: "🔤", ar: "الحرف الناقص", en: "Missing Letter" },
  { id: "dontTap", icon: "🚫", ar: "لا تلمس!", en: "Don't Tap" },
  { id: "color", icon: "🟢", ar: "تحدي الألوان", en: "Color Challenge" },
  { id: "wrongOne", icon: "🕵️", ar: "اكتشف الخاطئ", en: "Find the Wrong One" },
  { id: "speedChain", icon: "🔥", ar: "سلسلة السرعة", en: "Speed Chain" },
];

export const defaultRushSettings: RushSettings = {
  rounds: 10,
  timerSeconds: 10,
  difficulty: "mixed",
  challengeTypes: rushChallengeCatalog.map((item) => item.id),
  specialRounds: true,
  language: "ar",
};

export function safeRushSettings(input: Partial<RushSettings>): RushSettings {
  const validRounds: Array<RushSettings["rounds"]> = [5, 10, 15, 20];
  const validTimers: Array<RushSettings["timerSeconds"]> = [5, 10, 15, 20];
  const validDiff: RushDifficulty[] = ["easy", "medium", "hard", "mixed"];
  const validTypes = Array.isArray(input.challengeTypes)
    ? input.challengeTypes.filter((id): id is RushChallengeType => rushChallengeCatalog.some((item) => item.id === id))
    : [];
  return {
    rounds: validRounds.includes(input.rounds as RushSettings["rounds"]) ? (input.rounds as RushSettings["rounds"]) : 10,
    timerSeconds: validTimers.includes(input.timerSeconds as RushSettings["timerSeconds"]) ? (input.timerSeconds as RushSettings["timerSeconds"]) : 10,
    difficulty: validDiff.includes(input.difficulty as RushDifficulty) ? (input.difficulty as RushDifficulty) : "mixed",
    challengeTypes: validTypes.length ? validTypes : defaultRushSettings.challengeTypes,
    specialRounds: typeof input.specialRounds === "boolean" ? input.specialRounds : true,
    language: input.language === "en" ? "en" : "ar",
  };
}

export function specialRoundMeta(special: RushSpecialRound, language: RushLanguage) {
  const map = {
    ar: {
      none: { badge: "", title: "", desc: "" },
      double: { badge: "🔥 نقاط مضاعفة", title: "جولة النقاط المضاعفة ×2", desc: "كل إجابة صحيحة في هذه الجولة تمنح ضعف النقاط!" },
      speed: { badge: "⚡ جولة خاطفة", title: "جولة السرعة القصوى", desc: "الوقت أقصر بكثير — تحرك فورًا!" },
      oneChance: { badge: "💀 فرصة واحدة", title: "فرصة واحدة فقط", desc: "لا مجال للتردد؛ أول ضغطة تحسم النتيجة." },
      precision: { badge: "🎯 دقة عالية", title: "جولة الدقة", desc: "خيارات متقاربة جدًا ومكافأة إضافية للتركيز." },
    },
    en: {
      none: { badge: "", title: "", desc: "" },
      double: { badge: "🔥 DOUBLE POINTS", title: "Double Points ×2", desc: "Every correct answer in this round earns double points!" },
      speed: { badge: "⚡ SPEED ROUND", title: "Extreme Speed Round", desc: "Much shorter timer — react instantly!" },
      oneChance: { badge: "💀 ONE CHANCE", title: "One Chance Only", desc: "No hesitation — your first tap decides the round." },
      precision: { badge: "🎯 PRECISION ROUND", title: "Precision Round", desc: "Closer decoys with an extra accuracy bonus." },
    },
  };
  return map[language][special];
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function resolveDifficulty(setting: RushDifficulty): Exclude<RushDifficulty, "mixed"> {
  if (setting !== "mixed") return setting;
  return pick(["easy", "medium", "hard"] as const);
}

export function chooseSpecialRound(roundNumber: number, enabled: boolean): RushSpecialRound {
  if (!enabled || roundNumber <= 1) return "none";
  if (roundNumber % 3 !== 0 && Math.random() > 0.28) return "none";
  return pick(["double", "speed", "oneChance", "precision"] as const);
}

export function calculateRushScore(params: {
  correct: boolean;
  elapsedMs: number;
  durationMs: number;
  difficulty: Exclude<RushDifficulty, "mixed">;
  special: RushSpecialRound;
}) {
  if (!params.correct) return 0;
  const safeDuration = Math.max(1200, params.durationMs);
  const clampedElapsed = Math.max(120, Math.min(safeDuration, params.elapsedMs));
  const speedRatio = Math.max(0, 1 - clampedElapsed / safeDuration);
  const diffBonus = params.difficulty === "hard" ? 8 : params.difficulty === "medium" ? 4 : 0;
  const precisionBonus = params.special === "precision" ? 6 : 0;
  const raw = Math.round(12 + speedRatio * 18 + diffBonus + precisionBonus);
  return params.special === "double" ? raw * 2 : raw;
}

export function generateRushChallenge(settings: RushSettings, roundNumber: number, previousType?: RushChallengeType): RushChallengeBundle {
  const pool = settings.challengeTypes.length ? settings.challengeTypes : defaultRushSettings.challengeTypes;
  const filtered = pool.length > 1 && previousType ? pool.filter((item) => item !== previousType) : pool;
  const type = pick(filtered);
  const difficulty = resolveDifficulty(settings.difficulty);
  const special = chooseSpecialRound(roundNumber, settings.specialRounds);
  const baseDuration = settings.timerSeconds * 1000;
  const durationMs = special === "speed" ? Math.max(3500, Math.round(baseDuration * 0.6)) : baseDuration;
  const id = `rush_${roundNumber}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const lang = settings.language;

  if (type === "reaction") {
    const delay = difficulty === "hard" ? 1300 : difficulty === "medium" ? 1050 : 800;
    const options: RushOption[] = [
      { id: "strike", label: lang === "ar" ? "⚡ اضرب الهدف الآن!" : "⚡ TAP TARGET NOW!", tone: "bolt" },
      { id: "decoy", label: lang === "ar" ? "⏳ فخ مبكر" : "⏳ Early decoy", tone: "muted" },
    ];
    return {
      publicChallenge: {
        id, type, difficulty, special, durationMs,
        title: lang === "ar" ? "⚡ سرعة الاستجابة" : "⚡ Reaction Strike",
        instruction: lang === "ar" ? "انتظر إشارة البرق الخضراء ثم اضغط الهدف فور ظهورها!" : "Wait for the green lightning signal, then tap the target immediately!",
        options,
        reactionDelayMs: delay,
      },
      secret: { correctOptionId: "strike" },
    };
  }

  if (type === "difference") {
    const sets = [
      { common: "🔷", odd: "🔶" },
      { common: "⭐", odd: "🌟" },
      { common: "🍀", odd: "🍁" },
      { common: "🟣", odd: "🔮" },
      { common: "🚀", odd: "🛸" },
    ];
    const chosen = pick(sets);
    const total = difficulty === "hard" || special === "precision" ? 9 : 6;
    const oddIndex = Math.floor(Math.random() * total);
    const options = Array.from({ length: total }, (_, idx) => ({
      id: `diff_${idx}`,
      label: idx === oddIndex ? chosen.odd : chosen.common,
    }));
    return {
      publicChallenge: {
        id, type, difficulty, special, durationMs,
        title: lang === "ar" ? "👀 اكتشف المختلف" : "👀 Find the Difference",
        instruction: lang === "ar" ? "اضغط الرمز المختلف عن البقية بأسرع وقت." : "Tap the symbol that differs from the rest.",
        options,
      },
      secret: { correctOptionId: `diff_${oddIndex}` },
    };
  }

  if (type === "memory") {
    const bank = ["⚡", "🎯", "💎", "🔥", "🌙", "👑", "🍀", "🚀"];
    const symbols = shuffle(bank).slice(0, difficulty === "hard" ? 4 : 3);
    const targetPos = Math.floor(Math.random() * symbols.length);
    const correctSymbol = symbols[targetPos];
    const distractors = shuffle(bank.filter((item) => item !== correctSymbol)).slice(0, 3);
    const options = shuffle([correctSymbol, ...distractors]).map((symbol, idx) => ({ id: `mem_${idx}_${symbol}`, label: symbol }));
    const correctOptionId = options.find((item) => item.label === correctSymbol)!.id;
    const posLabelAr = ["الأول", "الثاني", "الثالث", "الرابع"][targetPos];
    const posLabelEn = ["1st", "2nd", "3rd", "4th"][targetPos];
    return {
      publicChallenge: {
        id, type, difficulty, special, durationMs,
        title: lang === "ar" ? "🧠 الذاكرة السريعة" : "🧠 Flash Memory",
        instruction: lang === "ar" ? `احفظ الرموز ثم اختر الرمز ${posLabelAr}.` : `Memorize the symbols, then pick the ${posLabelEn} symbol.`,
        options,
        memorySymbols: symbols,
        memoryHideMs: difficulty === "hard" ? 1150 : 1500,
      },
      secret: { correctOptionId },
    };
  }

  if (type === "math") {
    const a = Math.floor(Math.random() * (difficulty === "hard" ? 18 : 11)) + 4;
    const b = Math.floor(Math.random() * (difficulty === "hard" ? 14 : 9)) + 3;
    const op = difficulty === "easy" ? "+" : pick(["+", "-", "×"] as const);
    const answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
    const rawChoices = Array.from(new Set([answer, answer + 2, answer - 2, answer + 5, answer - 3])).slice(0, 4);
    const options = shuffle(rawChoices).map((val) => ({ id: `math_${val}`, label: String(val) }));
    return {
      publicChallenge: {
        id, type, difficulty, special, durationMs,
        title: lang === "ar" ? "🔢 حساب سريع" : "🔢 Quick Math",
        instruction: `${a} ${op} ${b} = ?`,
        options,
      },
      secret: { correctOptionId: `math_${answer}` },
    };
  }

  if (type === "order") {
    const nums = shuffle([12, 5, 29, 18, 3, 41, 9, 24]).slice(0, difficulty === "hard" ? 4 : 3);
    const sorted = [...nums].sort((x, y) => x - y);
    const options = nums.map((n) => ({ id: `ord_${n}`, label: String(n) }));
    return {
      publicChallenge: {
        id, type, difficulty, special, durationMs,
        title: lang === "ar" ? "🧩 رتّبها تصاعديًا" : "🧩 Order Ascending",
        instruction: lang === "ar" ? "اضغط الأرقام من الأصغر إلى الأكبر بالترتيب." : "Tap the numbers from smallest to largest.",
        options,
        requiredSequenceLength: sorted.length,
      },
      secret: { correctSequence: sorted.map((n) => `ord_${n}`) },
    };
  }

  if (type === "target") {
    const catalog = [
      { id: "gold_star", icon: "⭐", ar: "النجمة الذهبية", en: "the golden star" },
      { id: "blue_gem", icon: "💎", ar: "الجوهرة الماسية", en: "the diamond gem" },
      { id: "fire_flame", icon: "🔥", ar: "الشعلة النارية", en: "the fire flame" },
      { id: "crown_king", icon: "👑", ar: "التاج الملكي", en: "the royal crown" },
      { id: "rocket_ship", icon: "🚀", ar: "الصاروخ الفضائي", en: "the space rocket" },
      { id: "target_bullseye", icon: "🎯", ar: "لوحة الهدف", en: "the bullseye target" },
    ];
    const selected = shuffle(catalog).slice(0, 4);
    const target = pick(selected);
    return {
      publicChallenge: {
        id, type, difficulty, special, durationMs,
        title: lang === "ar" ? "🎯 الهدف الصحيح" : "🎯 Correct Target",
        instruction: lang === "ar" ? `اضغط ${target.ar} فقط!` : `Tap ${target.en} only!`,
        options: selected.map((item) => ({ id: item.id, label: item.icon, sub: lang === "ar" ? item.ar : item.en })),
      },
      secret: { correctOptionId: target.id },
    };
  }

  if (type === "letter") {
    const words = lang === "ar"
      ? [
          { masked: "مـ _ ـتـاح", answer: "ف", choices: ["ف", "ق", "ك", "ب"], hint: "شيء يفتح الباب" },
          { masked: "قـ _ ـر", answer: "م", choices: ["م", "ن", "ل", "ر"], hint: "يضيء في الليل" },
          { masked: "سـ _ ـارة", answer: "ي", choices: ["ي", "و", "ط", "د"], hint: "وسيلة نقل" },
          { masked: "كـ _ ـاب", answer: "ت", choices: ["ت", "ث", "ب", "ن"], hint: "نقرأ فيه" },
        ]
      : [
          { masked: "P L _ N E T", answer: "A", choices: ["A", "E", "O", "U"], hint: "Orbits a star" },
          { masked: "B R _ D G E", answer: "I", choices: ["I", "A", "E", "O"], hint: "Crosses water" },
          { masked: "R O _ K E T", answer: "C", choices: ["C", "K", "S", "G"], hint: "Flies to space" },
          { masked: "T R _ P H Y", answer: "O", choices: ["O", "A", "U", "E"], hint: "Winner's prize" },
        ];
    const item = pick(words);
    const options = shuffle(item.choices).map((letter) => ({ id: `let_${letter}`, label: letter }));
    return {
      publicChallenge: {
        id, type, difficulty, special, durationMs,
        title: lang === "ar" ? "🔤 الحرف الناقص" : "🔤 Missing Letter",
        instruction: `${item.masked} — ${item.hint}`,
        options,
      },
      secret: { correctOptionId: `let_${item.answer}` },
    };
  }

  if (type === "dontTap") {
    const items = [
      { id: "bomb", icon: "💣", ar: "القنبلة", en: "the bomb" },
      { id: "gem", icon: "💎", ar: "الجوهرة", en: "the gem" },
      { id: "star", icon: "⭐", ar: "النجمة", en: "the star" },
      { id: "bolt", icon: "⚡", ar: "البرق", en: "the bolt" },
    ];
    const forbidden = items[0];
    const safeIds = items.slice(1).map((item) => item.id);
    return {
      publicChallenge: {
        id, type, difficulty, special, durationMs,
        title: lang === "ar" ? "🚫 لا تلمس المحظور!" : "🚫 Don't Tap!",
        instruction: lang === "ar" ? `اضغط أي رمز آمن — لا تلمس ${forbidden.ar} (${forbidden.icon})!` : `Tap any safe icon — DO NOT tap ${forbidden.en} (${forbidden.icon})!`,
        options: shuffle(items).map((item) => ({
          id: item.id,
          label: item.icon,
          sub: lang === "ar" ? item.ar : item.en,
          forbidden: item.id === forbidden.id,
        })),
      },
      secret: { safeOptionIds: safeIds },
    };
  }

  if (type === "color") {
    const palette = [
      { id: "green", hex: "#38d996", ar: "الأخضر", en: "GREEN" },
      { id: "red", hex: "#ff5d73", ar: "الأحمر", en: "RED" },
      { id: "blue", hex: "#4da3ff", ar: "الأزرق", en: "BLUE" },
      { id: "gold", hex: "#f7c948", ar: "الأصفر", en: "YELLOW" },
    ];
    const targetColor = pick(palette);
    const misleadingWord = pick(palette.filter((item) => item.id !== targetColor.id));
    return {
      publicChallenge: {
        id, type, difficulty, special, durationMs,
        title: lang === "ar" ? "🟢 تحدي الألوان" : "🟢 Color Challenge",
        instruction: lang === "ar"
          ? `تجاهل الكلمة "${misleadingWord.ar}" واضغط اللون ${targetColor.ar}!`
          : `Ignore the word "${misleadingWord.en}" and tap the ${targetColor.en} color swatch!`,
        options: shuffle(palette).map((item) => ({
          id: `clr_${item.id}`,
          label: lang === "ar" ? pick(palette).ar : pick(palette).en,
          color: item.hex,
        })),
      },
      secret: { correctOptionId: `clr_${targetColor.id}` },
    };
  }

  if (type === "wrongOne") {
    const pairs = lang === "ar"
      ? [
          { ok: ["7 × 3 = 21", "9 + 6 = 15", "18 ÷ 3 = 6"], wrong: "8 × 4 = 36" },
          { ok: ["الشمس نجم", "الماء H2O", "الأسبوع 7 أيام"], wrong: "السنة 10 أشهر" },
          { ok: ["القاهرة", "الرياض", "طوكيو"], wrong: "المحيط الهادئ" },
        ]
      : [
          { ok: ["7 × 3 = 21", "9 + 6 = 15", "18 ÷ 3 = 6"], wrong: "8 × 4 = 36" },
          { ok: ["Sun is a star", "Water is H2O", "Week has 7 days"], wrong: "Year has 10 months" },
          { ok: ["Tokyo", "Cairo", "Paris"], wrong: "Pacific Ocean" },
        ];
    const group = pick(pairs);
    const mixed = shuffle([
      ...group.ok.map((label, idx) => ({ id: `ok_${idx}`, label })),
      { id: "wrong_choice", label: group.wrong },
    ]);
    return {
      publicChallenge: {
        id, type, difficulty, special, durationMs,
        title: lang === "ar" ? "🕵️ اكتشف الخاطئ" : "🕵️ Find the Wrong One",
        instruction: lang === "ar" ? "واحدة من هذه البطاقات غير صحيحة — اضغطها!" : "One of these cards is wrong — tap it!",
        options: mixed,
      },
      secret: { correctOptionId: "wrong_choice" },
    };
  }

  const step1: RushMiniStep = {
    prompt: lang === "ar" ? "1/2 · اضغط السهم للأعلى" : "1/2 · Tap UP arrow",
    options: shuffle([
      { id: "up", label: "⬆️" },
      { id: "down", label: "⬇️" },
      { id: "left", label: "⬅️" },
    ]),
    correctOptionId: "up",
  };
  const step2: RushMiniStep = {
    prompt: lang === "ar" ? "2/2 · الآن اضغط البرق!" : "2/2 · Now tap LIGHTNING!",
    options: shuffle([
      { id: "bolt", label: "⚡" },
      { id: "moon", label: "🌙" },
      { id: "star", label: "⭐" },
    ]),
    correctOptionId: "bolt",
  };
  return {
    publicChallenge: {
      id,
      type: "speedChain",
      difficulty,
      special,
      durationMs,
      title: lang === "ar" ? "🔥 سلسلة السرعة" : "🔥 Speed Chain",
      instruction: lang === "ar" ? "أنجز خطوتين متتاليتين بدون خطأ!" : "Complete two tiny challenges in a row!",
      options: step1.options,
      chainSteps: [
        { prompt: step1.prompt, options: step1.options },
        { prompt: step2.prompt, options: step2.options },
      ],
    },
    secret: { chainAnswers: [step1.correctOptionId, step2.correctOptionId] },
  };
}

export function evaluateRushSubmission(secret: RushChallengeSecret, submission: unknown): boolean {
  if (secret.correctOptionId) {
    return typeof submission === "string" && submission === secret.correctOptionId;
  }
  if (secret.safeOptionIds) {
    return typeof submission === "string" && secret.safeOptionIds.includes(submission);
  }
  if (secret.correctSequence) {
    return Array.isArray(submission) &&
      submission.length === secret.correctSequence.length &&
      secret.correctSequence.every((id, idx) => submission[idx] === id);
  }
  if (secret.chainAnswers) {
    return Array.isArray(submission) &&
      submission.length === secret.chainAnswers.length &&
      secret.chainAnswers.every((id, idx) => submission[idx] === id);
  }
  return false;
}
