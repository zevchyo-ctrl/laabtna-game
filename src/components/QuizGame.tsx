"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Brain, Check, ChevronLeft, CircleHelp, Clock3, Copy, Crown, Globe2,
  Lightbulb, Medal, Pause, Play, Plus, RefreshCw, SkipForward, Sparkles, Timer,
  Trophy, UserRound, UsersRound, X,
} from "lucide-react";
import { localizedQuizQuestions, quizCategories, type QuizLanguage } from "@/lib/quiz-data";
import { defaultQuizSettings, difficultyLabel, safeQuizSettings, type QuizDifficultySetting, type QuizSettings } from "@/lib/quiz";
import SoundControls from "@/components/SoundControls";
import {
  recordGameResultToAccount,
  saveUnfinishedSessionToAccount,
  triggerPremiumLockModal,
} from "@/lib/platform-client";
import { playEffect } from "@/lib/sounds";

type Language = "ar" | "en";
type Mode = "local" | "online";
type Screen = "home" | "mode" | "setup" | "join" | "lobby" | "game";
type Question = ReturnType<typeof localizedQuizQuestions>[number];
type Player = { id: string; nickname: string; isHost: boolean; isConnected?: boolean; score: number };
type Stat = { correct: number; incorrect: number; passed: number; changed: number };
type LocalGame = {
  players: Player[]; settings: QuizSettings; round: number; turnIndex: number;
  status: "handoff" | "question" | "result" | "roundResult" | "finished";
  question: Question | null; usedIds: string[]; changes: Record<string, boolean>; stats: Record<string, Stat>;
  result: { status: "correct" | "incorrect" | "passed" | "timedOut"; correctAnswer: string; questionText: string } | null;
  deadline: number | null;
};
type OnlineSnapshot = {
  room: { code: string; mode: "online"; gameType: "quiz"; status: string; settings: QuizSettings };
  self: Player;
  players: Player[];
  game?: {
    status: "lobby" | "question" | "result" | "roundResult" | "finished";
    roundNumber: number; totalRounds: number; turnIndex: number; currentPlayerId: string | null; currentTurnId: string | null; currentPlayerChangeUsed: boolean;
    expiresAt: string | null; result: { playerId: string; status: "correct" | "incorrect" | "passed" | "timedOut"; correctAnswer: string; questionText: string } | null;
    stats: Record<string, Stat>;
  };
};
type PrivateQuestion = { id: string; text: string; choices: string[]; category: string; difficulty: string; expiresAt: string };

const text = {
  ar: {
    title: "الأسئلة العامة", kicker: "مسابقة معرفة", hero: "من يعرف أكثر؟ سؤال واحد، قرار واحد، ونقطة تفصل بين الأبطال.", start: "ابدأ المسابقة", local: "لعب على نفس الهاتف", online: "لعب أونلاين", join: "الانضمام لغرفة", create: "إنشاء غرفة", nickname: "اسمك المستعار", code: "رمز الغرفة", settings: "إعدادات المسابقة", players: "المتسابقون", add: "إضافة متسابق", categories: "التصنيفات", all: "تحديد الكل", clear: "إلغاء الكل", random: "اختيار عشوائي", rounds: "عدد الجولات", timer: "مؤقت السؤال", difficulty: "الصعوبة", scoreSystem: "+10 للإجابة الصحيحة · 0 للخطأ أو التمرير", ready: "أنا جاهز", pass: "تمرير السؤال", change: "تغيير السؤال", changeUsed: "تم استخدام التغيير", answer: "الإجابة", next: "الدور التالي", nextRound: "بدء الجولة التالية", startGame: "ابدأ المسابقة", waiting: "بانتظار المتسابقين", needPlayers: "نحتاج لاعبين على الأقل", passPhone: "مرر الهاتف إلى", turn: "دور", timeUp: "انتهى الوقت", correct: "إجابة صحيحة!", incorrect: "إجابة غير صحيحة", passed: "تم تمرير السؤال", correctAnswer: "الإجابة الصحيحة", roundDone: "انتهت الجولة", gameOver: "انتهت اللعبة", playAgain: "لعب مرة أخرى", back: "العودة إلى الألعاب", live: "مزامنة مباشرة", questionPrivate: "السؤال ظاهر لك وحدك", waitTurn: "راقب لوحة النقاط — الدور عند", copy: "نسخ", copied: "تم النسخ", leaderboard: "لوحة الصدارة", results: "نتائجك", score: "نقطة", correctShort: "صحيح", wrongShort: "خطأ", passShort: "تمرير", changeShort: "تغيير", choose: "اختر الإجابة الصحيحة", categoriesHint: "اختر فئة واحدة أو أكثر، أو دع الحظ يختار.", onlineHint: "كل لاعب يرى سؤاله على جهازه فقط.", localHint: "يمر الهاتف للمتسابق قبل ظهور السؤال.", room: "غرفة المسابقة", waitingQuestion: "نجهز سؤالًا لك…", host: "مدير الغرفة", leave: "خروج", resume: "استئناف", paused: "المسابقة متوقفة مؤقتًا", noQuestion: "لا توجد أسئلة كافية لهذه الإعدادات.",
  },
  en: {
    title: "General Questions", kicker: "Knowledge quiz", hero: "Who knows more? One question, one choice, and a point between champions.", start: "Start quiz", local: "Same phone", online: "Play online", join: "Join a room", create: "Create room", nickname: "Your nickname", code: "Room code", settings: "Quiz settings", players: "Contestants", add: "Add contestant", categories: "Categories", all: "Select all", clear: "Clear all", random: "Random pick", rounds: "Rounds", timer: "Question timer", difficulty: "Difficulty", scoreSystem: "+10 for a correct answer · 0 for wrong or pass", ready: "I am ready", pass: "Pass question", change: "Change question", changeUsed: "Change used", answer: "Answer", next: "Next turn", nextRound: "Start next round", startGame: "Start quiz", waiting: "Waiting for contestants", needPlayers: "At least two players needed", passPhone: "Pass the phone to", turn: "Turn", timeUp: "Time is up", correct: "Correct answer!", incorrect: "Incorrect answer", passed: "Question passed", correctAnswer: "Correct answer", roundDone: "Round complete", gameOver: "Game over", playAgain: "Play again", back: "Back to games", live: "Live sync", questionPrivate: "Only you can see this question", waitTurn: "Watch the scoreboard — it is", copy: "Copy", copied: "Copied", leaderboard: "Leaderboard", results: "Your results", score: "points", correctShort: "Correct", wrongShort: "Wrong", passShort: "Passed", changeShort: "Changes", choose: "Choose the correct answer", categoriesHint: "Choose one or more categories, or let chance decide.", onlineHint: "Each player sees their own question only.", localHint: "Pass the phone before the question is revealed.", room: "Quiz room", waitingQuestion: "Preparing your question…", host: "Room host", leave: "Leave", resume: "Resume", paused: "Quiz is paused", noQuestion: "There are not enough questions for these settings.",
  },
} as const;

