"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Check, ChevronLeft, CircleHelp, Clock3, Copy, Flame, Globe2,
  Pause, Play, Plus, RefreshCw, Sparkles, Target, Timer, Trophy, UserRound, UsersRound, X, Zap,
} from "lucide-react";
import {
  calculateRushScore,
  defaultRushSettings,
  evaluateRushSubmission,
  generateRushChallenge,
  rushChallengeCatalog,
  safeRushSettings,
  specialRoundMeta,
  type RushChallengePublic,
  type RushChallengeSecret,
  type RushChallengeType,
  type RushDifficulty,
  type RushLanguage,
  type RushSettings,
  type RushSpecialRound,
} from "@/lib/rush";
import {
  recordGameResultToAccount,
  saveUnfinishedSessionToAccount,
  triggerPremiumLockModal,
} from "@/lib/platform-client";
import { playCountdownSecond, playEffect } from "@/lib/sounds";
import SoundControls from "@/components/SoundControls";

type Mode = "local" | "online";
type Screen = "home" | "mode" | "setup" | "join" | "lobby" | "game";
type Player = { id: string; nickname: string; isHost: boolean; isConnected?: boolean; score: number };
type Stat = { correct: number; wrong: number; timeout: number; streak: number; bestStreak: number; fastestMs: number | null };

type LocalState = {
  players: Player[];
  settings: RushSettings;
  round: number;
  turnIndex: number;
  phase: "handoff" | "intro" | "challenge" | "result" | "finished";
  introCount: number;
  challenge: RushChallengePublic | null;
  secret: RushChallengeSecret | null;
  startedAt: number | null;
  deadline: number | null;
  stats: Record<string, Stat>;
  result: {
    playerId: string;
    status: "correct" | "wrong" | "timeout";
    pointsEarned: number;
    responseMs: number;
    challengeTitle: string;
  } | null;
};

type OnlineSnapshot = {
  room: { code: string; settings: RushSettings };
  self: Player;
  players: Player[];
  game?: {
    status: "lobby" | "challenge" | "result" | "finished";
    roundNumber: number;
    totalRounds: number;
    turnIndex: number;
    currentPlayerId: string | null;
    currentTurnId: string | null;
    special: RushSpecialRound;
    challengeTitle: string;
    challengeType: RushChallengeType;
    durationMs: number;
    expiresAt: string | null;
    result: {
      playerId: string;
      status: "correct" | "wrong" | "timeout";
      pointsEarned: number;
      responseMs: number;
      challengeTitle: string;
    } | null;
    stats: Record<string, Stat>;
  };
};

const copy = {
  ar: {
    title: "التحدي السريع",
    kicker: "ردة فعل وذكاء",
    hero: "تحديات خاطفة في ثوانٍ معدودة: سرعة، ذاكرة، دقة، وملاحظة!",
    start: "ابدأ التحدي",
    local: "لعب على نفس الهاتف",
    online: "لعب أونلاين",
    join: "الانضمام لغرفة",
    create: "إنشاء غرفة",
    nickname: "اسمك المستعار",
    code: "رمز الغرفة",
    settings: "إعدادات التحدي",
    players: "المتنافسون",
    add: "إضافة لاعب",
    rounds: "عدد الجولات",
    timer: "مؤقت التحدي",
    difficulty: "الصعوبة",
    challenges: "أنواع التحديات",
    all: "تحديد الكل",
    specialToggle: "الجولات الخاصة (🔥 ×2 / ⚡ سرعة / 💀 فرصة)",
    ready: "أنا جاهز",
    passPhone: "مرر الهاتف إلى",
    privateHint: "التحدي يظهر بعد الضغط على أنا جاهز لمنع الغش.",
    getReady: "استعد!",
    timeAlert: "انتهى الوقت!",
    challengeDone: "⚡ التحدي انتهى!",
    correct: "✅ صحيح",
    wrong: "❌ خطأ",
    timeout: "⏰ انتهى الوقت",
    speed: "السرعة",
    points: "النقاط",
    total: "المجموع",
    nextNow: "التالي فورًا",
    waitingTurn: "الدور الآن عند",
    gameOver: "🏆 انتهى التحدي!",
    playAgain: "لعب مرة أخرى",
    back: "العودة إلى الألعاب",
    fastest: "⚡ أسرع استجابة",
    mostCorrect: "🧠 أكثر إجابات صحيحة",
    bestStreak: "🔥 أطول سلسلة نجاح",
    topScore: "🎯 أعلى مجموع نقاط",
    waitingPlayers: "بانتظار المتنافسين",
    needTwo: "يلزم لاعبان على الأقل",
    live: "مزامنة مباشرة",
    copy: "نسخ",
    copied: "تم النسخ",
    leave: "خروج",
    paused: "التحدي متوقف مؤقتًا",
    resume: "متابعة",
    waitGreen: "انتظر اللون الأخضر...",
    memorizeNow: "احفظ الرموز الآن!",
  },
  en: {
    title: "Quick Challenge",
    kicker: "Reaction & Wits",
    hero: "Rapid micro-challenges in seconds: reaction, memory, precision, and observation!",
    start: "Start Challenge",
    local: "Same Phone",
    online: "Play Online",
    join: "Join Room",
    create: "Create Room",
    nickname: "Your Nickname",
    code: "Room Code",
    settings: "Challenge Settings",
    players: "Competitors",
    add: "Add Player",
    rounds: "Rounds",
    timer: "Challenge Timer",
    difficulty: "Difficulty",
    challenges: "Challenge Types",
    all: "Select All",
    specialToggle: "Special Rounds (🔥 ×2 / ⚡ Speed / 💀 One Chance)",
    ready: "I'm Ready",
    passPhone: "Pass the phone to",
    privateHint: "The challenge appears only after pressing I'm Ready.",
    getReady: "Get Ready!",
    timeAlert: "TIME!",
    challengeDone: "⚡ Challenge Complete!",
    correct: "✅ Correct",
    wrong: "❌ Wrong",
    timeout: "⏰ Time Expired",
    speed: "Speed",
    points: "Points",
    total: "Total",
    nextNow: "Next Now",
    waitingTurn: "Current turn:",
    gameOver: "🏆 Challenge Finished!",
    playAgain: "Play Again",
    back: "Back to Games",
    fastest: "⚡ Fastest Response",
    mostCorrect: "🧠 Most Correct Answers",
    bestStreak: "🔥 Longest Streak",
    topScore: "🎯 Highest Total Score",
    waitingPlayers: "Waiting for players",
    needTwo: "At least 2 players needed",
    live: "Live Sync",
    copy: "Copy",
    copied: "Copied",
    leave: "Leave",
    paused: "Challenge Paused",
    resume: "Resume",
    waitGreen: "Wait for green signal...",
    memorizeNow: "Memorize symbols now!",
  },
} as const;

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyStat(): Stat {
  return { correct: 0, wrong: 0, timeout: 0, streak: 0, bestStreak: 0, fastestMs: null };
}

