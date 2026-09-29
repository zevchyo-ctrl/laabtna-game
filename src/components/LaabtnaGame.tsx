"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronLeft,
  ClipboardList,
  Copy,
  Eye,
  Fingerprint,
  Flag,
  Globe2,
  KeyRound,
  Languages,
  LockKeyhole,
  MessageCircleQuestion,
  Pause,
  Play,
  Plus,
  Radio,
  Search,
  ShieldAlert,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
  Vote,
  X,
} from "lucide-react";
import Link from "next/link";
import { wordBank } from "@/lib/categories";
import type { GameMode } from "@/lib/game";
import dynamic from "next/dynamic";
import QuizGame from "@/components/QuizGame";
import SceneGame from "@/components/SceneGame";
import RushGame from "@/components/RushGame";
import SoundControls from "@/components/SoundControls";
import { PremiumLockModal, UserProfileModal } from "@/components/UserAccountPortal";
import {
  clearUnfinishedSessionOnAccount,
  recordGameResultToAccount,
  saveUnfinishedSessionToAccount,
  type ClientAccessState,
  type ClientGameResult,
  type ClientUnfinishedSession,
  type ClientUser,
} from "@/lib/platform-client";
import { playEffect } from "@/lib/sounds";

const LazyAdminDashboardModal = dynamic(() => import("@/components/AdminDashboardModal"), { ssr: false });

type Lang = "ar" | "en";
type Screen = "home" | "mode" | "setup" | "join" | "room";
type Session = { id: string; nickname: string; token: string };
type Player = { id: string; nickname: string; isHost: boolean; isConnected: boolean; score: number };
type Snapshot = {
  room: { code: string; mode: GameMode; status: string; settings: Settings; roundNumber: number };
  self: { id: string; nickname: string; isHost: boolean; score: number };
  players: Player[];
  round?: {
    number: number;
    phase: Phase;
    questionRound: number;
    totalQuestionRounds: number;
    turnIndex: number;
    activePairing: { askerId: string; targetId: string } | null;
    voteCount: number;
    playerCount: number;
    votedPlayerIds: string[];
    activeQuestionText: string | null;
    hasVoted: boolean;
    yourVote: string | null;
    revealData: RevealData | null;
  };
};
type Settings = { categories: string[]; questionRounds: number; timerSeconds: number; allowExtraRound: boolean; impostorCount: number; writtenQuestions: boolean };
type Phase = "opening" | "secret" | "questions" | "questionsComplete" | "discussion" | "voting" | "reveal" | "result";
type PrivateInfo = { role: "agent" | "impostor"; secretWord: string | null };
type RevealData = { tally: Record<string, number>; leaders: string[]; caught: boolean; points: Record<string, number>; voteCount: number; impostorIds: string[]; secretWord: string; category: string };

const dictionary = {
  ar: {
    start: "ابدأ التحقيق", home: "الرئيسية", local: "لعب على نفس الهاتف", online: "لعب أونلاين", join: "الانضمام لغرفة",
    create: "إنشاء غرفة", nickname: "اسمك المستعار", roomCode: "رمز الغرفة", caseFile: "ملف القضية", secretGame: "الكلمة السرية",
    tagline: "لعبتنا جمعتنا", hero: "اكشف المتخفي قبل أن يختفي الدليل.", noAccounts: "لا حسابات، لا انتظار. اسم مؤقت وفريق جاهز للتحقيق.",
    continue: "متابعة", startCase: "فتح القضية", settings: "إعدادات القضية", players: "المحققون", categories: "التصنيفات", selectAll: "تحديد الكل", clear: "إلغاء الكل", random: "اختيار عشوائي",
    questionRounds: "جولات الأسئلة", timer: "مؤقت الدور", extra: "السماح بجولة إضافية", impostors: "عدد المتخفين", written: "أسئلة مكتوبة أونلاين", lobby: "ردهة التحقيق", waiting: "بانتظار المحققين",
    copy: "نسخ", copied: "تم النسخ", startRound: "ابدأ الجولة", needThree: "يلزم 3 لاعبين على الأقل", live: "مزامنة مباشرة", passPhone: "مرر الهاتف إلى", revealFile: "افتح ملفك السري", hideFile: "أخفِ الملف ومرر الهاتف", youAre: "أنت", impostor: "المتخفي", agent: "محقق يعرف الكلمة",
    secretWord: "الكلمة السرية", doNotShow: "لا تُرِ هذا الملف لأي شخص.", nextPhase: "بدء جولات الأسئلة", questionDone: "تم الدور التالي", discuss: "بدء النقاش", startVoting: "بدء التصويت", extraRound: "جولة أسئلة إضافية", goVote: "الانتقال إلى النقاش",
    ask: "يسأل", answer: "يجيب", verbalHint: "اسأل بصوتك سؤالًا ذكيًا عن الكلمة، ثم استمع للإجابة دون ذكرها مباشرة.", typeQuestion: "اكتب سؤالك للمشتبه…", send: "إرسال السؤال", waitTurn: "راقب الأدلة — الدور عند", discussion: "وقت النقاش", discussionHint: "ناقشوا الإجابات: من بدا واثقًا أكثر من اللازم؟ ومن حاول التخمين؟",
    voting: "التصويت", voteQuestion: "من تعتقد أنه المتخفي؟", yourTurnVote: "صوّت بسرية ثم مرر الهاتف", waitingVotes: "ننتظر أصوات المحققين", revealTruth: "اكشف الحقيقة", truth: "كشف الحقيقة", caseSolved: "تم حل القضية!", caseLost: "هرب المتخفي!", resultHint: "الكلمة كانت", nextRound: "جولة جديدة", finish: "عرض النتيجة", score: "النقاط", votes: "الأصوات", suspect: "مشتبه به", host: "مدير الغرفة", kick: "إزالة", pause: "إيقاف", resume: "متابعة القضية",
    scoreRules: "+100 لتصويت صحيح، +30 للفريق عند كشف المتخفي، +180 للمتخفي إن نجا.", localArchive: "سجل قضايا هذا الجهاز", resumeCase: "استئناف القضية", leave: "خروج", onlineQuestionOnly: "يظهر السؤال لصاحبه وللمجيب فقط.", revealRoles: "المتخفيون كانوا", votesTally: "خريطة الأصوات",
  },
  en: {
    start: "Start investigation", home: "Home", local: "Same phone", online: "Play online", join: "Join a room",
    create: "Create room", nickname: "Your nickname", roomCode: "Room code", caseFile: "Case file", secretGame: "The Secret Word",
    tagline: "Our game brings us together", hero: "Expose the hidden suspect before the evidence disappears.", noAccounts: "No accounts, no waiting. Pick a temporary name and investigate.",
    continue: "Continue", startCase: "Open case", settings: "Case settings", players: "Investigators", categories: "Categories", selectAll: "Select all", clear: "Clear all", random: "Random pick",
    questionRounds: "Question rounds", timer: "Turn timer", extra: "Allow extra round", impostors: "Hidden players", written: "Written online questions", lobby: "Investigation lobby", waiting: "Waiting for investigators",
    copy: "Copy", copied: "Copied", startRound: "Start round", needThree: "At least 3 players needed", live: "Live sync", passPhone: "Pass the phone to", revealFile: "Open your confidential file", hideFile: "Hide file & pass it on", youAre: "You are", impostor: "the hidden suspect", agent: "an agent who knows the word",
    secretWord: "Secret word", doNotShow: "Do not show this file to anyone.", nextPhase: "Start question rounds", questionDone: "Next turn", discuss: "Start discussion", startVoting: "Start voting", extraRound: "Extra question round", goVote: "Move to discussion",
    ask: "asks", answer: "answers", verbalHint: "Ask a clever spoken question about the word, then listen carefully without naming it.", typeQuestion: "Type your question to the suspect…", send: "Send question", waitTurn: "Observe the clues — it is", discussion: "Discussion time", discussionHint: "Compare answers: who sounded too certain, and who was guessing?",
    voting: "Voting", voteQuestion: "Who do you think is hidden?", yourTurnVote: "Vote privately, then pass the phone", waitingVotes: "Waiting for investigators' votes", revealTruth: "Reveal the truth", truth: "Truth reveal", caseSolved: "Case solved!", caseLost: "The suspect escaped!", resultHint: "The word was", nextRound: "New round", finish: "Show result", score: "Points", votes: "Votes", suspect: "Suspect", host: "Room host", kick: "Remove", pause: "Pause", resume: "Resume case",
    scoreRules: "+100 for a correct vote, +30 to agents if caught, +180 to the hidden player if they escape.", localArchive: "This device's case archive", resumeCase: "Resume case", leave: "Leave", onlineQuestionOnly: "Only asker and answerer see the written question.", revealRoles: "Hidden players were", votesTally: "Vote map",
  },
} as const;