function id(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function shuffled<T>(list: T[]) { const copy = [...list]; for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
function emptyStats(): Stat { return { correct: 0, incorrect: 0, passed: 0, changed: 0 }; }
function categoryName(category: string, language: Language) { return quizCategories.find((item) => item.id === category)?.[language] ?? category; }
function pluralScore(points: number, language: Language) { return language === "ar" ? `${points} نقطة` : `${points} pts`; }

async function request<T>(url: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "content-type": "application/json", ...(token ? { "x-laabtna-token": token } : {}), ...(options.headers ?? {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body as T;
}

export default function QuizGame({ onBack, language: initialLanguage = "ar" }: { onBack: () => void; language?: Language }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<Mode>("local");
  const [names, setNames] = useState(["أحمد", "سارة", "محمد"]);
  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [settings, setSettings] = useState<QuizSettings>({ ...defaultQuizSettings, language: initialLanguage });
  const [local, setLocal] = useState<LocalGame | null>(null);
  const [online, setOnline] = useState<OnlineSnapshot | null>(null);
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [privateQuestion, setPrivateQuestion] = useState<PrivateQuestion | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [copied, setCopied] = useState(false);
  const [paused, setPaused] = useState(false);
  const localTimeoutGuard = useRef(false);
  const lastQuizWarning = useRef<number | null>(null);
  const lastOnlineSound = useRef("");
  const recordedQuizResult = useRef("");
  const t = text[language];
  const isLocal = mode === "local";

  useEffect(() => { setSettings((current) => ({ ...current, language })); }, [language]);

  useEffect(() => {
    const raw = window.sessionStorage.getItem("laabtna:resume:quiz");
    if (!raw) return;
    window.sessionStorage.removeItem("laabtna:resume:quiz");
    try {
      const saved = JSON.parse(raw) as LocalGame;
      if (saved?.players?.length) {
        setLocal(saved);
        setScreen("game");
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!local) return;
    if (local.status !== "finished") {
      void saveUnfinishedSessionToAccount({
        gameKey: "quiz",
        gameName: "🧠 الأسئلة العامة",
        mode: "local",
        roundNumber: local.round,
        totalRounds: local.settings.rounds,
        score: Math.max(0, ...local.players.map((p) => p.score)),
        statePayload: local as unknown as Record<string, unknown>,
      });
    } else {
      const sig = `local_${local.round}_${local.players.map((p) => p.score).join("-")}`;
      if (recordedQuizResult.current !== sig) {
        recordedQuizResult.current = sig;
        const sorted = [...local.players].sort((a, b) => b.score - a.score);
        void recordGameResultToAccount({
          gameKey: "quiz",
          gameName: "🧠 الأسئلة العامة",
          mode: "local",
          score: sorted[0]?.score ?? 0,
          rounds: local.settings.rounds,
          rankLabel: `🥇 ${sorted[0]?.nickname ?? "—"}`,
          stats: { leaderboard: sorted, stats: local.stats },
        });
      }
    }
  }, [local]);

  const pickLocalQuestion = useCallback((gameSettings: QuizSettings, used: string[]) => {
    const eligible = localizedQuizQuestions(gameSettings.language).filter((question) => gameSettings.categories.includes(question.category) && (gameSettings.difficulty === "mixed" || question.difficulty === gameSettings.difficulty));
    const fresh = eligible.filter((question) => !used.includes(question.id));
    const pool = fresh.length ? fresh : eligible;
    return pool.length ? shuffled(pool)[0] : null;
  }, []);

  const startLocal = () => {
    const clean = names.map((name) => name.trim().replace(/\s+/g, " ")).filter(Boolean);
    if (clean.length < 2 || clean.length > 8) { setNotice(language === "ar" ? "أدخل من 2 إلى 8 أسماء" : "Enter 2–8 names"); return; }
    const configured = safeQuizSettings({ ...settings, language });
    const players = clean.map((playerName, index) => ({ id: id("local_quiz"), nickname: playerName, isHost: index === 0, score: 0 }));
    setLocal({ players, settings: configured, round: 1, turnIndex: 0, status: "handoff", question: null, usedIds: [], changes: {}, stats: Object.fromEntries(players.map((player) => [player.id, emptyStats()])), result: null, deadline: null });
    setScreen("game"); playEffect("start");
  };

  const localReady = () => {
    if (!local) return;
    const question = pickLocalQuestion(local.settings, local.usedIds);
    if (!question) { setNotice(t.noQuestion); return; }
    localTimeoutGuard.current = false;
    playEffect("start");
    setLocal({ ...local, status: "question", question, usedIds: [...local.usedIds, question.id], deadline: Date.now() + local.settings.timerSeconds * 1000 });
  };

  const finishLocal = useCallback((status: "correct" | "incorrect" | "passed" | "timedOut", answer?: string) => {
    playEffect(status === "correct" ? "success" : status === "passed" ? "pass" : status === "timedOut" ? "timeout" : "fail");
    setLocal((current) => {
      if (!current || current.status !== "question" || !current.question) return current;
      const player = current.players[current.turnIndex];
      const correct = status === "correct";
      const players = current.players.map((item) => item.id === player.id ? { ...item, score: item.score + (correct ? current.settings.pointsCorrect : 0) } : item);
      const stats = { ...current.stats, [player.id]: { ...current.stats[player.id], correct: current.stats[player.id].correct + (correct ? 1 : 0), incorrect: current.stats[player.id].incorrect + (status === "incorrect" || status === "timedOut" ? 1 : 0), passed: current.stats[player.id].passed + (status === "passed" ? 1 : 0) } };
      return { ...current, players, stats, status: "result", deadline: null, result: { status, correctAnswer: current.question.answer, questionText: current.question.text } };
    });
  }, []);

  useEffect(() => {
    if (!local || local.status !== "question" || !local.deadline) { setRemaining(0); return; }
    const tick = () => {
      const left = Math.max(0, Math.ceil((local.deadline! - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 10 && left > 0 && lastQuizWarning.current !== left) { lastQuizWarning.current = left; playEffect("warning"); }
      if (!left && !localTimeoutGuard.current) { localTimeoutGuard.current = true; finishLocal("timedOut"); }
    };
    tick(); const interval = window.setInterval(tick, 250); return () => window.clearInterval(interval);
  }, [finishLocal, local]);

  const answerLocal = (answer: string) => { if (!local?.question) return; finishLocal(answer === local.question.answer ? "correct" : "incorrect", answer); };
  const passLocal = () => finishLocal("passed");
  const changeLocal = () => {
    if (!local || !local.question) return;
    const player = local.players[local.turnIndex];
    if (local.changes[player.id]) return;
    const question = pickLocalQuestion(local.settings, local.usedIds);
    if (!question) { setNotice(t.noQuestion); return; }
    localTimeoutGuard.current = false;
    playEffect("change");
    setLocal({ ...local, question, usedIds: [...local.usedIds, question.id], changes: { ...local.changes, [player.id]: true }, stats: { ...local.stats, [player.id]: { ...local.stats[player.id], changed: local.stats[player.id].changed + 1 } }, deadline: Date.now() + local.settings.timerSeconds * 1000 });
  };
  const advanceLocal = () => {
    if (!local) return;
    if (local.status === "result") {
      if (local.turnIndex + 1 < local.players.length) setLocal({ ...local, turnIndex: local.turnIndex + 1, status: "handoff", question: null, result: null, deadline: null });
      else if (local.round >= local.settings.rounds) setLocal({ ...local, status: "finished", question: null, deadline: null });
      else setLocal({ ...local, status: "roundResult", question: null, deadline: null });
    } else if (local.status === "roundResult") {
      setLocal({ ...local, round: local.round + 1, turnIndex: 0, status: "handoff", question: null, result: null, changes: {}, deadline: null });
    }
  };

  const syncOnline = useCallback(async () => {
    if (!code || !token) return;
    try { setOnline(await request<OnlineSnapshot>(`/api/quiz/rooms/${code}`, { method: "GET" }, token)); setNotice(""); }
    catch (error) { setNotice(error instanceof Error ? error.message : "تعذر الاتصال بالغرفة"); }
  }, [code, token]);

  useEffect(() => {
    if (!["lobby", "game"].includes(screen) || !code || !token) return;
    void syncOnline(); const interval = window.setInterval(() => void syncOnline(), 1000); return () => window.clearInterval(interval);
  }, [code, screen, syncOnline, token]);

  useEffect(() => {
    if (screen === "lobby" && online?.game && online.game.status !== "lobby") setScreen("game");
  }, [online?.game, screen]);

  useEffect(() => {
    const game = online?.game;
    if (!game || game.status !== "question" || game.currentPlayerId !== online.self.id || !code || !token) { setPrivateQuestion(null); return; }
    let cancelled = false;
    request<{ question: PrivateQuestion | null }>(`/api/quiz/rooms/${code}/question`, { method: "GET" }, token).then((data) => { if (!cancelled) setPrivateQuestion(data.question); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [code, online?.game?.currentTurnId, online?.game?.status, online?.game?.currentPlayerId, online?.self.id, token]);

  useEffect(() => {
    const game = online?.game;
    const key = game?.status === "result" ? `${game.currentTurnId}-${game.result?.status}` : game?.status === "finished" ? `finished-${game.roundNumber}` : "";
    if (key && key !== lastOnlineSound.current) { lastOnlineSound.current = key; playEffect(game?.status === "finished" ? "victory" : game?.result?.status === "correct" ? "success" : game?.result?.status === "passed" ? "pass" : game?.result?.status === "timedOut" ? "timeout" : "fail"); }
  }, [online?.game]);

  useEffect(() => {
    const expiresAt = online?.game?.expiresAt;
    if (!expiresAt) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    tick(); const interval = window.setInterval(tick, 250); return () => window.clearInterval(interval);
  }, [online?.game?.expiresAt]);

  const onlineAction = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!code || !token) return;
    setBusy(true); setNotice("");
    try { await request(`/api/quiz/rooms/${code}/action`, { method: "POST", body: JSON.stringify({ action, ...extra }) }, token); if (action === "start") playEffect("start"); if (action === "change") playEffect("change"); if (action === "pass") playEffect("pass"); if (action === "answer") playEffect("select"); await syncOnline(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "تعذر إكمال الخطوة"); }
    finally { setBusy(false); }
  };

  const createOnline = async () => {
    if (!nickname.trim()) return;
    setBusy(true); setNotice("");
    try {
      const data = await request<{ code: string; token: string; playerId: string }>("/api/quiz/rooms", { method: "POST", body: JSON.stringify({ action: "create", nickname, settings: { ...settings, language } }) });
      setCode(data.code); setToken(data.token); setScreen("lobby");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "تعذر إنشاء الغرفة";
      if (msg.includes("الميزات المتقدمة")) {
        triggerPremiumLockModal("quiz");
        onBack();
      } else setNotice(msg);
    } finally { setBusy(false); }
  };
  const joinOnline = async () => {
    if (!nickname.trim() || joinCode.length !== 5) return;
    setBusy(true); setNotice("");
    try { const data = await request<{ code: string; token: string }>("/api/quiz/rooms", { method: "POST", body: JSON.stringify({ action: "join", code: joinCode, nickname }) }); setCode(data.code); setToken(data.token); setScreen("lobby"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "تعذر الانضمام"); } finally { setBusy(false); }
  };

  const activeLocalPlayer = local?.players[local.turnIndex];
  const onlineCurrent = online?.players.find((player) => player.id === online.game?.currentPlayerId);
  const onlineCanAdvance = Boolean(online?.game && (online.self.isHost || online.game.currentPlayerId === online.self.id));
  const activeStats = local ? local.stats : online?.game?.stats ?? {};

  return <main className="quiz-shell" dir={language === "ar" ? "rtl" : "ltr"}>
    <div className="quiz-orb orb-a" /><div className="quiz-orb orb-b" /><div className="quiz-dots" />
    <header className="quiz-topbar"><button className="quiz-brand" onClick={onBack}><span><Brain /></span><b>LAABTNA<small>{t.kicker}</small></b></button><div><SoundControls language={language} /><button className="quiz-language" onClick={() => setLanguage((value) => value === "ar" ? "en" : "ar")}>{language === "ar" ? "EN" : "ع"}</button>{["game", "lobby"].includes(screen) && <button className="quiz-pause" onClick={() => setPaused(true)}><Pause size={16} /></button>}</div></header>
    {notice && <div className="quiz-toast"><CircleHelp size={17} />{notice}<button onClick={() => setNotice("")}><X size={16} /></button></div>}

    {screen === "home" && <section className="quiz-home"><div className="quiz-hero-copy"><p className="quiz-kicker"><Sparkles size={14} /> {t.kicker.toUpperCase()}</p><h1><span>LAABTNA</span>{t.title}</h1><p>{t.hero}</p><div className="quiz-hero-actions"><button className="quiz-primary" onClick={() => setScreen("mode")}><Brain size={19} />{t.start}<ArrowLeft size={18} /></button><button className="quiz-back-link" onClick={onBack}>{t.back}</button></div></div><div className="quiz-hero-card" aria-hidden="true"><div className="hero-crown"><Crown /></div><div className="hero-question">?</div><div className="hero-badge"><Trophy /><span>TOP<br />QUIZ</span></div><div className="hero-mini-card globe"><Globe2 /></div><div className="hero-mini-card bulb"><Lightbulb /></div><i className="hero-star s1" /><i className="hero-star s2" /><i className="hero-star s3" /></div><div className="quiz-rules"><div><Timer /><b>{language === "ar" ? "فكّر بسرعة" : "Think fast"}</b><small>{language === "ar" ? "سؤال ومؤقت واضح" : "One question, clear timer"}</small></div><div><RefreshCw /><b>{language === "ar" ? "غيّر مرة" : "One change"}</b><small>{language === "ar" ? "لكل لاعب في الجولة" : "for every player, every round"}</small></div><div><Trophy /><b>{language === "ar" ? "نافس واربح" : "Compete & win"}</b><small>{t.scoreSystem}</small></div></div></section>}

    {screen === "mode" && <section className="quiz-center"><p className="quiz-kicker"><Brain size={14} /> {t.title}</p><h1>{language === "ar" ? "كيف تريدون اللعب؟" : "How do you want to play?"}</h1><p>{language === "ar" ? "مسابقة واحدة، بطريقتين للانطلاق." : "One quiz, two ways to start."}</p><div className="quiz-mode-grid"><button onClick={() => { setMode("local"); setScreen("setup"); }}><span>📱</span><b>{t.local}</b><small>{t.localHint}</small><ChevronLeft /></button><button onClick={() => { setMode("online"); setScreen("setup"); }}><span><Globe2 /></span><b>{t.online}</b><small>{t.onlineHint}</small><ChevronLeft /></button></div><button className="quiz-back-link" onClick={() => setScreen("join")}><Globe2 size={15} />{t.join}</button></section>}

    {screen === "setup" && <section className="quiz-setup"><div className="quiz-section-title"><button onClick={() => setScreen("mode")}><ArrowLeft /></button><div><p className="quiz-kicker">{mode === "local" ? "📱" : "🌐"} {mode === "local" ? t.local : t.online}</p><h1>{t.settings}</h1></div></div><div className="quiz-settings-grid"><section className="quiz-setting-card"><div className="quiz-card-title"><UsersRound size={18} />{t.players}</div>{isLocal ? <><p className="quiz-help">{t.localHint}</p><div className="quiz-name-list">{names.map((name, index) => <div key={index}><span>{index + 1}</span><input value={name} maxLength={18} onChange={(event) => setNames((current) => current.map((value, currentIndex) => currentIndex === index ? event.target.value : value))} />{names.length > 2 && <button onClick={() => setNames((current) => current.filter((_, currentIndex) => currentIndex !== index))}><X size={14} /></button>}</div>)}</div>{names.length < 8 && <button className="quiz-add" onClick={() => setNames((current) => [...current, ""])}><Plus size={15} />{t.add}</button>}</> : <><label className="quiz-input-label">{t.nickname}<input value={nickname} maxLength={18} onChange={(event) => setNickname(event.target.value)} placeholder={language === "ar" ? "مثال: سارة" : "e.g. Sarah"} autoFocus /></label><p className="quiz-help">{t.onlineHint}</p></>}</section><section className="quiz-setting-card"><div className="quiz-card-title"><Globe2 size={18} />{t.categories}</div><p className="quiz-help">{t.categoriesHint}</p><div className="quiz-mini-actions"><button onClick={() => setSettings((value) => ({ ...value, categories: quizCategories.map((category) => category.id) }))}>{t.all}</button><button onClick={() => setSettings((value) => ({ ...value, categories: [] }))}>{t.clear}</button><button onClick={() => { const category = quizCategories[Math.floor(Math.random() * quizCategories.length)]; setSettings((value) => ({ ...value, categories: [category.id] })); }}>{t.random}</button></div><div className="quiz-category-grid">{quizCategories.map((category) => <button key={category.id} className={settings.categories.includes(category.id) ? "selected" : ""} onClick={() => setSettings((value) => ({ ...value, categories: value.categories.includes(category.id) ? value.categories.filter((item) => item !== category.id) : [...value.categories, category.id] }))}><Check size={12} />{category[language]}</button>)}</div></section><section className="quiz-setting-card quiz-controls"><div className="quiz-card-title"><Brain size={18} />{t.settings}</div><label><span>{t.rounds}<b>{settings.rounds}</b></span><input type="range" min="1" max="4" value={settings.rounds} onChange={(event) => setSettings((value) => ({ ...value, rounds: Number(event.target.value) }))} /></label><label><span>{t.timer}<b>{settings.timerSeconds}s</b></span><input type="range" min="5" max="45" step="5" value={settings.timerSeconds} onChange={(event) => setSettings((value) => ({ ...value, timerSeconds: Number(event.target.value) }))} /></label><div className="quiz-difficulty"><span>{t.difficulty}</span><div>{(["easy", "medium", "hard", "mixed"] as QuizDifficultySetting[]).map((level) => <button className={settings.difficulty === level ? "selected" : ""} key={level} onClick={() => setSettings((value) => ({ ...value, difficulty: level }))}>{difficultyLabel(level, language)}</button>)}</div></div><p className="quiz-points"><Trophy size={15} />{t.scoreSystem}</p></section></div><button className="quiz-primary quiz-create" disabled={busy || (mode === "online" && !nickname.trim()) || (mode === "local" && names.filter((item) => item.trim()).length < 2)} onClick={() => void (mode === "local" ? startLocal() : createOnline())}><Brain size={18} />{mode === "local" ? t.start : t.create}<ArrowLeft size={17} /></button></section>}

    {screen === "join" && <section className="quiz-join quiz-center"><div className="quiz-join-icon"><Globe2 /></div><p className="quiz-kicker">{t.online}</p><h1>{t.join}</h1><p>{language === "ar" ? "اطلب رمز غرفة المسابقة من مديرها." : "Ask the quiz host for the room code."}</p><label className="quiz-input-label">{t.code}<input className="quiz-code-input" value={joinCode} placeholder="A7K92" onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 5))} /></label><label className="quiz-input-label">{t.nickname}<input value={nickname} maxLength={18} onChange={(event) => setNickname(event.target.value)} /></label><button className="quiz-primary quiz-create" disabled={busy || joinCode.length !== 5 || !nickname.trim()} onClick={() => void joinOnline()}><Globe2 size={18} />{t.join}</button><button className="quiz-back-link" onClick={() => setScreen("mode")}>{t.back}</button></section>}

    {screen === "lobby" && online && <section className="quiz-room"><div className="quiz-room-top"><button className="quiz-code" onClick={async () => { await navigator.clipboard?.writeText(online.room.code); setCopied(true); setTimeout(() => setCopied(false), 1000); }}><Copy size={14} /><b>{online.room.code}</b><small>{copied ? t.copied : t.copy}</small></button><span className="quiz-live"><i />{t.live}</span><button className="quiz-leave" onClick={onBack}>{t.leave}</button></div><div className="quiz-lobby"><div className="quiz-lobby-art"><Brain /><span>?</span></div><p className="quiz-kicker">{t.room}</p><h1>{t.waiting}</h1><p>{language === "ar" ? "شارك الرمز مع فريقك ثم ابدأوا عندما تكونون جاهزين." : "Share the code with your team, then begin when ready."}</p><div className="quiz-roster">{online.players.map((player) => <div key={player.id}><span>{player.nickname.slice(0, 1)}</span><b>{player.nickname}</b>{player.isHost && <small>{t.host}</small>}<i /></div>)}</div>{online.self.isHost ? <button className="quiz-primary" disabled={busy || online.players.length < 2} onClick={() => void onlineAction("start")}><Play size={18} />{t.startGame}</button> : <p className="quiz-wait"><Clock3 size={16} />{language === "ar" ? "بانتظار مدير الغرفة…" : "Waiting for the room host…"}</p>}{online.players.length < 2 && <small className="quiz-warning">{t.needPlayers}</small>}</div></section>}

    {screen === "game" && <section className="quiz-room quiz-game-room">{(local || online) && <GameHeader language={language} t={t} local={local} online={online} remaining={remaining} onPause={() => setPaused(true)} />}{local && <LocalBoard game={local} t={t} language={language} player={activeLocalPlayer} onReady={localReady} onAnswer={answerLocal} onPass={passLocal} onChange={changeLocal} onAdvance={advanceLocal} onRestart={startLocal} onBack={onBack} />}{online && <OnlineBoard snapshot={online} t={t} language={language} question={privateQuestion} remaining={remaining} busy={busy} current={onlineCurrent} canAdvance={onlineCanAdvance} onAction={onlineAction} onRestart={() => { setScreen("setup"); setOnline(null); setCode(""); setToken(""); }} onBack={onBack} />}</section>}

    {paused && <div className="quiz-pause-overlay"><div><Pause size={32} /><p className="quiz-kicker">QUIZ PAUSED</p><h2>{t.paused}</h2><button className="quiz-primary" onClick={() => setPaused(false)}><Play size={18} />{t.resume}</button></div></div>}
  </main>;
}

function GameHeader({ language, t, local, online, remaining, onPause }: { language: Language; t: (typeof text)[Language]; local: LocalGame | null; online: OnlineSnapshot | null; remaining: number; onPause: () => void }) {
  const round = local?.round ?? online?.game?.roundNumber ?? 0; const total = local?.settings.rounds ?? online?.game?.totalRounds ?? 0;
  return <div className="quiz-game-top"><div><p>{t.title}</p><b>{language === "ar" ? `الجولة ${round} من ${total}` : `Round ${round} of ${total}`}</b></div>{(local?.status === "question" || online?.game?.status === "question") && <div className={`quiz-timer ${remaining <= 5 ? "urgent" : ""}`}><Timer size={16} /><b>{remaining}</b></div>}<button onClick={onPause}><Pause size={16} /></button></div>;
}

function LocalBoard({ game, t, language, player, onReady, onAnswer, onPass, onChange, onAdvance, onRestart, onBack }: { game: LocalGame; t: (typeof text)[Language]; language: Language; player?: Player; onReady: () => void; onAnswer: (value: string) => void; onPass: () => void; onChange: () => void; onAdvance: () => void; onRestart: () => void; onBack: () => void }) {
  if (!player) return null;
  if (game.status === "handoff") return <QuizStage icon={<UserRound />} kicker={t.turn} title={`${t.passPhone} ${player.nickname}`} description={t.questionPrivate}><div className="quiz-player-emblem">{player.nickname.slice(0, 1)}</div><button className="quiz-primary" onClick={onReady}><Play size={18} />{t.ready}</button><small className="quiz-private-note"><Lightbulb size={14} />{t.localHint}</small></QuizStage>;
  if (game.status === "question" && game.question) return <QuestionStage t={t} language={language} player={player} question={game.question} changeUsed={Boolean(game.changes[player.id])} onAnswer={onAnswer} onPass={onPass} onChange={onChange} />;
  if (game.status === "result" && game.result) return <ResultStage t={t} language={language} result={game.result} player={player} canAdvance onAdvance={onAdvance} />;
  if (game.status === "roundResult") return <RoundStage t={t} language={language} players={game.players} stats={game.stats} round={game.round} onNext={onAdvance} />;
  return <FinalStage t={t} language={language} players={game.players} stats={game.stats} onRestart={onRestart} onBack={onBack} />;
}

function OnlineBoard({ snapshot, t, language, question, busy, current, canAdvance, onAction, onRestart, onBack }: { snapshot: OnlineSnapshot; t: (typeof text)[Language]; language: Language; question: PrivateQuestion | null; remaining: number; busy: boolean; current?: Player; canAdvance: boolean; onAction: (action: string, extra?: Record<string, unknown>) => Promise<void>; onRestart: () => void; onBack: () => void }) {
  const game = snapshot.game;
  if (!game) return null;
  if (game.status === "question") {
    if (game.currentPlayerId === snapshot.self.id) {
      if (!question) return <QuizStage icon={<Brain />} kicker={t.turn} title={t.waitingQuestion} description={t.questionPrivate}><div className="quiz-loader" /></QuizStage>;
      const changed = game.currentPlayerChangeUsed;
      return <QuestionStage t={t} language={language} player={snapshot.self} question={question} changeUsed={changed} onAnswer={(answer) => void onAction("answer", { answer })} onPass={() => void onAction("pass")} onChange={() => void onAction("change")} busy={busy} />;
    }
    return <QuizStage icon={<Clock3 />} kicker={t.turn} title={`${t.waitTurn} ${current?.nickname ?? "…"}`} description={t.onlineHint}><div className="quiz-player-emblem muted">{current?.nickname.slice(0, 1)}</div><Leaderboard players={snapshot.players} stats={game.stats} language={language} t={t} compact /></QuizStage>;
  }
  if (game.status === "result" && game.result) return <ResultStage t={t} language={language} result={game.result} player={snapshot.players.find((item) => item.id === game.result?.playerId) ?? snapshot.self} canAdvance={canAdvance} onAdvance={() => void onAction("next")} />;
  if (game.status === "roundResult") return <RoundStage t={t} language={language} players={snapshot.players} stats={game.stats} round={game.roundNumber} onNext={canAdvance ? () => void onAction("next") : undefined} />;
  if (game.status === "finished") return <FinalStage t={t} language={language} players={snapshot.players} stats={game.stats} onRestart={onRestart} onBack={onBack} />;
  return <QuizStage icon={<Brain />} kicker={t.kicker} title={t.waiting} description="…"><div className="quiz-loader" /></QuizStage>;
}

function QuestionStage({ t, language, player, question, changeUsed, onAnswer, onPass, onChange, busy = false }: { t: (typeof text)[Language]; language: Language; player: Player; question: { text: string; choices: string[]; category: string; difficulty: string }; changeUsed: boolean; onAnswer: (answer: string) => void; onPass: () => void; onChange: () => void; busy?: boolean }) {
  return <QuizStage icon={<Brain />} kicker={`${t.turn} ${player.nickname}`} title={question.text} description={`${categoryName(question.category, language)} · ${question.difficulty}`}><div className="quiz-answer-grid">{question.choices.map((choice) => <button key={choice} disabled={busy} onClick={() => onAnswer(choice)}><span>{choice}</span><Check size={17} /></button>)}</div><div className="quiz-question-actions"><button className="quiz-pass" disabled={busy} onClick={onPass}><SkipForward size={17} />{t.pass}</button><button className="quiz-change" disabled={busy || changeUsed} onClick={onChange}><RefreshCw size={16} />{changeUsed ? t.changeUsed : `${t.change} ×1`}</button></div></QuizStage>;
}

function ResultStage({ t, language, result, player, canAdvance, onAdvance }: { t: (typeof text)[Language]; language: Language; result: { status: "correct" | "incorrect" | "passed" | "timedOut"; correctAnswer: string; questionText: string }; player: Player; canAdvance: boolean; onAdvance: () => void }) {
  const correct = result.status === "correct"; const heading = correct ? t.correct : result.status === "passed" ? t.passed : result.status === "timedOut" ? t.timeUp : t.incorrect;
  return <QuizStage icon={correct ? <Trophy /> : <Lightbulb />} kicker={`${t.turn} ${player.nickname}`} title={heading} description={result.questionText}><div className={`quiz-result-card ${correct ? "correct" : ""}`}><span>{t.correctAnswer}</span><b>{result.correctAnswer}</b>{correct && <small>+10 {t.score}</small>}</div>{canAdvance ? <button className="quiz-primary" onClick={onAdvance}><ChevronLeft size={18} />{t.next}</button> : <p className="quiz-wait"><Clock3 size={16} />{language === "ar" ? "بانتظار الدور التالي…" : "Waiting for the next turn…"}</p>}</QuizStage>;
}

function RoundStage({ t, language, players, stats, round, onNext }: { t: (typeof text)[Language]; language: Language; players: Player[]; stats: Record<string, Stat>; round: number; onNext?: () => void }) { return <QuizStage icon={<Medal />} kicker={language === "ar" ? `الجولة ${round}` : `Round ${round}`} title={t.roundDone} description={language === "ar" ? "هذه حصيلة الجولة قبل أن تبدأوا من جديد." : "Here is the round score before you begin again."}><Leaderboard players={players} stats={stats} language={language} t={t} />{onNext ? <button className="quiz-primary" onClick={onNext}><Play size={18} />{t.nextRound}</button> : <p className="quiz-wait"><Clock3 size={16} />{language === "ar" ? "بانتظار مدير الغرفة…" : "Waiting for the host…"}</p>}</QuizStage>; }
function FinalStage({ t, language, players, stats, onRestart, onBack }: { t: (typeof text)[Language]; language: Language; players: Player[]; stats: Record<string, Stat>; onRestart: () => void; onBack: () => void }) { return <QuizStage icon={<Trophy />} kicker="FINAL RESULTS" title={t.gameOver} description={language === "ar" ? "أحسنتم! هذه لوحة الأبطال النهائية." : "Great game! Here is the final champions board."}><Leaderboard players={players} stats={stats} language={language} t={t} /><div className="quiz-final-actions"><button className="quiz-primary" onClick={onRestart}><RefreshCw size={17} />{t.playAgain}</button><button className="quiz-back-link" onClick={onBack}>{t.back}</button></div></QuizStage>; }
function QuizStage({ icon, kicker, title, description, children }: { icon: React.ReactNode; kicker: string; title: string; description: string; children: React.ReactNode }) { return <div className="quiz-stage"><div className="quiz-stage-icon">{icon}</div><p className="quiz-kicker">{kicker}</p><h1>{title}</h1><p>{description}</p><div className="quiz-stage-content">{children}</div></div>; }
function Leaderboard({ players, stats, language, t, compact = false }: { players: Player[]; stats: Record<string, Stat>; language: Language; t: (typeof text)[Language]; compact?: boolean }) { return <div className={`quiz-leaderboard ${compact ? "compact" : ""}`}><div className="quiz-board-title"><Trophy size={17} />{t.leaderboard}</div>{[...players].sort((a, b) => b.score - a.score).map((player, index) => { const stat = stats[player.id] ?? emptyStats(); return <div className="quiz-score-row" key={player.id}><span>{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}</span><b>{player.nickname}</b><em>{pluralScore(player.score, language)}</em>{!compact && <small>{t.correctShort} {stat.correct} · {t.wrongShort} {stat.incorrect} · {t.passShort} {stat.passed} · {t.changeShort} {stat.changed}</small>}</div>; })}</div>; }