async function api<T>(url: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { "x-laabtna-token": token } : {}),
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body as T;
}

export default function RushGame({
  language: initialLanguage = "ar",
  onBack,
}: {
  language?: RushLanguage;
  onBack: () => void;
}) {
  const [language, setLanguage] = useState<RushLanguage>(initialLanguage);
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<Mode>("local");
  const [names, setNames] = useState(["أحمد", "سارة", "خالد"]);
  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [settings, setSettings] = useState<RushSettings>({ ...defaultRushSettings, language: initialLanguage });
  const [local, setLocal] = useState<LocalState | null>(null);
  const [online, setOnline] = useState<OnlineSnapshot | null>(null);
  const [privateChallenge, setPrivateChallenge] = useState<(RushChallengePublic & { expiresAt: string }) | null>(null);
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);

  const [remainingSeconds, setRemainingSeconds] = useState(10);
  const [progressRatio, setProgressRatio] = useState(1);
  const [sequencePicked, setSequencePicked] = useState<string[]>([]);
  const [chainAnswers, setChainAnswers] = useState<string[]>([]);
  const [reactionReady, setReactionReady] = useState(false);
  const [memoryHidden, setMemoryHidden] = useState(false);

  const lastTickSecondRef = useRef<number | null>(null);
  const timeoutHandledRef = useRef(false);
  const lastOnlineResultSoundRef = useRef("");
  const t = copy[language];

  const recordedRushResult = useRef("");

  useEffect(() => {
    setSettings((current) => ({ ...current, language }));
  }, [language]);

  useEffect(() => {
    const raw = window.sessionStorage.getItem("laabtna:resume:rush");
    if (!raw) return;
    window.sessionStorage.removeItem("laabtna:resume:rush");
    try {
      const saved = JSON.parse(raw) as LocalState;
      if (saved?.players?.length) {
        setLocal(saved);
        setScreen("game");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!local) return;
    if (local.phase !== "finished") {
      void saveUnfinishedSessionToAccount({
        gameKey: "rush",
        gameName: "⚡ التحدي السريع",
        mode: "local",
        roundNumber: local.round,
        totalRounds: local.settings.rounds,
        score: Math.max(0, ...local.players.map((p) => p.score)),
        statePayload: local as unknown as Record<string, unknown>,
      });
    } else {
      const sig = `rush_${local.round}_${local.players.map((p) => p.score).join("-")}`;
      if (recordedRushResult.current !== sig) {
        recordedRushResult.current = sig;
        const sorted = [...local.players].sort((a, b) => b.score - a.score);
        void recordGameResultToAccount({
          gameKey: "rush",
          gameName: "⚡ التحدي السريع",
          mode: "local",
          score: sorted[0]?.score ?? 0,
          rounds: local.settings.rounds,
          rankLabel: `🥇 ${sorted[0]?.nickname ?? "—"}`,
          stats: { leaderboard: sorted, stats: local.stats },
        });
      }
    }
  }, [local]);

  const resetChallengeVisualState = useCallback((challenge: RushChallengePublic | null) => {
    setSequencePicked([]);
    setChainAnswers([]);
    setReactionReady(challenge?.type !== "reaction");
    setMemoryHidden(false);
    lastTickSecondRef.current = null;
    timeoutHandledRef.current = false;
  }, []);

  useEffect(() => {
    const active = local?.phase === "challenge" ? local.challenge : privateChallenge;
    if (!active) return;
    resetChallengeVisualState(active);
    const timers: number[] = [];
    if (active.type === "reaction" && active.reactionDelayMs) {
      timers.push(
        window.setTimeout(() => {
          setReactionReady(true);
          playEffect("special");
        }, active.reactionDelayMs),
      );
    }
    if (active.type === "memory" && active.memoryHideMs) {
      timers.push(window.setTimeout(() => setMemoryHidden(true), active.memoryHideMs));
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [local?.challenge, local?.phase, privateChallenge, resetChallengeVisualState]);

  const startLocalGame = () => {
    const clean = names.map((n) => n.trim().replace(/\s+/g, " ")).filter(Boolean);
    if (clean.length < 2 || clean.length > 8) {
      setNotice(language === "ar" ? "أدخل من 2 إلى 8 أسماء" : "Enter 2–8 player names");
      return;
    }
    const configured = safeRushSettings({ ...settings, language });
    const players: Player[] = clean.map((playerName, idx) => ({
      id: makeId("rush_p"),
      nickname: playerName,
      isHost: idx === 0,
      score: 0,
    }));
    setLocal({
      players,
      settings: configured,
      round: 1,
      turnIndex: 0,
      phase: "handoff",
      introCount: 3,
      challenge: null,
      secret: null,
      startedAt: null,
      deadline: null,
      stats: Object.fromEntries(players.map((p) => [p.id, emptyStat()])),
      result: null,
    });
    setScreen("game");
    playEffect("start");
  };

  const beginLocalIntro = () => {
    if (!local) return;
    const bundle = generateRushChallenge(local.settings, local.round, local.challenge?.type);
    if (bundle.publicChallenge.special !== "none") playEffect("special");
    else playEffect("start");
    setLocal({
      ...local,
      phase: "intro",
      introCount: 3,
      challenge: bundle.publicChallenge,
      secret: bundle.secret,
      result: null,
    });
  };

  useEffect(() => {
    if (!local || local.phase !== "intro") return;
    playCountdownSecond(local.introCount + 4);
    const id = window.setTimeout(() => {
      setLocal((curr) => {
        if (!curr || curr.phase !== "intro" || !curr.challenge) return curr;
        if (curr.introCount > 1) return { ...curr, introCount: curr.introCount - 1 };
        const now = Date.now();
        playEffect("start");
        return {
          ...curr,
          phase: "challenge",
          startedAt: now,
          deadline: now + curr.challenge.durationMs,
        };
      });
    }, 520);
    return () => window.clearTimeout(id);
  }, [local]);

  const resolveLocalTurn = useCallback((status: "correct" | "wrong" | "timeout", customElapsedMs?: number) => {
    setLocal((curr) => {
      if (!curr || curr.phase !== "challenge" || !curr.challenge) return curr;
      const player = curr.players[curr.turnIndex];
      const elapsedMs =
        status === "timeout"
          ? curr.challenge.durationMs
          : Math.max(110, Math.min(curr.challenge.durationMs, customElapsedMs ?? Date.now() - (curr.startedAt ?? Date.now())));
      const pointsEarned = calculateRushScore({
        correct: status === "correct",
        elapsedMs,
        durationMs: curr.challenge.durationMs,
        difficulty: curr.challenge.difficulty,
        special: curr.challenge.special,
      });

      if (status === "correct") {
        playEffect("success");
        playEffect("score");
      } else if (status === "timeout") {
        playEffect("timeout");
      } else {
        playEffect("fail");
      }

      const prevStat = curr.stats[player.id] ?? emptyStat();
      const nextStreak = status === "correct" ? prevStat.streak + 1 : 0;
      const updatedStat: Stat = {
        correct: prevStat.correct + (status === "correct" ? 1 : 0),
        wrong: prevStat.wrong + (status === "wrong" ? 1 : 0),
        timeout: prevStat.timeout + (status === "timeout" ? 1 : 0),
        streak: nextStreak,
        bestStreak: Math.max(prevStat.bestStreak, nextStreak),
        fastestMs:
          status === "correct"
            ? prevStat.fastestMs === null
              ? elapsedMs
              : Math.min(prevStat.fastestMs, elapsedMs)
            : prevStat.fastestMs,
      };

      const players = curr.players.map((p) => (p.id === player.id ? { ...p, score: p.score + pointsEarned } : p));
      return {
        ...curr,
        players,
        stats: { ...curr.stats, [player.id]: updatedStat },
        phase: "result",
        deadline: null,
        result: {
          playerId: player.id,
          status,
          pointsEarned,
          responseMs: elapsedMs,
          challengeTitle: curr.challenge.title,
        },
      };
    });
  }, []);

  const advanceLocalTurn = useCallback(() => {
    setLocal((curr) => {
      if (!curr || curr.phase !== "result") return curr;
      playEffect("transition");
      if (curr.turnIndex + 1 < curr.players.length) {
        return { ...curr, turnIndex: curr.turnIndex + 1, phase: "handoff", result: null };
      }
      if (curr.round >= curr.settings.rounds) {
        playEffect("victory");
        return { ...curr, phase: "finished" };
      }
      return { ...curr, round: curr.round + 1, turnIndex: 0, phase: "handoff", result: null };
    });
  }, []);

  useEffect(() => {
    if (!local || local.phase !== "result") return;
    const timer = window.setTimeout(() => advanceLocalTurn(), 1900);
    return () => window.clearTimeout(timer);
  }, [advanceLocalTurn, local]);

  // Smooth RAF visual timer + synchronized per-second audio tick for both local and online active challenges
  useEffect(() => {
    if (paused) return;
    const isLocalChallenge = local?.phase === "challenge" && local.deadline && local.challenge;
    const onlineExpires = online?.game?.status === "challenge" && online.game.expiresAt ? new Date(online.game.expiresAt).getTime() : null;
    const deadline = isLocalChallenge ? local.deadline! : onlineExpires;
    const totalDuration = isLocalChallenge ? local.challenge!.durationMs : online?.game?.durationMs ?? 10000;

    if (!deadline) return;

    let rafId = 0;
    const updateFrame = () => {
      const remainingMs = Math.max(0, deadline - Date.now());
      const sec = Math.ceil(remainingMs / 1000);
      setRemainingSeconds(sec);
      setProgressRatio(Math.max(0, Math.min(1, remainingMs / Math.max(1000, totalDuration))));

      if (sec > 0 && lastTickSecondRef.current !== sec) {
        lastTickSecondRef.current = sec;
        playCountdownSecond(sec);
      }

      if (remainingMs <= 0) {
        if (!timeoutHandledRef.current) {
          timeoutHandledRef.current = true;
          if (isLocalChallenge) {
            resolveLocalTurn("timeout", totalDuration);
          } else {
            playEffect("timeout");
          }
        }
        return;
      }
      rafId = window.requestAnimationFrame(updateFrame);
    };

    rafId = window.requestAnimationFrame(updateFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [local, online?.game?.durationMs, online?.game?.expiresAt, online?.game?.status, paused, resolveLocalTurn]);

  const syncOnline = useCallback(async () => {
    if (!code || !token) return;
    try {
      const data = await api<OnlineSnapshot>(`/api/rush/rooms/${code}`, { method: "GET" }, token);
      setOnline(data);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر الاتصال بالغرفة");
    }
  }, [code, token]);

  useEffect(() => {
    if (!["lobby", "game"].includes(screen) || !code || !token) return;
    void syncOnline();
    const id = window.setInterval(() => void syncOnline(), 950);
    return () => window.clearInterval(id);
  }, [code, screen, syncOnline, token]);

  useEffect(() => {
    if (screen === "lobby" && online?.game && online.game.status !== "lobby") {
      setScreen("game");
      playEffect("start");
    }
  }, [online?.game, screen]);

  useEffect(() => {
    const game = online?.game;
    if (!game || game.status !== "challenge" || game.currentPlayerId !== online.self.id || !code || !token) {
      setPrivateChallenge(null);
      return;
    }
    let cancelled = false;
    api<{ challenge: (RushChallengePublic & { expiresAt: string }) | null }>(`/api/rush/rooms/${code}/challenge`, { method: "GET" }, token)
      .then((res) => {
        if (!cancelled && res.challenge) {
          setPrivateChallenge(res.challenge);
          if (res.challenge.special !== "none") playEffect("special");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [code, online?.game?.currentPlayerId, online?.game?.currentTurnId, online?.game?.status, online?.self.id, token]);

  useEffect(() => {
    const game = online?.game;
    const key = game?.status === "result" ? `${game.currentTurnId}_${game.result?.status}` : game?.status === "finished" ? `done_${game.roundNumber}` : "";
    if (key && key !== lastOnlineResultSoundRef.current) {
      lastOnlineResultSoundRef.current = key;
      if (game?.status === "finished") playEffect("victory");
      else if (game?.result?.status === "correct") {
        playEffect("success");
        playEffect("score");
      } else if (game?.result?.status === "timeout") playEffect("timeout");
      else playEffect("fail");
    }
  }, [online?.game]);

  const sendOnlineAction = useCallback(async (action: string, submission?: unknown) => {
    if (!code || !token) return;
    setBusy(true);
    try {
      await api(`/api/rush/rooms/${code}/action`, { method: "POST", body: JSON.stringify({ action, submission }) }, token);
      await syncOnline();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر إكمال الخطوة");
    } finally {
      setBusy(false);
    }
  }, [code, syncOnline, token]);

  useEffect(() => {
    const game = online?.game;
    if (!game || game.status !== "result") return;
    const canAdvance = online.self.isHost || game.currentPlayerId === online.self.id;
    if (!canAdvance) return;
    const id = window.setTimeout(() => {
      void sendOnlineAction("next");
    }, 2000);
    return () => window.clearTimeout(id);
  }, [online?.game, online?.self.id, online?.self.isHost, sendOnlineAction]);

  const handleOptionPress = (challenge: RushChallengePublic, optionId: string) => {
    if (challenge.type === "reaction" && !reactionReady) {
      if (local) resolveLocalTurn("wrong");
      else void sendOnlineAction("submit", "__early__");
      return;
    }

    if (challenge.type === "order") {
      const next = sequencePicked.includes(optionId) ? sequencePicked : [...sequencePicked, optionId];
      setSequencePicked(next);
      playEffect("select");
      const need = challenge.requiredSequenceLength ?? challenge.options.length;
      if (next.length >= need) {
        if (local && local.secret) {
          const ok = evaluateRushSubmission(local.secret, next);
          resolveLocalTurn(ok ? "correct" : "wrong");
        } else {
          void sendOnlineAction("submit", next);
        }
      }
      return;
    }

    if (challenge.type === "speedChain" && challenge.chainSteps) {
      const next = [...chainAnswers, optionId];
      setChainAnswers(next);
      playEffect("select");
      if (next.length >= challenge.chainSteps.length) {
        if (local && local.secret) {
          const ok = evaluateRushSubmission(local.secret, next);
          resolveLocalTurn(ok ? "correct" : "wrong");
        } else {
          void sendOnlineAction("submit", next);
        }
      }
      return;
    }

    if (local && local.secret) {
      const ok = evaluateRushSubmission(local.secret, optionId);
      resolveLocalTurn(ok ? "correct" : "wrong");
    } else {
      void sendOnlineAction("submit", optionId);
    }
  };

  const createOnlineRoom = async () => {
    if (!nickname.trim()) return;
    setBusy(true);
    setNotice("");
    try {
      const data = await api<{ code: string; token: string }>("/api/rush/rooms", {
        method: "POST",
        body: JSON.stringify({ action: "create", nickname, settings: { ...settings, language } }),
      });
      setCode(data.code);
      setToken(data.token);
      setScreen("lobby");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "تعذر إنشاء الغرفة";
      if (msg.includes("الميزات المتقدمة")) {
        triggerPremiumLockModal("rush");
        onBack();
      } else {
        setNotice(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const joinOnlineRoom = async () => {
    if (!nickname.trim() || joinCode.length !== 5) return;
    setBusy(true);
    setNotice("");
    try {
      const data = await api<{ code: string; token: string }>("/api/rush/rooms", {
        method: "POST",
        body: JSON.stringify({ action: "join", code: joinCode, nickname }),
      });
      setCode(data.code);
      setToken(data.token);
      setScreen("lobby");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر الانضمام");
    } finally {
      setBusy(false);
    }
  };

  const toggleChallengeType = (id: RushChallengeType) => {
    setSettings((curr) => {
      const exists = curr.challengeTypes.includes(id);
      const next = exists ? curr.challengeTypes.filter((item) => item !== id) : [...curr.challengeTypes, id];
      return { ...curr, challengeTypes: next.length ? next : [id] };
    });
  };

  const currentLocalPlayer = local?.players[local.turnIndex];

  return (
    <main className="rush-shell" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="rush-glow rush-glow-a" />
      <div className="rush-glow rush-glow-b" />
      <header className="rush-topbar">
        <button className="rush-brand" onClick={onBack}>
          <span><Zap /></span>
          <b>LAABTNA<small>{t.kicker}</small></b>
        </button>
        <div className="rush-top-actions">
          <SoundControls language={language} />
          <button className="rush-lang" onClick={() => setLanguage((l) => (l === "ar" ? "en" : "ar"))}>
            {language === "ar" ? "EN" : "ع"}
          </button>
          {["game", "lobby"].includes(screen) && (
            <button className="rush-icon-btn" onClick={() => setPaused(true)} aria-label={t.paused}>
              <Pause size={16} />
            </button>
          )}
        </div>
      </header>

      {notice && (
        <div className="rush-toast" role="alert">
          <CircleHelp size={16} />
          <span>{notice}</span>
          <button onClick={() => setNotice("")}><X size={15} /></button>
        </div>
      )}

      {screen === "home" && (
        <section className="rush-home">
          <div className="rush-hero-copy">
            <p className="rush-kicker"><Sparkles size={14} /> {t.kicker}</p>
            <h1><span>LAABTNA</span>⚡ {t.title}</h1>
            <p>{t.hero}</p>
            <div className="rush-actions">
              <button className="rush-primary" onClick={() => setScreen("mode")}>
                <Zap size={18} />
                {t.start}
                <ArrowLeft size={17} />
              </button>
              <button className="rush-link" onClick={onBack}>{t.back}</button>
            </div>
          </div>
          <div className="rush-hero-card" aria-hidden="true">
            <div className="rush-bolt">⚡</div>
            <div className="rush-pill-row">
              <span>🎯</span><span>🧠</span><span>👀</span><span>🔥</span>
            </div>
            <b>FAST<br />REFLEX<br />ARENA</b>
          </div>
        </section>
      )}

      {screen === "mode" && (
        <section className="rush-center">
          <p className="rush-kicker"><Zap size={14} /> {t.title}</p>
          <h1>{language === "ar" ? "اختر طريقة اللعب" : "Choose How to Play"}</h1>
          <div className="rush-mode-grid">
            <button onClick={() => { setMode("local"); setScreen("setup"); }}>
              <span>📱</span>
              <b>{t.local}</b>
              <small>{language === "ar" ? "بدون رمز غرفة — مرر الهاتف وتنافسوا فورًا" : "No room code — pass one phone"}</small>
              <ChevronLeft />
            </button>
            <button onClick={() => { setMode("online"); setScreen("setup"); }}>
              <span><Globe2 /></span>
              <b>{t.online}</b>
              <small>{language === "ar" ? "غرفة أونلاين متزامنة بين الهواتف" : "Live synchronized room across phones"}</small>
              <ChevronLeft />
            </button>
          </div>
          <button className="rush-link" onClick={() => setScreen("join")}>
            <Globe2 size={15} /> {t.join}
          </button>
        </section>
      )}

      {screen === "setup" && (
        <section className="rush-setup">
          <div className="rush-head">
            <button onClick={() => setScreen("mode")}><ArrowLeft /></button>
            <div>
              <p className="rush-kicker">{mode === "local" ? `📱 ${t.local}` : `🌐 ${t.online}`}</p>
              <h1>{t.settings}</h1>
            </div>
          </div>

          <div className="rush-setup-grid">
            <section className="rush-card">
              <div className="rush-card-title"><UsersRound size={17} /> {t.players}</div>
              {mode === "local" ? (
                <>
                  <div className="rush-names">
                    {names.map((name, idx) => (
                      <div key={idx}>
                        <span>{idx + 1}</span>
                        <input
                          value={name}
                          maxLength={18}
                          onChange={(e) => setNames(names.map((item, i) => (i === idx ? e.target.value : item)))}
                        />
                        {names.length > 2 && (
                          <button onClick={() => setNames(names.filter((_, i) => i !== idx))}><X size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  {names.length < 8 && (
                    <button className="rush-add" onClick={() => setNames([...names, ""])}>
                      <Plus size={15} /> {t.add}
                    </button>
                  )}
                </>
              ) : (
                <label className="rush-label">
                  {t.nickname}
                  <input value={nickname} maxLength={18} onChange={(e) => setNickname(e.target.value)} autoFocus />
                </label>
              )}
            </section>

            <section className="rush-card">
              <div className="rush-card-title"><Timer size={17} /> {t.settings}</div>
              <div className="rush-seg">
                <span>{t.rounds}</span>
                <div>
                  {([5, 10, 15, 20] as const).map((r) => (
                    <button key={r} className={settings.rounds === r ? "selected" : ""} onClick={() => setSettings({ ...settings, rounds: r })}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rush-seg">
                <span>{t.timer}</span>
                <div>
                  {([5, 10, 15, 20] as const).map((sec) => (
                    <button key={sec} className={settings.timerSeconds === sec ? "selected" : ""} onClick={() => setSettings({ ...settings, timerSeconds: sec })}>
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
              <div className="rush-seg">
                <span>{t.difficulty}</span>
                <div>
                  {(["easy", "medium", "hard", "mixed"] as RushDifficulty[]).map((d) => (
                    <button key={d} className={settings.difficulty === d ? "selected" : ""} onClick={() => setSettings({ ...settings, difficulty: d })}>
                      {d === "easy" ? (language === "ar" ? "سهل" : "Easy") : d === "medium" ? (language === "ar" ? "متوسط" : "Medium") : d === "hard" ? (language === "ar" ? "صعب" : "Hard") : (language === "ar" ? "مختلط" : "Mixed")}
                    </button>
                  ))}
                </div>
              </div>
              <label className="rush-switch">
                <span><Flame size={15} /> {t.specialToggle}</span>
                <input
                  type="checkbox"
                  checked={settings.specialRounds}
                  onChange={(e) => setSettings({ ...settings, specialRounds: e.target.checked })}
                />
              </label>
            </section>

            <section className="rush-card rush-span-full">
              <div className="rush-card-title">
                <Target size={17} /> {t.challenges}
                <button className="rush-mini-btn" onClick={() => setSettings({ ...settings, challengeTypes: rushChallengeCatalog.map((c) => c.id) })}>
                  {t.all}
                </button>
              </div>
              <div className="rush-type-grid">
                {rushChallengeCatalog.map((item) => (
                  <button
                    key={item.id}
                    className={settings.challengeTypes.includes(item.id) ? "selected" : ""}
                    onClick={() => toggleChallengeType(item.id)}
                  >
                    <span>{item.icon}</span>
                    <b>{language === "ar" ? item.ar : item.en}</b>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <button
            className="rush-primary rush-submit"
            disabled={busy || (mode === "online" && !nickname.trim()) || (mode === "local" && names.filter((n) => n.trim()).length < 2)}
            onClick={() => (mode === "local" ? startLocalGame() : void createOnlineRoom())}
          >
            <Zap size={18} />
            {mode === "local" ? t.start : t.create}
            <ArrowLeft size={17} />
          </button>
        </section>
      )}

      {screen === "join" && (
        <section className="rush-center rush-join">
          <p className="rush-kicker">{t.online}</p>
          <h1>{t.join}</h1>
          <label className="rush-label">
            {t.code}
            <input
              className="rush-code-input"
              placeholder="A7K92"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 5))}
            />
          </label>
          <label className="rush-label">
            {t.nickname}
            <input value={nickname} maxLength={18} onChange={(e) => setNickname(e.target.value)} />
          </label>
          <button
            className="rush-primary rush-submit"
            disabled={busy || joinCode.length !== 5 || !nickname.trim()}
            onClick={() => void joinOnlineRoom()}
          >
            <Globe2 size={18} /> {t.join}
          </button>
        </section>
      )}

      {screen === "lobby" && online && (
        <section className="rush-room">
          <div className="rush-room-top">
            <button
              className="rush-code-badge"
              onClick={async () => {
                await navigator.clipboard?.writeText(online.room.code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1100);
              }}
            >
              <Copy size={14} />
              <b>{online.room.code}</b>
              <small>{copied ? t.copied : t.copy}</small>
            </button>
            <span className="rush-live"><i /> {t.live}</span>
            <button className="rush-leave" onClick={onBack}>{t.leave}</button>
          </div>

          <div className="rush-stage">
            <p className="rush-kicker">{t.waitingPlayers}</p>
            <h1>{online.room.code}</h1>
            <div className="rush-roster">
              {online.players.map((p) => (
                <div key={p.id}>
                  <span>{p.nickname.slice(0, 1)}</span>
                  <b>{p.nickname}</b>
                  <i />
                </div>
              ))}
            </div>
            {online.self.isHost ? (
              <button
                className="rush-primary"
                disabled={busy || online.players.length < 2}
                onClick={() => void sendOnlineAction("start")}
              >
                <Play size={18} /> {t.start}
              </button>
            ) : (
              <p className="rush-wait"><Clock3 size={15} /> {t.waitingPlayers}…</p>
            )}
            {online.players.length < 2 && <small className="rush-warn">{t.needTwo}</small>}
          </div>
        </section>
      )}

      {screen === "game" && (
        <section className="rush-room">
          {local && (
            <>
              <div className="rush-hud">
                <div>
                  <small>{t.title}</small>
                  <b>{language === "ar" ? `الجولة ${local.round} / ${local.settings.rounds}` : `Round ${local.round} / ${local.settings.rounds}`}</b>
                </div>
                {local.phase === "challenge" && (
                  <div className={`rush-countdown ${remainingSeconds <= 5 ? "urgent" : ""} ${remainingSeconds <= 2 ? "critical" : ""}`}>
                    <Timer size={15} />
                    <b>{remainingSeconds > 0 ? remainingSeconds : t.timeAlert}</b>
                  </div>
                )}
              </div>

              {local.phase === "handoff" && currentLocalPlayer && (
                <div className="rush-stage">
                  <div className="rush-avatar-lg">{currentLocalPlayer.nickname.slice(0, 1)}</div>
                  <p className="rush-kicker">{t.local}</p>
                  <h1>{t.passPhone} {currentLocalPlayer.nickname}</h1>
                  <p>{t.privateHint}</p>
                  <button className="rush-primary" onClick={beginLocalIntro}>
                    <Play size={18} /> {t.ready}
                  </button>
                </div>
              )}

              {local.phase === "intro" && local.challenge && (
                <div className="rush-stage rush-intro-stage">
                  {local.challenge.special !== "none" && (
                    <div className="rush-special-banner">
                      <b>{specialRoundMeta(local.challenge.special, language).title}</b>
                      <small>{specialRoundMeta(local.challenge.special, language).desc}</small>
                    </div>
                  )}
                  <p className="rush-kicker">{t.getReady}</p>
                  <div className="rush-big-count">{local.introCount}</div>
                  <h2>{local.challenge.title}</h2>
                </div>
              )}

              {local.phase === "challenge" && local.challenge && (
                <ChallengeArena
                  challenge={local.challenge}
                  language={language}
                  t={t}
                  progressRatio={progressRatio}
                  remainingSeconds={remainingSeconds}
                  reactionReady={reactionReady}
                  memoryHidden={memoryHidden}
                  sequencePicked={sequencePicked}
                  chainStepIndex={chainAnswers.length}
                  onPick={(optionId) => handleOptionPress(local.challenge!, optionId)}
                />
              )}

              {local.phase === "result" && local.result && (
                <TurnResultCard
                  t={t}
                  player={local.players.find((p) => p.id === local.result?.playerId) ?? local.players[0]}
                  result={local.result}
                  onNext={advanceLocalTurn}
                />
              )}

              {local.phase === "finished" && (
                <FinalSummary
                  t={t}
                  language={language}
                  players={local.players}
                  stats={local.stats}
                  onRestart={startLocalGame}
                  onBack={onBack}
                />
              )}
            </>
          )}

          {online?.game && (
            <>
              <div className="rush-hud">
                <div>
                  <small>{online.room.code}</small>
                  <b>{language === "ar" ? `الجولة ${online.game.roundNumber} / ${online.game.totalRounds}` : `Round ${online.game.roundNumber} / ${online.game.totalRounds}`}</b>
                </div>
                {online.game.status === "challenge" && (
                  <div className={`rush-countdown ${remainingSeconds <= 5 ? "urgent" : ""} ${remainingSeconds <= 2 ? "critical" : ""}`}>
                    <Timer size={15} />
                    <b>{remainingSeconds > 0 ? remainingSeconds : t.timeAlert}</b>
                  </div>
                )}
              </div>

              {online.game.status === "challenge" && (
                online.game.currentPlayerId === online.self.id && privateChallenge ? (
                  <ChallengeArena
                    challenge={privateChallenge}
                    language={language}
                    t={t}
                    progressRatio={progressRatio}
                    remainingSeconds={remainingSeconds}
                    reactionReady={reactionReady}
                    memoryHidden={memoryHidden}
                    sequencePicked={sequencePicked}
                    chainStepIndex={chainAnswers.length}
                    onPick={(optionId) => handleOptionPress(privateChallenge, optionId)}
                  />
                ) : (
                  <div className="rush-stage">
                    <p className="rush-kicker">{online.game.challengeTitle}</p>
                    <h1>
                      {t.waitingTurn}{" "}
                      {online.players.find((p) => p.id === online.game?.currentPlayerId)?.nickname ?? "…"}
                    </h1>
                    {online.game.special !== "none" && (
                      <div className="rush-special-banner">
                        <b>{specialRoundMeta(online.game.special, language).title}</b>
                      </div>
                    )}
                  </div>
                )
              )}

              {online.game.status === "result" && online.game.result && (
                <TurnResultCard
                  t={t}
                  player={online.players.find((p) => p.id === online.game?.result?.playerId) ?? online.self}
                  result={online.game.result}
                  onNext={
                    online.self.isHost || online.game.currentPlayerId === online.self.id
                      ? () => void sendOnlineAction("next")
                      : undefined
                  }
                />
              )}

              {online.game.status === "finished" && (
                <FinalSummary
                  t={t}
                  language={language}
                  players={online.players}
                  stats={online.game.stats}
                  onRestart={() => void sendOnlineAction("start")}
                  onBack={onBack}
                />
              )}
            </>
          )}
        </section>
      )}

      {paused && (
        <div className="rush-pause-modal">
          <div>
            <Pause size={30} />
            <h2>{t.paused}</h2>
            <button className="rush-primary" onClick={() => setPaused(false)}>
              <Play size={17} /> {t.resume}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function ChallengeArena({
  challenge,
  language,
  t,
  progressRatio,
  remainingSeconds,
  reactionReady,
  memoryHidden,
  sequencePicked,
  chainStepIndex,
  onPick,
}: {
  challenge: RushChallengePublic;
  language: RushLanguage;
  t: (typeof copy)[RushLanguage];
  progressRatio: number;
  remainingSeconds: number;
  reactionReady: boolean;
  memoryHidden: boolean;
  sequencePicked: string[];
  chainStepIndex: number;
  onPick: (optionId: string) => void;
}) {
  const activeStep = challenge.type === "speedChain" && challenge.chainSteps
    ? challenge.chainSteps[Math.min(chainStepIndex, challenge.chainSteps.length - 1)]
    : null;
  const displayedOptions = activeStep ? activeStep.options : challenge.options;

  return (
    <div className={`rush-stage rush-arena ${remainingSeconds <= 3 ? "pulse-alert" : ""}`}>
      <div className="rush-progress-bar">
        <i style={{ transform: `scaleX(${progressRatio})` }} />
      </div>

      {challenge.special !== "none" && (
        <span className="rush-special-chip">{specialRoundMeta(challenge.special, language).badge}</span>
      )}

      <p className="rush-kicker">{challenge.title}</p>
      <h1 className="rush-prompt">{activeStep ? activeStep.prompt : challenge.instruction}</h1>

      {challenge.type === "memory" && challenge.memorySymbols && (
        <div className="rush-memory-strip">
          {memoryHidden ? (
            <span className="rush-memory-masked">❓ ❓ ❓</span>
          ) : (
            challenge.memorySymbols.map((sym, i) => <b key={i}>{sym}</b>)
          )}
          {!memoryHidden && <small>{t.memorizeNow}</small>}
        </div>
      )}

      {challenge.type === "reaction" && !reactionReady ? (
        <button className="rush-reaction-wait" onClick={() => onPick("__early__")}>
          ⏳ {t.waitGreen}
        </button>
      ) : (
        <div className={`rush-options-grid count-${displayedOptions.length}`}>
          {displayedOptions.map((opt) => {
            const pickedIndex = sequencePicked.indexOf(opt.id);
            return (
              <button
                key={opt.id}
                className={`rush-option-btn ${pickedIndex >= 0 ? "picked" : ""} ${opt.forbidden ? "forbidden-hint" : ""} ${challenge.type === "reaction" && opt.id === "strike" ? "reaction-go" : ""}`}
                style={opt.color ? { background: opt.color, color: "#0b0f17" } : undefined}
                disabled={challenge.type === "memory" && !memoryHidden}
                onClick={() => onPick(opt.id)}
              >
                <span>{opt.label}</span>
                {opt.sub && <small>{opt.sub}</small>}
                {pickedIndex >= 0 && <em>#{pickedIndex + 1}</em>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TurnResultCard({
  t,
  player,
  result,
  onNext,
}: {
  t: (typeof copy)[RushLanguage];
  player: Player;
  result: { status: "correct" | "wrong" | "timeout"; pointsEarned: number; responseMs: number; challengeTitle: string };
  onNext?: () => void;
}) {
  const statusLabel = result.status === "correct" ? t.correct : result.status === "timeout" ? t.timeout : t.wrong;
  return (
    <div className="rush-stage rush-result-stage">
      <p className="rush-kicker">{t.challengeDone}</p>
      <h1>{player.nickname}</h1>
      <div className={`rush-result-badge ${result.status}`}>{statusLabel}</div>
      <div className="rush-metrics">
        <div><small>{t.speed}</small><b>{(result.responseMs / 1000).toFixed(2)}s</b></div>
        <div><small>{t.points}</small><b>+{result.pointsEarned}</b></div>
        <div><small>{t.total}</small><b>{player.score}</b></div>
      </div>
      {onNext && (
        <button className="rush-primary" onClick={onNext}>
          <ChevronLeft size={17} /> {t.nextNow}
        </button>
      )}
    </div>
  );
}

function FinalSummary({
  t,
  language,
  players,
  stats,
  onRestart,
  onBack,
}: {
  t: (typeof copy)[RushLanguage];
  language: RushLanguage;
  players: Player[];
  stats: Record<string, Stat>;
  onRestart: () => void;
  onBack: () => void;
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const fastestPlayer = [...players]
    .filter((p) => stats[p.id]?.fastestMs !== null && stats[p.id]?.fastestMs !== undefined)
    .sort((a, b) => (stats[a.id].fastestMs ?? 99999) - (stats[b.id].fastestMs ?? 99999))[0];
  const mostCorrectPlayer = [...players].sort((a, b) => (stats[b.id]?.correct ?? 0) - (stats[a.id]?.correct ?? 0))[0];
  const bestStreakPlayer = [...players].sort((a, b) => (stats[b.id]?.bestStreak ?? 0) - (stats[a.id]?.bestStreak ?? 0))[0];

  return (
    <div className="rush-stage">
      <Trophy size={36} className="rush-gold-icon" />
      <h1>{t.gameOver}</h1>
      <div className="rush-podium">
        {sorted.map((p, idx) => (
          <div key={p.id} className="rush-rank-row">
            <span>{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}</span>
            <b>{p.nickname}</b>
            <em>{p.score} {language === "ar" ? "نقطة" : "pts"}</em>
          </div>
        ))}
      </div>

      <div className="rush-awards-grid">
        <div>
          <small>{t.fastest}</small>
          <b>{fastestPlayer ? `${fastestPlayer.nickname} (${((stats[fastestPlayer.id]?.fastestMs ?? 0) / 1000).toFixed(2)}s)` : "—"}</b>
        </div>
        <div>
          <small>{t.mostCorrect}</small>
          <b>{mostCorrectPlayer ? `${mostCorrectPlayer.nickname} (${stats[mostCorrectPlayer.id]?.correct ?? 0})` : "—"}</b>
        </div>
        <div>
          <small>{t.bestStreak}</small>
          <b>{bestStreakPlayer ? `${bestStreakPlayer.nickname} (×${stats[bestStreakPlayer.id]?.bestStreak ?? 0})` : "—"}</b>
        </div>
        <div>
          <small>{t.topScore}</small>
          <b>{sorted[0] ? `${sorted[0].nickname} (${sorted[0].score})` : "—"}</b>
        </div>
      </div>

      <div className="rush-actions">
        <button className="rush-primary" onClick={onRestart}>
          <RefreshCw size={17} /> {t.playAgain}
        </button>
        <button className="rush-link" onClick={onBack}>{t.back}</button>
      </div>
    </div>
  );
}