const phaseSteps: { phase: Phase; ar: string; en: string; icon: typeof ClipboardList }[] = [
  { phase: "opening", ar: "فتح القضية", en: "Open case", icon: ClipboardList },
  { phase: "secret", ar: "الكلمة السرية", en: "Secret word", icon: LockKeyhole },
  { phase: "questions", ar: "جولات الأسئلة", en: "Question rounds", icon: MessageCircleQuestion },
  { phase: "discussion", ar: "النقاش", en: "Discussion", icon: Search },
  { phase: "voting", ar: "التصويت", en: "Voting", icon: Vote },
  { phase: "reveal", ar: "كشف الحقيقة", en: "Reveal", icon: Eye },
  { phase: "result", ar: "النتيجة", en: "Result", icon: Trophy },
];

const defaultSettings: Settings = { categories: wordBank.map((item) => item.id), questionRounds: 2, timerSeconds: 45, allowExtraRound: true, impostorCount: 1, writtenQuestions: true };
const LOCAL_SAME_PHONE: GameMode = "local";
const ONLINE_MULTIPLAYER: GameMode = "online";

type Pairing = { askerId: string; targetId: string };
type LocalRoundMeta = {
  secretWord: string;
  category: string;
  impostorIds: string[];
  pairings: Pairing[][];
  votes: Record<string, string>;
};

function localId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }
  return copy;
}

function localSettings(input: Settings, playerCount: number): Settings {
  const categories = input.categories.filter((id) => wordBank.some((category) => category.id === id));
  return {
    ...input,
    categories: categories.length ? categories : defaultSettings.categories,
    questionRounds: Math.max(1, Math.min(5, Math.round(input.questionRounds))),
    timerSeconds: Math.max(0, Math.min(120, Math.round(input.timerSeconds))),
    impostorCount: Math.max(1, Math.min(Math.max(1, Math.floor(playerCount / 3)), Math.round(input.impostorCount))),
    writtenQuestions: false,
  };
}

function localPairings(playerIds: string[], rounds: number, startShift = 1) {
  const order = shuffled(playerIds);
  return Array.from({ length: rounds }, (_, roundIndex) => {
    const shift = ((startShift + roundIndex - 1) % (order.length - 1)) + 1;
    return order.map((askerId, index) => ({ askerId, targetId: order[(index + shift) % order.length] }));
  });
}

function createLocalRound(players: Player[], settings: Settings): LocalRoundMeta {
  const choices = wordBank.filter((category) => settings.categories.includes(category.id));
  const category = choices[Math.floor(Math.random() * choices.length)];
  const impostorIds = shuffled(players.map((player) => player.id)).slice(0, settings.impostorCount);
  return {
    secretWord: category.words[Math.floor(Math.random() * category.words.length)],
    category: category.id,
    impostorIds,
    pairings: localPairings(players.map((player) => player.id), settings.questionRounds),
    votes: {},
  };
}

function localRoundView(meta: LocalRoundMeta, number: number, phase: Phase = "opening", questionRound = 1, turnIndex = 0, revealData: RevealData | null = null): NonNullable<Snapshot["round"]> {
  return {
    number,
    phase,
    questionRound,
    totalQuestionRounds: meta.pairings.length,
    turnIndex,
    activePairing: meta.pairings[questionRound - 1]?.[turnIndex] ?? null,
    voteCount: Object.keys(meta.votes).length,
    playerCount: 0,
    votedPlayerIds: Object.keys(meta.votes),
    activeQuestionText: null,
    hasVoted: false,
    yourVote: null,
    revealData,
  };
}

function requestHeaders(token?: string) {
  return { "content-type": "application/json", ...(token ? { "x-laabtna-token": token } : {}) };
}

async function api<T>(url: string, options: RequestInit, token?: string): Promise<T> {
  const response = await fetch(url, { ...options, headers: { ...requestHeaders(token), ...(options.headers ?? {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "حدث خطأ غير متوقع");
  return data as T;
}

function playerName(players: Player[], id?: string | null) {
  return players.find((player) => player.id === id)?.nickname ?? "—";
}

export default function LaabtnaGame() {
  const [lang, setLang] = useState<Lang>("ar");
  const [activeGame, setActiveGame] = useState<"secret" | "quiz" | "scene" | "rush">("secret");
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<GameMode>("local");
  const [names, setNames] = useState(["أحمد", "محمد", "سارة", "خالد"]);
  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [hostToken, setHostToken] = useState("");
  const [localSessions, setLocalSessions] = useState<Session[]>([]);
  const [viewerId, setViewerId] = useState("");
  const [privateInfo, setPrivateInfo] = useState<PrivateInfo | null>(null);
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const [archive, setArchive] = useState<Array<{ code: string; winners: string; at: string }>>([]);
  const [accountUser, setAccountUser] = useState<ClientUser | null>(null);
  const [accountResults, setAccountResults] = useState<ClientGameResult[]>([]);
  const [unfinishedGames, setUnfinishedGames] = useState<ClientUnfinishedSession[]>([]);
  const [accessState, setAccessState] = useState<ClientAccessState>({
    globalMode: "EVERYTHING_FREE",
    telegramUrl: "",
    games: {},
    categories: {},
    features: {},
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<"login" | "register" | "profile" | "history" | "continue">("profile");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showPremiumLock, setShowPremiumLock] = useState(false);
  const logoClicksRef = useRef<number[]>([]);
  const logoClickTimerRef = useRef<number | null>(null);
  const recordedRoundResultRef = useRef("");
  const localRoundRef = useRef<LocalRoundMeta | null>(null);
  const lastSecretWarning = useRef<number | null>(null);
  const previousRound = useRef(0);
  const t = dictionary[lang];
  const isArabic = lang === "ar";
  const refreshAccountAndAccess = useCallback(async () => {
    try {
      const res = await fetch("/api/auth", { method: "GET" });
      if (!res.ok) return;
      const data = await res.json();
      setAccountUser(data.user ?? null);
      setAccountResults(data.results ?? []);
      setUnfinishedGames(data.unfinishedGames ?? []);
      if (data.access) setAccessState(data.access);
    } catch {
      /* Non-blocking */
    }
  }, []);

  useEffect(() => {
    void refreshAccountAndAccess();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const reqGame = params.get("game");
      if (reqGame === "quiz" || reqGame === "scene" || reqGame === "rush") {
        setActiveGame(reqGame);
      } else if (reqGame === "secret") {
        setActiveGame("secret");
        setScreen("mode");
      }
    }
    const onUpdated = () => void refreshAccountAndAccess();
    const onLock = () => setShowPremiumLock(true);
    window.addEventListener("laabtna:account-updated", onUpdated);
    window.addEventListener("laabtna:open-premium-lock", onLock);
    return () => {
      window.removeEventListener("laabtna:account-updated", onUpdated);
      window.removeEventListener("laabtna:open-premium-lock", onLock);
    };
  }, [refreshAccountAndAccess]);

  const isUnlockedForUser = useCallback(
    (params: { gameKey?: string; categoryKey?: string; featureKey?: string }) => {
      if (accessState.globalMode === "EVERYTHING_FREE") return true;
      if (accountUser?.isPremium) return true;
      if (accessState.globalMode === "PREMIUM") return false;
      if (params.gameKey && accessState.games[params.gameKey] === "PREMIUM") return false;
      if (params.categoryKey && accessState.categories[params.categoryKey] === "PREMIUM") return false;
      if (params.featureKey && accessState.features[params.featureKey] === "PREMIUM") return false;
      return true;
    },
    [accessState, accountUser?.isPremium],
  );

  const handleLogoClick = (e?: React.SyntheticEvent) => {
    const now = Date.now();
    const history = logoClicksRef.current.filter((ts) => now - ts < 1600);

    if (history.length > 0 && now - history[history.length - 1] < 70) {
      return;
    }

    history.push(now);
    logoClicksRef.current = history;

    if (logoClickTimerRef.current) {
      window.clearTimeout(logoClickTimerRef.current);
      logoClickTimerRef.current = null;
    }

    if (history.length >= 3) {
      logoClicksRef.current = [];
      setShowAdminModal(true);
      playEffect("special");
      return;
    }

    logoClickTimerRef.current = window.setTimeout(() => {
      if (logoClicksRef.current.length < 3) {
        returnHome();
      }
      logoClicksRef.current = [];
    }, 380);
  };

  useEffect(() => {
    const onClick = (event: MouseEvent) => { if ((event.target as HTMLElement | null)?.closest("button")) playEffect("click"); };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  const activeToken = useMemo(() => localSessions.find((session) => session.id === viewerId)?.token ?? hostToken, [hostToken, localSessions, viewerId]);
  const activeViewer = useMemo(() => localSessions.find((session) => session.id === viewerId), [localSessions, viewerId]);

  const sync = useCallback(async () => {
    if (snapshot?.room.mode === LOCAL_SAME_PHONE || !roomCode || !hostToken) return;
    try {
      const data = await api<Snapshot>(`/api/rooms/${roomCode}`, { method: "GET" }, hostToken);
      setSnapshot(data);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر الاتصال بالغرفة");
    }
  }, [hostToken, roomCode, snapshot?.room.mode]);

  useEffect(() => {
    const saved = window.localStorage.getItem("laabtna:last-session");
    const savedArchive = window.localStorage.getItem("laabtna:archive");
    if (savedArchive) setArchive(JSON.parse(savedArchive));
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { code: string; token: string; sessions?: Session[] };
        // Older releases persisted same-phone games as server rooms. Those entries must never be resumed as online sessions.
        if (parsed.sessions?.length) {
          window.localStorage.removeItem("laabtna:last-session");
        } else if (parsed.code && parsed.token) {
          setRoomCode(parsed.code); setHostToken(parsed.token); setLocalSessions([]); setViewerId("");
        }
      } catch { /* a stale browser entry should not interrupt play */ }
    }
  }, []);

  useEffect(() => {
    if (screen !== "room") return;
    void sync();
    const timer = window.setInterval(() => void sync(), 1600);
    return () => window.clearInterval(timer);
  }, [screen, sync]);

  useEffect(() => {
    const key = snapshot?.round ? `${snapshot.round.number}-${snapshot.round.questionRound}-${snapshot.round.turnIndex}-${snapshot.round.phase}` : "";
    if (!key || !snapshot?.room.settings.timerSeconds || snapshot.round?.phase !== "questions") { setSeconds(0); return; }
    setSeconds(snapshot.room.settings.timerSeconds);
    lastSecretWarning.current = null;
    const interval = window.setInterval(() => setSeconds((current) => {
      const next = Math.max(0, current - 1);
      if (next <= 10 && next > 0 && lastSecretWarning.current !== next) { lastSecretWarning.current = next; playEffect("warning"); }
      if (!next && current > 0) playEffect("timeout");
      return next;
    }), 1000);
    return () => window.clearInterval(interval);
  }, [snapshot?.room.settings.timerSeconds, snapshot?.round?.number, snapshot?.round?.phase, snapshot?.round?.questionRound, snapshot?.round?.turnIndex]);

  useEffect(() => {
    if (!snapshot?.round || snapshot.round.number === previousRound.current) return;
    previousRound.current = snapshot.round.number;
    setPrivateInfo(null); setRevealedIds([]); setQuestionText(""); setViewerId(localSessions[0]?.id ?? "");
  }, [localSessions, snapshot?.round]);

  useEffect(() => {
    if (!snapshot?.round) return;
    if (
      snapshot.room.mode === LOCAL_SAME_PHONE &&
      snapshot.round.phase !== "result" &&
      localRoundRef.current
    ) {
      void saveUnfinishedSessionToAccount({
        gameKey: "secret",
        gameName: "🎭 الكلمة السرية",
        mode: "local",
        roundNumber: snapshot.round.number,
        totalRounds: snapshot.room.settings.questionRounds,
        score: Math.max(0, ...snapshot.players.map((p) => p.score)),
        statePayload: {
          snapshot,
          localSessions,
          viewerId,
          revealedIds,
          meta: localRoundRef.current,
        },
      });
    }
    if (!snapshot.round.revealData || snapshot.round.phase !== "result") return;
    const winners = snapshot.players.filter((player) => (snapshot.round?.revealData?.points[player.id] ?? 0) > 0).map((player) => player.nickname).join("، ") || "—";
    const entry = { code: snapshot.room.code, winners, at: new Date().toLocaleDateString(isArabic ? "ar" : "en") };
    const resultSig = `${snapshot.room.code || "local"}_${snapshot.round.number}_${winners}`;
    if (recordedRoundResultRef.current !== resultSig) {
      recordedRoundResultRef.current = resultSig;
      const topScore = Math.max(0, ...snapshot.players.map((p) => p.score));
      void recordGameResultToAccount({
        gameKey: "secret",
        gameName: "🎭 الكلمة السرية",
        mode: snapshot.room.mode,
        score: topScore,
        rounds: snapshot.round.totalQuestionRounds,
        rankLabel: snapshot.round.revealData.caught ? "تم كشف المتخفي" : "نجا المتخفي",
        stats: {
          secretWord: snapshot.round.revealData.secretWord,
          winners,
          players: snapshot.players.map((p) => ({ name: p.nickname, score: p.score })),
        },
      });
    }
    setArchive((current) => {
      if (current[0]?.code === entry.code && current[0]?.winners === entry.winners) return current;
      const next = [entry, ...current].slice(0, 5);
      window.localStorage.setItem("laabtna:archive", JSON.stringify(next));
      return next;
    });
  }, [isArabic, localSessions, revealedIds, snapshot, viewerId]);

  const saveSession = (code: string, token: string, sessions: Session[] = []) => {
    window.localStorage.setItem("laabtna:last-session", JSON.stringify({ code, token, sessions }));
  };

  const startLocalInvestigation = () => {
    const cleanNames = names.map((name) => name.trim().replace(/\s+/g, " ")).filter(Boolean);
    if (cleanNames.length < 3 || cleanNames.length > 10) {
      setNotice(isArabic ? "أدخل من 3 إلى 10 أسماء لبدء التحقيق" : "Enter 3–10 names to begin the investigation");
      return;
    }
    const players: Player[] = cleanNames.map((playerName, index) => ({
      id: localId("local_player"),
      nickname: playerName,
      isHost: index === 0,
      isConnected: true,
      score: 0,
    }));
    const sessions = players.map((player) => ({ id: player.id, nickname: player.nickname, token: localId("local_session") }));
    const configured = localSettings(settings, players.length);
    const meta = createLocalRound(players, configured);
    localRoundRef.current = meta;
    const round = { ...localRoundView(meta, 1), playerCount: players.length };
    setRoomCode("");
    setHostToken("");
    setLocalSessions(sessions);
    setViewerId(players[0].id);
    setPrivateInfo(null);
    setRevealedIds([]);
    playEffect("start");
    setSnapshot({
      room: { code: "", mode: LOCAL_SAME_PHONE, status: "playing", settings: configured, roundNumber: 1 },
      self: { id: players[0].id, nickname: players[0].nickname, isHost: true, score: 0 },
      players,
      round,
    });
    setScreen("room");
  };

  const createRoom = async () => {
    setNotice("");
    if (!isUnlockedForUser({ gameKey: "secret" })) {
      setShowPremiumLock(true);
      return;
    }
    if (settings.categories.some((catId) => !isUnlockedForUser({ categoryKey: `secret:${catId}` }))) {
      setShowPremiumLock(true);
      return;
    }
    if (settings.allowExtraRound && !isUnlockedForUser({ featureKey: "secret_extra_round" })) {
      setShowPremiumLock(true);
      return;
    }
    if (mode === LOCAL_SAME_PHONE) {
      startLocalInvestigation();
      return;
    }
    setBusy(true);
    try {
      const data = await api<{ code: string; token: string; playerId: string }>("/api/rooms", { method: "POST", body: JSON.stringify({ action: "create", mode: ONLINE_MULTIPLAYER, nickname, settings }) });
      setRoomCode(data.code); setHostToken(data.token); setLocalSessions([]); setViewerId(data.playerId); saveSession(data.code, data.token); setScreen("room");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "تعذر إنشاء الغرفة";
      if (msg.includes("الميزات المتقدمة")) setShowPremiumLock(true);
      else setNotice(msg);
    }
    finally { setBusy(false); }
  };

  const joinRoom = async () => {
    setBusy(true); setNotice("");
    try {
      const data = await api<{ code: string; token: string; playerId: string }>("/api/rooms", { method: "POST", body: JSON.stringify({ action: "join", code: joinCode, nickname }) });
      setRoomCode(data.code); setHostToken(data.token); setLocalSessions([]); setViewerId(data.playerId); saveSession(data.code, data.token); setScreen("room");
    } catch (error) { setNotice(error instanceof Error ? error.message : "تعذر الانضمام"); }
    finally { setBusy(false); }
  };

  const runLocalAction = async (actionName: string, extra: Record<string, unknown> = {}, token?: string) => {
    const current = snapshot;
    const meta = localRoundRef.current;
    if (!current || current.room.mode !== LOCAL_SAME_PHONE || !meta || !current.round) return;
    const round = current.round;
    const makeRound = (nextPhase = round.phase, questionRound = round.questionRound, turnIndex = round.turnIndex, revealData = round.revealData) => ({
      ...localRoundView(meta, round.number, nextPhase, questionRound, turnIndex, revealData),
      playerCount: current.players.length,
    });

    if (actionName === "nextRound" || actionName === "start") {
      const nextMeta = createLocalRound(current.players, current.room.settings);
      localRoundRef.current = nextMeta;
      setSnapshot({
        ...current,
        room: { ...current.room, roundNumber: current.room.roundNumber + 1, status: "playing" },
        round: { ...localRoundView(nextMeta, current.room.roundNumber + 1), playerCount: current.players.length },
      });
      setPrivateInfo(null); setRevealedIds([]); setViewerId(localSessions[0]?.id ?? current.self.id);
      return;
    }

    if (actionName === "advance") {
      const next: Partial<Record<Phase, Phase>> = {
        opening: "secret", secret: "questions", questionsComplete: "discussion", discussion: "voting", reveal: "result",
      };
      if (next[round.phase]) setSnapshot({ ...current, round: makeRound(next[round.phase]) });
      return;
    }

    if (actionName === "advanceQuestion" && round.phase === "questions") {
      const activeRound = meta.pairings[round.questionRound - 1] ?? [];
      if (round.turnIndex + 1 >= activeRound.length) {
        if (round.questionRound >= meta.pairings.length) setSnapshot({ ...current, round: makeRound("questionsComplete") });
        else setSnapshot({ ...current, round: makeRound("questions", round.questionRound + 1, 0) });
      } else {
        setSnapshot({ ...current, round: makeRound("questions", round.questionRound, round.turnIndex + 1) });
      }
      return;
    }

    if (actionName === "extraRound" && round.phase === "questionsComplete" && current.room.settings.allowExtraRound) {
      meta.pairings.push(localPairings(current.players.map((player) => player.id), 1, meta.pairings.length + 1)[0]);
      setSnapshot({ ...current, round: makeRound("questions", meta.pairings.length, 0) });
      return;
    }

    if (actionName === "vote" && round.phase === "voting") {
      const voterId = localSessions.find((session) => session.token === token)?.id;
      const targetId = typeof extra.targetId === "string" ? extra.targetId : "";
      if (!voterId || voterId === targetId || !current.players.some((player) => player.id === targetId)) return;
      meta.votes[voterId] = targetId;
      setSnapshot({ ...current, round: makeRound() });
      return;
    }

    if (actionName === "reveal" && round.phase === "voting") {
      const voteRows = Object.entries(meta.votes).map(([voterId, targetId]) => ({ voterId, targetId }));
      if (voteRows.length < current.players.length) return;
      const tally: Record<string, number> = Object.fromEntries(current.players.map((player) => [player.id, 0]));
      voteRows.forEach(({ targetId }) => { tally[targetId] += 1; });
      const highest = Math.max(...Object.values(tally));
      const leaders = current.players.filter((player) => tally[player.id] === highest).map((player) => player.id);
      const caught = leaders.some((id) => meta.impostorIds.includes(id));
      const points: Record<string, number> = Object.fromEntries(current.players.map((player) => [player.id, 0]));
      current.players.forEach((player) => {
        const vote = meta.votes[player.id];
        if (!meta.impostorIds.includes(player.id) && meta.impostorIds.includes(vote)) points[player.id] += 100;
        if (!meta.impostorIds.includes(player.id) && caught) points[player.id] += 30;
        if (meta.impostorIds.includes(player.id) && !caught) points[player.id] += 180;
      });
      const players = current.players.map((player) => ({ ...player, score: player.score + points[player.id] }));
      const revealData: RevealData = { tally, leaders, caught, points, voteCount: voteRows.length, impostorIds: meta.impostorIds, secretWord: meta.secretWord, category: meta.category };
      setSnapshot({ ...current, players, self: { ...current.self, score: players.find((player) => player.id === current.self.id)?.score ?? 0 }, round: { ...makeRound("reveal", round.questionRound, round.turnIndex, revealData), playerCount: players.length } });
    }
  };

  const action = async (actionName: string, extra: Record<string, unknown> = {}, token = hostToken) => {
    const effect = actionName === "start" || actionName === "nextRound" ? "start" : actionName === "vote" ? "vote" : actionName === "reveal" ? "reveal" : actionName === "advanceQuestion" ? "select" : actionName === "extraRound" ? "start" : "click";
    if (snapshot?.room.mode === LOCAL_SAME_PHONE) {
      playEffect(effect);
      setBusy(true); setNotice("");
      try { await runLocalAction(actionName, extra, token); } finally { setBusy(false); }
      return;
    }
    if (!roomCode || !token) return;
    playEffect(effect);
    setBusy(true); setNotice("");
    try {
      await api(`/api/rooms/${roomCode}/action`, { method: "POST", body: JSON.stringify({ action: actionName, ...extra }) }, token);
      setQuestionText("");
      await sync();
    } catch (error) { setNotice(error instanceof Error ? error.message : "تعذر إكمال الخطوة"); }
    finally { setBusy(false); }
  };

  const openPrivateFile = async () => {
    playEffect("fileOpen");
    if (snapshot?.room.mode === LOCAL_SAME_PHONE) {
      const meta = localRoundRef.current;
      if (!meta || !viewerId) return;
      setPrivateInfo({
        role: meta.impostorIds.includes(viewerId) ? "impostor" : "agent",
        secretWord: meta.impostorIds.includes(viewerId) ? null : meta.secretWord,
      });
      setRevealedIds((ids) => Array.from(new Set([...ids, viewerId])));
      return;
    }
    if (!activeToken) return;
    setBusy(true); setNotice("");
    try {
      const data = await api<PrivateInfo>(`/api/rooms/${roomCode}/private`, { method: "GET" }, activeToken);
      setPrivateInfo(data);
      if (viewerId) setRevealedIds((ids) => Array.from(new Set([...ids, viewerId])));
    } catch (error) { setNotice(error instanceof Error ? error.message : "تعذر فتح الملف"); }
    finally { setBusy(false); }
  };

  const toggleCategory = (id: string) => {
    if (!isUnlockedForUser({ categoryKey: `secret:${id}` })) {
      setShowPremiumLock(true);
      return;
    }
    setSettings((current) => ({
      ...current,
      categories: current.categories.includes(id)
        ? current.categories.filter((item) => item !== id)
        : [...current.categories, id],
    }));
  };
  const phaseIndex = snapshot?.round ? phaseSteps.findIndex((step) => step.phase === snapshot.round?.phase || (snapshot.round?.phase === "questionsComplete" && step.phase === "questions")) : -1;
  const currentVoter = snapshot?.room.mode === "local" ? localSessions.find((session) => !snapshot.round?.votedPlayerIds.includes(session.id)) : undefined;

  const returnHome = () => { setPaused(false); setSnapshot(null); setRoomCode(""); setHostToken(""); setLocalSessions([]); setScreen("home"); };
  const leaveRoom = async () => {
    await action("leave");
    window.localStorage.removeItem("laabtna:last-session");
    returnHome();
  };

  const selectGameFromLibrary = (targetGame: "secret" | "quiz" | "scene" | "rush") => {
    if (!isUnlockedForUser({ gameKey: targetGame })) {
      setShowPremiumLock(true);
      return;
    }
    if (targetGame === "secret") {
      setScreen("mode");
    } else {
      setActiveGame(targetGame);
    }
  };

  const handleContinueSavedSession = (sess: ClientUnfinishedSession) => {
    if (!isUnlockedForUser({ featureKey: "cloud_continue_save" })) {
      setShowPremiumLock(true);
      return;
    }
    setShowProfileModal(false);
    if (sess.gameKey === "secret" && sess.statePayload?.snapshot) {
      const payload = sess.statePayload as {
        snapshot: Snapshot;
        localSessions: Session[];
        viewerId: string;
        revealedIds: string[];
        meta: LocalRoundMeta;
      };
      localRoundRef.current = payload.meta;
      setLocalSessions(payload.localSessions ?? []);
      setViewerId(payload.viewerId ?? "");
      setRevealedIds(payload.revealedIds ?? []);
      setSnapshot(payload.snapshot);
      setActiveGame("secret");
      setScreen("room");
      return;
    }
    if (sess.gameKey === "quiz" || sess.gameKey === "scene" || sess.gameKey === "rush") {
      window.sessionStorage.setItem(`laabtna:resume:${sess.gameKey}`, JSON.stringify(sess.statePayload));
      setActiveGame(sess.gameKey);
    }
  };

  const handleStartFreshFromContinue = (gameKey: string) => {
    void clearUnfinishedSessionOnAccount(gameKey as "secret" | "quiz" | "scene" | "rush");
    window.sessionStorage.removeItem(`laabtna:resume:${gameKey}`);
    setShowProfileModal(false);
    if (gameKey === "secret") {
      setActiveGame("secret");
      setScreen("mode");
    } else if (gameKey === "quiz" || gameKey === "scene" || gameKey === "rush") {
      setActiveGame(gameKey);
    }
  };

  if (activeGame === "quiz") {
    return <QuizGame language={lang} onBack={() => { setActiveGame("secret"); setScreen("home"); void refreshAccountAndAccess(); }} />;
  }
  if (activeGame === "scene") {
    return <SceneGame language={lang} onBack={() => { setActiveGame("secret"); setScreen("home"); void refreshAccountAndAccess(); }} />;
  }
  if (activeGame === "rush") {
    return <RushGame language={lang} onBack={() => { setActiveGame("secret"); setScreen("home"); void refreshAccountAndAccess(); }} />;
  }

  return (
    <main className="app-shell" dir={isArabic ? "rtl" : "ltr"}>
      <div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="fingerprint fp-one"><Fingerprint /></div><div className="fingerprint fp-two"><Fingerprint /></div>
      <header className="topbar">
        <button
          className="brand"
          onClick={handleLogoClick}
          aria-label={t.home}
          style={{ touchAction: "manipulation" }}
        >
          <span className="brand-mark"><Search /></span>
          <span><b>LAABTNA</b><small>لعبتنا</small></span>
        </button>
        <nav className="top-actions platform-main-nav" aria-label="Main Navigation">
          <button
            className="platform-nav-btn"
            onClick={() => {
              setActiveGame("secret");
              setScreen("home");
            }}
          >
            <span>🏠</span>
            <b>{isArabic ? "الرئيسية" : "Home"}</b>
          </button>
          <button
            className="platform-nav-btn"
            onClick={() => {
              setActiveGame("secret");
              setScreen("home");
              window.setTimeout(() => {
                document.getElementById("game-library")?.scrollIntoView({ behavior: "smooth" });
              }, 60);
            }}
          >
            <span>🎮</span>
            <b>{isArabic ? "الألعاب" : "Games"}</b>
          </button>

          {accountUser ? (
            <>
              <button
                className="platform-nav-btn"
                onClick={() => {
                  setProfileModalTab("history");
                  setShowProfileModal(true);
                }}
              >
                <span>📋</span>
                <b>{isArabic ? "سجل النتائج" : "History"}</b>
              </button>
              <button
                className={`platform-account-pill ${accountUser.isPremium ? "premium" : ""}`}
                onClick={() => {
                  setProfileModalTab("profile");
                  setShowProfileModal(true);
                }}
              >
                <UserRound size={15} />
                <span>{accountUser.displayName || (isArabic ? "حسابي" : "My Account")}</span>
                {accountUser.isPremium && <small>⭐</small>}
              </button>
            </>
          ) : (
            <button
              className="platform-nav-btn platform-auth-cta"
              onClick={() => {
                setProfileModalTab("login");
                setShowProfileModal(true);
              }}
            >
              <span>🔐</span>
              <b>{isArabic ? "تسجيل الدخول" : "Login"}</b>
            </button>
          )}

          <SoundControls language={lang} />
          {screen === "room" && <button className="icon-button" onClick={() => setPaused(true)} aria-label={t.pause}><Pause size={18} /></button>}
          <button className="language-button" onClick={() => setLang((current) => current === "ar" ? "en" : "ar")}><Languages size={16} /> {lang === "ar" ? "EN" : "ع"}</button>
        </nav>
      </header>

      {notice && <div className="toast" role="alert"><ShieldAlert size={18} />{notice}<button onClick={() => setNotice("")}><X size={16} /></button></div>}

      {screen === "home" && <section className="home-view">
        <div className="hero-copy">
          <p className="eyebrow"><Radio size={14} /> {t.live} · {t.tagline}</p>
          <h1><span>LAABTNA</span>{isArabic ? "لعبتنا" : "Our game"}</h1>
          <p className="hero-description">{t.hero}</p>
          <div className="hero-actions">
            <button className="primary-button big" onClick={() => setScreen("mode")}><Search size={20} />{t.start}<ArrowLeft size={18} /></button>
            {roomCode && hostToken && <button className="ghost-button" onClick={() => setScreen("room")}><Play size={17} />{t.resumeCase}</button>}
          </div>
          <p className="quiet-note"><BadgeCheck size={15} /> {t.noAccounts}</p>
        </div>
        <div className="hero-evidence" aria-hidden="true">
          <div className="case-tab">CASE 001</div><div className="pin pin-a" /><div className="pin pin-b" />
          <div className="evidence-photo"><UserRound size={68} /><span>?</span></div>
          <div className="red-thread thread-a" /><div className="red-thread thread-b" />
          <div className="paper-note"><Fingerprint size={29} /><b>{t.secretGame}</b><small>{isArabic ? "ملف سري" : "CONFIDENTIAL"}</small></div>
          <div className="magnifier"><Search /></div>
          <div className="evidence-stamp">TOP SECRET</div>
        </div>
        <section className="game-preview">
          <div className="preview-icon"><KeyRound /></div><div><p>{t.caseFile}</p><h2>{t.secretGame}</h2><span>{isArabic ? "اكتشف المتخفي قبل فوات الأوان" : "Find the hidden player before time runs out"}</span></div><button onClick={() => setScreen("mode")}><ChevronLeft /></button>
        </section>
        {unfinishedGames.length > 0 && (
          <section className="platform-continue-banner">
            <div>
              <b>▶️ {isArabic ? `متابعة: ${unfinishedGames[0].gameName}` : `Continue: ${unfinishedGames[0].gameName}`}</b>
              <small>
                {isArabic
                  ? `الجولة ${unfinishedGames[0].roundNumber} من ${unfinishedGames[0].totalRounds} · النقاط: ${unfinishedGames[0].score}`
                  : `Round ${unfinishedGames[0].roundNumber}/${unfinishedGames[0].totalRounds} · Score: ${unfinishedGames[0].score}`}
              </small>
            </div>
            <div className="platform-continue-actions">
              <button className="platform-btn-gold" onClick={() => handleContinueSavedSession(unfinishedGames[0])}>
                ▶️ {isArabic ? "متابعة اللعبة" : "Continue Game"}
              </button>
              <button className="platform-btn-ghost" onClick={() => handleStartFreshFromContinue(unfinishedGames[0].gameKey)}>
                🆕 {isArabic ? "لعبة جديدة" : "New Game"}
              </button>
            </div>
          </section>
        )}
        <section id="game-library" className="game-library" aria-label={isArabic ? "مكتبة الألعاب" : "Game library"}>
          <p>{isArabic ? "مكتبة الألعاب" : "GAME LIBRARY"}</p>
          <div>
            <button className="library-game secret-library" onClick={() => selectGameFromLibrary("secret")}>
              <span>🎭</span>
              <b>{t.secretGame} {!isUnlockedForUser({ gameKey: "secret" }) && <em className="platform-lock-tag">🔒</em>}</b>
              <small>{isArabic ? "تحقيق واكتشاف المتخفي" : "Mystery & hidden suspect"}</small>
            </button>
            <button className="library-game quiz-library" onClick={() => selectGameFromLibrary("quiz")}>
              <span>🧠</span>
              <b>{isArabic ? "الأسئلة العامة" : "General Questions"} {!isUnlockedForUser({ gameKey: "quiz" }) && <em className="platform-lock-tag">🔒</em>}</b>
              <small>{isArabic ? "مسابقة معرفة سريعة" : "Fast knowledge competition"}</small>
            </button>
            <button className="library-game scene-library" onClick={() => selectGameFromLibrary("scene")}>
              <span>🎬</span>
              <b>{isArabic ? "خمن المشهد" : "Guess the Scene"} {!isUnlockedForUser({ gameKey: "scene" }) && <em className="platform-lock-tag">🔒</em>}</b>
              <small>{isArabic ? "مثلها ودع فريقك يخمن" : "Act it and let your team guess"}</small>
            </button>
            <button className="library-game rush-library" onClick={() => selectGameFromLibrary("rush")}>
              <span>⚡</span>
              <b>{isArabic ? "التحدي السريع" : "Quick Challenge"} {!isUnlockedForUser({ gameKey: "rush" }) && <em className="platform-lock-tag">🔒</em>}</b>
              <small>{isArabic ? "سرعة، ذاكرة، ودقة في ثوانٍ" : "Reaction, memory & speed"}</small>
            </button>
          </div>
        </section>
        {archive.length > 0 && <section className="archive-card"><div><Trophy size={18} /><b>{t.localArchive}</b></div>{archive.map((entry, index) => <p key={`${entry.code}-${index}`}><span>{entry.at}</span><b>{entry.winners}</b></p>)}</section>}

        {/* SEO Sections: Natural, high-value content with internal links to all game pages */}
        <section className="home-seo-container" aria-label="دليل منصة لعبتنا">
          <article className="home-seo-card">
            <h2>ما هي لعبتنا؟</h2>
            <p>
              <strong>لعبتنا (LAABTNA)</strong> هي منصة ألعاب جماعية أونلاين ومحلية مصممة خصيصًا للأصدقاء والعائلات. تجمع المنصة بين الغموض والتحدي الفكري والضحك والمنافسة الحركية والسريعة في مكان واحد، لتكون خياركم الأول في كل سهرة وجلسة واقعية أو عبر الإنترنت. شعارنا دائمًا: <em>«لعبتنا جمعتنا»</em>.
            </p>
          </article>

          <article className="home-seo-card">
            <h2>ألعاب جماعية للأصدقاء</h2>
            <p>
              توفر المنصة مكتبة متكاملة من الألعاب الاجتماعية التنافسية التي تلبي جميع الأذواق:
            </p>
            <div className="home-seo-game-links">
              <Link href="/secret-word" className="home-seo-game-pill">
                <span>🎭</span>
                <div>
                  <b>الكلمة السرية</b>
                  <small>لعبة التحقيق والغموض وكشف المتخفي</small>
                </div>
              </Link>
              <Link href="/general-questions" className="home-seo-game-pill">
                <span>🧠</span>
                <div>
                  <b>الأسئلة العامة</b>
                  <small>مسابقة معلومات جماعية سريعة</small>
                </div>
              </Link>
              <Link href="/guess-the-scene" className="home-seo-game-pill">
                <span>🎬</span>
                <div>
                  <b>خمن المشهد</b>
                  <small>لعبة التمثيل والتخمين بين فريقين</small>
                </div>
              </Link>
              <Link href="/quick-challenge" className="home-seo-game-pill">
                <span>⚡</span>
                <div>
                  <b>التحدي السريع</b>
                  <small>تحديات ردة فعل وذاكرة وملاحظة في ثوانٍ</small>
                </div>
              </Link>
            </div>
          </article>

          <article className="home-seo-card">
            <h2>كيف تلعب ألعاب لعبتنا؟</h2>
            <p>
              بدء اللعب في لعبتنا يستغرق أقل من 10 ثوانٍ! اختر اللعبة التي تفضلها من المكتبة، وحدد ما إذا كنت تريد اللعب على نفس الهاتف أو إنشاء غرفة أونلاين ومشاركة الرمز مع أصدقائك، واضبط عدد الجولات والمؤقت وانطلق في التحدي مباشرة.
            </p>
          </article>

          <article className="home-seo-card">
            <h2>ألعاب جماعية بدون تسجيل وبدون تحميل</h2>
            <p>
              حرصنا على توفير تجربة لعب فورية بدون أي عوائق أو تسجيل إجباري؛ لا تحتاج إلى تحميل أي تطبيق أو تثبيت برامج، ولا يُطلب منك إدخال كلمات مرور للعب. كل ما تحتاجه هو فتح الموقع من أي متصفح على هاتفك أو حاسوبك، إدخال اسم مستعار مؤقت، وبدء المرح فورًا.
            </p>
          </article>

          <article className="home-seo-card">
            <h2>العب على نفس الهاتف أو أونلاين</h2>
            <p>
              تدعم جميع ألعاب المنصة وضعين أساسيين: وضع الهاتف الواحد (Same-Phone Local Mode) حيث يمرر اللاعبون هاتفًا واحدًا بينهم مع ضمان سرية الأدوار والأسئلة، ووضع الأونلاين المباشر (Online Multiplayer Mode) حيث ينضم كل صديق من جهازه الخاص برمز غرفة مكون من 5 أحرف بتزامن لحظي سلطوي يحمي قواعد اللعبة.
            </p>
          </article>

          <footer className="home-seo-footer">
            <div className="seo-footer-nav">
              <Link href="/">الرئيسية</Link>
              <Link href="/secret-word">الكلمة السرية</Link>
              <Link href="/general-questions">الأسئلة العامة</Link>
              <Link href="/guess-the-scene">خمن المشهد</Link>
              <Link href="/quick-challenge">التحدي السريع</Link>
            </div>
            <p className="seo-footer-copy">
              لعبتنا جمعتنا — منصة ألعاب جماعية أونلاين للأصدقاء. © {new Date().getFullYear()} LAABTNA
            </p>
          </footer>
        </section>
      </section>}

      {screen === "mode" && <section className="center-view mode-view">
        <p className="eyebrow"><ClipboardList size={14} /> {t.caseFile} 001</p><h1>{t.secretGame}</h1><p className="subheading">{isArabic ? "اختر طريقة التحقيق، واللعبة نفسها بانتظاركم." : "Choose how to investigate. The same game awaits."}</p>
        <div className="mode-grid">
          <button className="mode-card local" onClick={() => { setMode("local"); setScreen("setup"); }}><span className="mode-icon">📱</span><b>{t.local}</b><small>{isArabic ? "مرّر الهاتف بين فريقك" : "Pass one phone around your team"}</small><ArrowLeft /></button>
          <button className="mode-card online" onClick={() => { setMode("online"); setScreen("setup"); }}><span className="mode-icon"><Globe2 /></span><b>{t.online}</b><small>{isArabic ? "غرفة حية من أجهزة مختلفة" : "A live room across devices"}</small><ArrowLeft /></button>
        </div>
        <button className="text-button" onClick={() => setScreen("join")}><KeyRound size={16} />{t.join}</button>
      </section>}

      {screen === "setup" && <section className="setup-view">
        <div className="section-heading"><button className="back-button" onClick={() => setScreen("mode")}><ArrowLeft size={20} /></button><div><p className="eyebrow">{mode === "local" ? "📱" : "🌐"} {mode === "local" ? t.local : t.online}</p><h1>{t.settings}</h1></div></div>
        <div className="setup-grid">
          <section className="settings-card identity-card">
            <div className="card-label"><UsersRound size={18} /> {t.players}</div>
            {mode === "local" ? <><p className="field-help">{isArabic ? "أدخل أسماء فريقك. سيمر الهاتف بينهم عند الملفات السرية." : "Enter your team. The phone passes between them for confidential files."}</p>
              <div className="name-list">{names.map((name, index) => <div className="name-row" key={index}><span>{index + 1}</span><input value={name} maxLength={18} onChange={(event) => setNames((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`${t.nickname} ${index + 1}`} />{names.length > 3 && <button onClick={() => setNames((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={15} /></button>}</div>)}</div>
              {names.length < 10 && <button className="add-name" onClick={() => setNames((current) => [...current, ""])}><Plus size={16} />{isArabic ? "إضافة محقق" : "Add investigator"}</button>}</> : <><label className="input-label">{t.nickname}<input value={nickname} maxLength={18} onChange={(event) => setNickname(event.target.value)} placeholder={isArabic ? "مثال: سارة" : "e.g. Sarah"} autoFocus /></label><p className="field-help">{isArabic ? "اسم مؤقت لهذه الغرفة فقط." : "Temporary for this room only."}</p></>}
          </section>
          <section className="settings-card">
            <div className="card-label"><Fingerprint size={18} /> {t.categories}</div>
            <div className="mini-actions"><button onClick={() => setSettings((current) => ({ ...current, categories: wordBank.map((item) => item.id) }))}>{t.selectAll}</button><button onClick={() => setSettings((current) => ({ ...current, categories: [] }))}>{t.clear}</button><button onClick={() => { const item = wordBank[Math.floor(Math.random() * wordBank.length)]; setSettings((current) => ({ ...current, categories: [item.id] })); }}>{t.random}</button></div>
            <div className="category-grid">{wordBank.map((category) => <button key={category.id} className={settings.categories.includes(category.id) ? "category selected" : "category"} onClick={() => toggleCategory(category.id)}><Check size={13} />{lang === "ar" ? category.ar : category.en}{!isUnlockedForUser({ categoryKey: `secret:${category.id}` }) && " 🔒"}</button>)}</div>
          </section>
          <section className="settings-card controls-card">
            <div className="card-label"><ClipboardList size={18} /> {t.settings}</div>
            <label className="range-field"><span>{t.questionRounds}<b>{settings.questionRounds}</b></span><input type="range" min="1" max="5" value={settings.questionRounds} onChange={(event) => setSettings((current) => ({ ...current, questionRounds: Number(event.target.value) }))} /></label>
            <label className="range-field"><span>{t.impostors}<b>{settings.impostorCount}</b></span><input type="range" min="1" max={mode === "local" ? Math.max(1, Math.floor(names.filter((name) => name.trim()).length / 3)) : "3"} value={Math.min(settings.impostorCount, mode === "local" ? Math.max(1, Math.floor(names.filter((name) => name.trim()).length / 3)) : 3)} onChange={(event) => setSettings((current) => ({ ...current, impostorCount: Number(event.target.value) }))} /></label>
            <label className="range-field"><span>{t.timer}<b>{settings.timerSeconds ? `${settings.timerSeconds}s` : "—"}</b></span><input type="range" min="0" max="90" step="15" value={settings.timerSeconds} onChange={(event) => setSettings((current) => ({ ...current, timerSeconds: Number(event.target.value) }))} /></label>
            <label className="switch-field"><span>{t.extra}</span><input type="checkbox" checked={settings.allowExtraRound} onChange={(event) => setSettings((current) => ({ ...current, allowExtraRound: event.target.checked }))} /></label>
            {mode === "online" && <label className="switch-field"><span>{t.written}</span><input type="checkbox" checked={settings.writtenQuestions} onChange={(event) => setSettings((current) => ({ ...current, writtenQuestions: event.target.checked }))} /></label>}
          </section>
        </div>
        <button className="primary-button create-button" disabled={busy || (mode === ONLINE_MULTIPLAYER && !nickname.trim()) || (mode === LOCAL_SAME_PHONE && names.filter((name) => name.trim()).length < 3)} onClick={createRoom}><Search size={19} />{busy ? "…" : mode === LOCAL_SAME_PHONE ? t.start : t.create}<ArrowLeft size={18} /></button>
      </section>}

      {screen === "join" && <section className="center-view join-view"><div className="join-emblem"><KeyRound /></div><p className="eyebrow">{t.online}</p><h1>{t.join}</h1><p className="subheading">{isArabic ? "اطلب رمز القضية من مدير الغرفة." : "Ask the room host for the case code."}</p><label className="input-label">{t.roomCode}<input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 5))} placeholder="A7K92" className="code-input" autoCapitalize="characters" /></label><label className="input-label">{t.nickname}<input value={nickname} maxLength={18} onChange={(event) => setNickname(event.target.value)} placeholder={isArabic ? "اسمك المؤقت" : "Your temporary name"} /></label><button className="primary-button create-button" disabled={busy || joinCode.length !== 5 || !nickname.trim()} onClick={joinRoom}><Globe2 size={19} />{t.join}</button><button className="text-button" onClick={() => setScreen("mode")}>{t.home}</button></section>}

      {screen === "room" && snapshot && <section className="room-view">
        <div className="room-topline">{snapshot.room.mode === ONLINE_MULTIPLAYER ? <><button className="room-code" onClick={async () => { await navigator.clipboard?.writeText(snapshot.room.code); setCopied(true); window.setTimeout(() => setCopied(false), 1200); }}><Copy size={15} /><span>{snapshot.room.code}</span><small>{copied ? t.copied : t.copy}</small></button><span className="live-pill"><i />{t.live}</span></> : <span className="local-pill"><UserRound size={14} />{isArabic ? "لعب محلي · هاتف واحد" : "Local play · one phone"}</span>}<button className="leave-button" onClick={() => void leaveRoom()}>{t.leave}</button></div>
        {snapshot.round && <div className="phase-rail">{phaseSteps.map((step, index) => { const Icon = step.icon; const active = index === phaseIndex; const done = index < phaseIndex; return <div key={step.phase} className={`phase-step ${active ? "active" : ""} ${done ? "done" : ""}`}><span><Icon size={15} /></span><small>{lang === "ar" ? step.ar : step.en}</small></div>; })}</div>}
        {!snapshot.round ? <Lobby snapshot={snapshot} t={t} lang={lang} busy={busy} onAction={action} /> : <GameStage snapshot={snapshot} t={t} lang={lang} busy={busy} activeViewer={activeViewer} viewerId={viewerId} localSessions={localSessions} privateInfo={privateInfo} revealedIds={revealedIds} seconds={seconds} questionText={questionText} setQuestionText={setQuestionText} onSetViewer={(id) => { setViewerId(id); setPrivateInfo(null); }} onOpenPrivate={openPrivateFile} onAction={action} currentVoter={currentVoter} />}
        <p className="score-rules"><Sparkles size={14} /> {t.scoreRules}</p>
      </section>}

      {paused && <div className="pause-overlay"><div className="pause-card"><Pause size={34} /><p className="eyebrow">CASE PAUSED</p><h2>{isArabic ? "توقفت القضية مؤقتًا" : "The case is paused"}</h2><p>{isArabic ? "لا شيء ضاع. استأنفوا عندما يعود الجميع." : "Nothing is lost. Resume when everyone is ready."}</p><button className="primary-button" onClick={() => setPaused(false)}><Play size={18} />{t.resume}</button></div></div>}

      {showProfileModal && (
        <UserProfileModal
          language={lang}
          initialTab={profileModalTab}
          user={accountUser}
          results={accountResults}
          unfinishedGames={unfinishedGames}
          access={accessState}
          onClose={() => setShowProfileModal(false)}
          onRefresh={refreshAccountAndAccess}
          onContinueGame={handleContinueSavedSession}
          onStartNewGame={handleStartFreshFromContinue}
        />
      )}

      {showPremiumLock && (
        <PremiumLockModal
          user={accountUser}
          telegramUrl={accessState.telegramUrl}
          onClose={() => setShowPremiumLock(false)}
          onOpenAccount={() => setShowProfileModal(true)}
          onRefresh={refreshAccountAndAccess}
        />
      )}

      {showAdminModal && (
        <LazyAdminDashboardModal
          onClose={() => setShowAdminModal(false)}
          onConfigChanged={() => void refreshAccountAndAccess()}
        />
      )}
    </main>
  );
}

function Lobby({ snapshot, t, lang, busy, onAction }: { snapshot: Snapshot; t: (typeof dictionary)[Lang]; lang: Lang; busy: boolean; onAction: (action: string, extra?: Record<string, unknown>, token?: string) => Promise<void> }) {
  const isHost = snapshot.self.isHost;
  return <div className="lobby-stage"><section className="lobby-intro"><div className="lobby-emblem"><ClipboardList /></div><p className="eyebrow">{t.lobby}</p><h1>{lang === "ar" ? "اجمعوا الفريق وافتحوا الملف" : "Gather the team. Open the file."}</h1><p>{lang === "ar" ? "كل محقق يدخل باسم مؤقت فقط. مدير الغرفة يبدأ عندما يكتمل الفريق." : "Every investigator only needs a temporary nickname. The host starts when the team is ready."}</p><div className="room-code-large">{snapshot.room.code}</div><span className="live-pill"><i />{t.waiting}</span></section><section className="investigator-list"><div className="list-title"><UsersRound size={18} />{t.players}<b>{snapshot.players.length}/10</b></div>{snapshot.players.map((player, index) => <div className="player-row" key={player.id}><span className="avatar">{player.nickname.slice(0, 1)}</span><b>{player.nickname}</b>{player.isHost && <small>{t.host}</small>}<span className="presence" />{isHost && !player.isHost && <button className="kick" onClick={() => void onAction("kick", { targetId: player.id })}><X size={15} />{t.kick}</button>}<em>0</em></div>)}<div className="lobby-start">{isHost ? <button className="primary-button" disabled={busy || snapshot.players.length < 3} onClick={() => void onAction("start")}><Search size={19} />{t.startRound}<ArrowLeft size={17} /></button> : <p><Radio size={16} />{lang === "ar" ? "بانتظار مدير الغرفة لفتح القضية…" : "Waiting for the host to open the case…"}</p>}{snapshot.players.length < 3 && <small>{t.needThree}</small>}</div></section></div>;
}

function GameStage({ snapshot, t, lang, busy, activeViewer, viewerId, localSessions, privateInfo, revealedIds, seconds, questionText, setQuestionText, onSetViewer, onOpenPrivate, onAction, currentVoter }: { snapshot: Snapshot; t: (typeof dictionary)[Lang]; lang: Lang; busy: boolean; activeViewer?: Session; viewerId: string; localSessions: Session[]; privateInfo: PrivateInfo | null; revealedIds: string[]; seconds: number; questionText: string; setQuestionText: (value: string) => void; onSetViewer: (id: string) => void; onOpenPrivate: () => Promise<void>; onAction: (action: string, extra?: Record<string, unknown>, token?: string) => Promise<void>; currentVoter?: Session }) {
  const round = snapshot.round!;
  const isHost = snapshot.self.isHost;
  const isLocal = snapshot.room.mode === "local";
  const active = round.activePairing;
  const asker = playerName(snapshot.players, active?.askerId);
  const target = playerName(snapshot.players, active?.targetId);
  const canAdvanceQuestion = isLocal || isHost || active?.askerId === snapshot.self.id || active?.targetId === snapshot.self.id;
  const hasAllLocalFiles = !isLocal || revealedIds.length >= localSessions.length;

  if (round.phase === "opening") return <StageShell icon={<ClipboardList />} eyebrow={t.caseFile} title={lang === "ar" ? "القضية جاهزة للفتح" : "The case is ready"} description={lang === "ar" ? "في هذه الجولة يوجد متخفٍ لا يعرف الكلمة. افتحوا ملفاتكم واحدًا واحدًا." : "This round has a hidden player who does not know the word. Open your files one at a time."}><EvidencePlayers players={snapshot.players} t={t} />{isHost && <button className="primary-button stage-button" disabled={busy} onClick={() => void onAction("advance")}><LockKeyhole size={19} />{lang === "ar" ? "توزيع الأدوار والملفات" : "Distribute roles & confidential files"}</button>}</StageShell>;

  if (round.phase === "secret") return <StageShell icon={<LockKeyhole />} eyebrow={t.secretWord} title={isLocal ? `${t.passPhone} ${activeViewer?.nickname ?? "…"}` : lang === "ar" ? "ملفك السري جاهز" : "Your secret file is ready"} description={privateInfo ? t.doNotShow : isLocal ? (lang === "ar" ? "اضغط لفتح الملف، ثم أخفه قبل تمرير الهاتف." : "Open this file, then hide it before passing the phone.") : (lang === "ar" ? "أنت فقط تستطيع رؤية هذا الملف." : "Only you can see this file.")}><div className={`secret-file ${privateInfo ? "opened" : ""}`}>{privateInfo ? <><Fingerprint size={32} /><small>{t.youAre}</small><h2>{privateInfo.role === "impostor" ? t.impostor : t.agent}</h2>{privateInfo.role === "agent" ? <div className="word-reveal"><small>{t.secretWord}</small><b>{privateInfo.secretWord}</b></div> : <p>{lang === "ar" ? "استمع للأسئلة وارتجل إجابات مقنعة." : "Listen to questions and improvise convincing answers."}</p>}<button className="ghost-button" onClick={() => { playEffect("fileClose"); setTimeout(() => onSetViewer(isLocal ? localSessions.find((session) => !revealedIds.includes(session.id) && session.id !== viewerId)?.id ?? viewerId : viewerId), 120); }}><Eye size={16} />{t.hideFile}</button></> : <><LockKeyhole size={34} /><p>{t.doNotShow}</p><button className="primary-button" disabled={busy} onClick={() => void onOpenPrivate()}><KeyRound size={18} />{t.revealFile}</button></>}</div>{isLocal && <div className="file-progress">{localSessions.map((session) => <button key={session.id} className={session.id === viewerId ? "viewer-chip selected" : revealedIds.includes(session.id) ? "viewer-chip complete" : "viewer-chip"} onClick={() => { onSetViewer(session.id); }}><span>{revealedIds.includes(session.id) ? <Check size={13} /> : session.nickname.slice(0, 1)}</span>{session.nickname}</button>)}</div>}{isHost && <button className="primary-button stage-button" disabled={busy || !hasAllLocalFiles} onClick={() => void onAction("advance")}><MessageCircleQuestion size={19} />{t.nextPhase}</button>}</StageShell>;

  if (round.phase === "questions") return <StageShell icon={<MessageCircleQuestion />} eyebrow={`${t.questionRounds} · ${round.questionRound}/${round.totalQuestionRounds}`} title={<><strong>{asker}</strong> {t.ask} <strong>{target}</strong></>} description={isLocal ? t.verbalHint : active?.askerId === snapshot.self.id ? (round.activeQuestionText || t.onlineQuestionOnly) : active?.targetId === snapshot.self.id ? (round.activeQuestionText || (lang === "ar" ? "بانتظار السؤال المكتوب…" : "Waiting for the written question…")) : `${t.waitTurn} ${asker}`}><div className="interrogation-scene"><div className="suspect-token asker"><UserRound /><b>{asker}</b><small>{lang === "ar" ? "السائل" : "ASKS"}</small></div><div className="question-beam"><Search /><span>?</span></div><div className="suspect-token target"><UserRound /><b>{target}</b><small>{lang === "ar" ? "المجيب" : "ANSWERS"}</small></div></div>{snapshot.room.settings.timerSeconds > 0 && <div className={`timer-orb ${seconds <= 10 ? "urgent" : ""}`}><span>{seconds}</span><small>s</small></div>}{!isLocal && snapshot.room.settings.writtenQuestions && active?.askerId === snapshot.self.id && <div className="question-compose"><input value={questionText} maxLength={140} onChange={(event) => setQuestionText(event.target.value)} placeholder={t.typeQuestion} /><button disabled={busy || !questionText.trim()} onClick={() => void onAction("sendQuestion", { text: questionText })}><ArrowLeft size={18} />{t.send}</button></div>}{canAdvanceQuestion && <button className="primary-button stage-button" disabled={busy} onClick={() => void onAction("advanceQuestion")}><ChevronLeft size={19} />{t.questionDone}</button>}</StageShell>;

  if (round.phase === "questionsComplete") return <StageShell icon={<BadgeCheck />} eyebrow={t.questionRounds} title={lang === "ar" ? "انتهت جولات الأسئلة" : "Question rounds complete"} description={lang === "ar" ? "هل تحتاجون لمزيد من الأدلة؟ مدير الغرفة يقرر." : "Need more clues? The room host decides."}><div className="evidence-divider"><span /><Fingerprint /><span /></div>{isHost && <div className="split-actions">{snapshot.room.settings.allowExtraRound && <button className="ghost-button" disabled={busy} onClick={() => void onAction("extraRound")}><Plus size={17} />{t.extraRound}</button>}<button className="primary-button" disabled={busy} onClick={() => void onAction("advance")}><Search size={18} />{t.goVote}</button></div>}</StageShell>;

  if (round.phase === "discussion") return <StageShell icon={<Search />} eyebrow={t.discussion} title={lang === "ar" ? "اربطوا الأدلة معًا" : "Connect the clues"} description={t.discussionHint}><div className="suspect-board">{snapshot.players.map((player, index) => <div className="suspect-card" key={player.id}><span className="pin-dot" /><UserRound size={27} /><b>{player.nickname}</b><small>{t.suspect} {index + 1}</small></div>)}</div>{isHost && <button className="primary-button stage-button" disabled={busy} onClick={() => void onAction("advance")}><Vote size={18} />{t.startVoting}</button>}</StageShell>;

  if (round.phase === "voting") {
    const voterId = isLocal ? currentVoter?.id : snapshot.self.id;
    const voterName = isLocal ? currentVoter?.nickname : snapshot.self.nickname;
    const voterToken = isLocal ? currentVoter?.token : undefined;
    const done = isLocal ? !currentVoter : round.hasVoted;
    return <StageShell icon={<Vote />} eyebrow={t.voting} title={done ? t.waitingVotes : `${t.passPhone} ${voterName}`} description={done ? `${round.voteCount}/${round.playerCount}` : t.yourTurnVote}><div className="vote-count"><Vote size={18} /><b>{round.voteCount}</b><span>/ {round.playerCount} {t.votes}</span></div>{!done && <div className="vote-grid">{snapshot.players.filter((player) => player.id !== voterId).map((player) => <button key={player.id} className="vote-card" disabled={busy} onClick={() => void onAction("vote", { targetId: player.id }, voterToken)}><span className="avatar large">{player.nickname.slice(0, 1)}</span><b>{player.nickname}</b><small>{t.suspect}</small></button>)}</div>}{isHost && round.voteCount >= round.playerCount && <button className="primary-button stage-button" disabled={busy} onClick={() => void onAction("reveal")}><Eye size={19} />{t.revealTruth}</button>}</StageShell>;
  }

  const reveal = round.revealData!;
  const hiddenNames = reveal.impostorIds.map((id) => playerName(snapshot.players, id)).join("، ");
  return <StageShell icon={<Eye />} eyebrow={t.truth} title={reveal.caught ? t.caseSolved : t.caseLost} description={`${t.resultHint}: ${reveal.secretWord}`} dramatic><div className="truth-card"><div className="truth-seal"><Eye /></div><small>{t.revealRoles}</small><h2>{hiddenNames}</h2><div className="truth-word"><LockKeyhole size={16} />{reveal.secretWord}</div></div><div className="tally-card"><div className="card-label"><Vote size={17} />{t.votesTally}</div>{snapshot.players.map((player) => <div className="tally-row" key={player.id}><span>{player.nickname}</span><div><i style={{ width: `${Math.max(6, ((reveal.tally[player.id] ?? 0) / Math.max(1, snapshot.players.length)) * 100)}%` }} /></div><b>{reveal.tally[player.id] ?? 0}</b></div>)}</div><ScoreBoard players={snapshot.players} points={reveal.points} t={t} />{round.phase === "reveal" ? (isHost && <button className="primary-button stage-button" disabled={busy} onClick={() => void onAction("advance")}><Trophy size={18} />{t.finish}</button>) : (isHost && <button className="primary-button stage-button" disabled={busy} onClick={() => void onAction("nextRound")}><Play size={18} />{t.nextRound}</button>)}</StageShell>;
}

function StageShell({ icon, eyebrow, title, description, children, dramatic = false }: { icon: React.ReactNode; eyebrow: string; title: React.ReactNode; description: string; children: React.ReactNode; dramatic?: boolean }) {
  return <div className={`stage-shell ${dramatic ? "dramatic" : ""}`}><div className="stage-icon">{icon}</div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="stage-description">{description}</p><div className="stage-content">{children}</div>{dramatic && <div className="particles">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ "--i": index } as React.CSSProperties} />)}</div>}</div>;
}

function EvidencePlayers({ players, t }: { players: Player[]; t: (typeof dictionary)[Lang] }) { return <div className="evidence-players">{players.map((player) => <div key={player.id}><span className="avatar large">{player.nickname.slice(0, 1)}</span><b>{player.nickname}</b><small>{player.isHost ? t.host : t.suspect}</small></div>)}</div>; }
function ScoreBoard({ players, points, t }: { players: Player[]; points: Record<string, number>; t: (typeof dictionary)[Lang] }) { return <div className="score-board"><div className="card-label"><Trophy size={17} />{t.score}</div>{[...players].sort((a, b) => b.score - a.score).map((player, index) => <div className="score-row" key={player.id}><span>{index + 1}</span><b>{player.nickname}</b><em>{points[player.id] ? `+${points[player.id]} ` : ""}{player.score} <small>pts</small></em></div>)}</div>; }
