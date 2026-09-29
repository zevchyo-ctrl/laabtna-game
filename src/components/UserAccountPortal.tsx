"use client";

import { useState } from "react";
import {
  Calendar,
  Crown,
  History,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Play,
  PlusCircle,
  Send,
  Sparkles,
  Trophy,
  User,
  UserPlus,
  X,
} from "lucide-react";
import type {
  ClientAccessState,
  ClientGameResult,
  ClientUnfinishedSession,
  ClientUser,
} from "@/lib/platform-client";

export function UserProfileModal({
  language = "ar",
  initialTab = "profile",
  user,
  results,
  unfinishedGames,
  access,
  onClose,
  onRefresh,
  onContinueGame,
  onStartNewGame,
}: {
  language?: "ar" | "en";
  initialTab?: "login" | "register" | "profile" | "history" | "continue";
  user: ClientUser | null;
  results: ClientGameResult[];
  unfinishedGames: ClientUnfinishedSession[];
  access: ClientAccessState;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onContinueGame: (session: ClientUnfinishedSession) => void;
  onStartNewGame: (gameKey: string) => void;
}) {
  const [authTab, setAuthTab] = useState<"login" | "register">(
    initialTab === "register" ? "register" : "login",
  );
  const [viewTab, setViewTab] = useState<"profile" | "history" | "continue">(
    initialTab === "history" || initialTab === "continue" ? initialTab : "profile",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedResult, setSelectedResult] = useState<ClientGameResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isAr = language === "ar";

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: authTab,
          email,
          password,
          displayName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر إتمام العملية");
        return;
      }
      setEmail("");
      setPassword("");
      setDisplayName("");
      await onRefresh();
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const requestPremium = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "requestSubscription" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر إرسال الطلب");
        return;
      }
      setMessage(
        data.alreadyPending
          ? "لديك طلب اشتراك قيد المراجعة بالفعل. يمكنك التواصل مع المشرف عبر Telegram."
          : "تم تسجيل طلب الاشتراك بنجاح! تواصل الآن مع المشرف عبر Telegram لتفعيله.",
      );
      await onRefresh();
    } catch {
      setError("تعذر إرسال طلب الاشتراك");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="platform-modal-backdrop" dir={isAr ? "rtl" : "ltr"}>
      <div className="platform-user-modal">
        <header className="platform-admin-header">
          <div className="platform-admin-brand">
            <span><User size={18} /></span>
            <div>
              <b>{isAr ? "حسابي · LAABTNA" : "My Account · LAABTNA"}</b>
              <small>{isAr ? "حساب اختياري لحفظ النتائج ومتابعة الألعاب" : "Optional account for game history & progress"}</small>
            </div>
          </div>
          <button className="platform-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        {error && <div className="platform-alert-error">{error}</div>}
        {message && <div className="platform-alert-ok">{message}</div>}

        {!user ? (
          <div className="platform-auth-container">
            <div className="platform-auth-tabs">
              <button className={authTab === "login" ? "active" : ""} onClick={() => setAuthTab("login")}>
                <LogIn size={15} /> {isAr ? "تسجيل الدخول" : "Login"}
              </button>
              <button className={authTab === "register" ? "active" : ""} onClick={() => setAuthTab("register")}>
                <UserPlus size={15} /> {isAr ? "إنشاء حساب" : "Register"}
              </button>
            </div>

            <form className="platform-auth-form" onSubmit={submitAuth}>
              {authTab === "register" && (
                <label>
                  <span>{isAr ? "الاسم المعروض" : "Display Name"}</span>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={isAr ? "مثال: أحمد" : "e.g. Ahmed"}
                    maxLength={28}
                  />
                </label>
              )}
              <label>
                <span>{isAr ? "البريد الإلكتروني" : "Email"}</span>
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </label>
              <label>
                <span>{isAr ? "كلمة المرور" : "Password"}</span>
                <input
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                />
              </label>
              <button type="submit" className="platform-btn-gold" disabled={busy}>
                {authTab === "login"
                  ? isAr ? "دخول إلى حسابي" : "Sign In"
                  : isAr ? "إنشاء حساب جديد" : "Create Account"}
              </button>
            </form>
          </div>
        ) : (
          <div className="platform-profile-body">
            <div className="platform-auth-tabs">
              <button className={viewTab === "profile" ? "active" : ""} onClick={() => setViewTab("profile")}>
                <User size={15} /> {isAr ? "حسابي" : "Profile"}
              </button>
              <button className={viewTab === "history" ? "active" : ""} onClick={() => setViewTab("history")}>
                <History size={15} /> {isAr ? `📋 سجل النتائج (${results.length})` : `📋 Results (${results.length})`}
              </button>
              <button className={viewTab === "continue" ? "active" : ""} onClick={() => setViewTab("continue")}>
                <Play size={15} /> {isAr ? `▶️ متابعة اللعبة (${unfinishedGames.length})` : `▶️ Continue (${unfinishedGames.length})`}
              </button>
            </div>

            {viewTab === "profile" && (
              <div className="platform-profile-section">
                <div className="platform-profile-card">
                  <div className="platform-avatar-circle">{user.displayName.slice(0, 1)}</div>
                  <div>
                    <h3>{user.displayName}</h3>
                    <p><Mail size={13} /> {user.email}</p>
                    <small><Calendar size={12} /> {isAr ? "تاريخ الانضمام:" : "Joined:"} {new Date(user.createdAt).toLocaleDateString(isAr ? "ar" : "en")}</small>
                  </div>
                  <span className={user.isPremium ? "badge-prem" : "badge-free"}>
                    {user.isPremium ? "⭐ Premium" : "🆓 Free"}
                  </span>
                </div>

                <div className="platform-stats-grid">
                  <div className="platform-stat-card">
                    <span>{isAr ? "عدد الألعاب الملغوبة" : "Games Played"}</span>
                    <b>{user.gamesPlayed}</b>
                  </div>
                  <div className="platform-stat-card gold">
                    <span>{isAr ? "أفضل نتيجة" : "Best Score"}</span>
                    <b>{user.bestScore}</b>
                  </div>
                  <div className="platform-stat-card teal">
                    <span>{isAr ? "حالة الاشتراك" : "Subscription"}</span>
                    <b>{user.isPremium ? "Premium ⭐" : "Free 🆓"}</b>
                  </div>
                </div>

                {!user.isPremium && (
                  <div className="platform-upgrade-card">
                    <div>
                      <b>⭐ طلب الاشتراك في الميزات المتقدمة</b>
                      <small>
                        {user.latestRequestStatus === "Pending"
                          ? "حالة طلبك الحالي: قيد المراجعة (Pending)"
                          : user.latestRequestStatus === "Rejected"
                          ? "حالة آخر طلب: مرفوض — يمكنك إرسال طلب جديد أو مراسلة المشرف."
                          : "احصل على صلاحية الوصول الكامل لكل الألعاب والتصنيفات والميزات المتقدمة."}
                      </small>
                    </div>
                    <div className="platform-upgrade-actions">
                      <button className="platform-btn-gold" disabled={busy} onClick={() => void requestPremium()}>
                        <Sparkles size={15} /> ⭐ طلب الاشتراك
                      </button>
                      {access.telegramUrl && (
                        <a
                          href={access.telegramUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="platform-btn-telegram"
                        >
                          <Send size={15} /> 📩 التواصل مع المشرف عبر Telegram
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <button className="platform-btn-danger" disabled={busy} onClick={() => void handleLogout()}>
                  <LogOut size={15} /> {isAr ? "تسجيل الخروج" : "Logout"}
                </button>
              </div>
            )}

            {viewTab === "history" && (
              <div className="platform-profile-section">
                {results.length === 0 ? (
                  <div className="platform-empty-history-box">
                    <p className="platform-empty-note">
                      {isAr ? "لا توجد نتائج سابقة حتى الآن" : "No previous game results yet"}
                    </p>
                    <button
                      className="platform-btn-gold"
                      onClick={() => {
                        onClose();
                        onStartNewGame("secret");
                      }}
                    >
                      🎮 {isAr ? "ابدأ لعبة" : "Start a Game"}
                    </button>
                  </div>
                ) : (
                  <div className="platform-user-list">
                    {results.map((r) => (
                      <div key={r.id} className="platform-user-card">
                        <div>
                          <b>{r.gameName}</b>
                          <small>
                            {new Date(r.createdAt).toLocaleString(isAr ? "ar" : "en")} ·{" "}
                            {r.mode === "online" ? (isAr ? "أونلاين" : "Online") : (isAr ? "نفس الهاتف" : "Same Phone")}
                          </small>
                          <div className="platform-badges-row">
                            <span className="badge-prem"><Trophy size={12} /> {r.score} {isAr ? "نقطة" : "pts"}</span>
                            <span>{isAr ? `الجولات: ${r.rounds}` : `Rounds: ${r.rounds}`}</span>
                            <span>{r.rankLabel}</span>
                          </div>
                        </div>
                        <button
                          className="platform-btn-ghost"
                          onClick={() => setSelectedResult(selectedResult?.id === r.id ? null : r)}
                        >
                          {selectedResult?.id === r.id ? (isAr ? "إخفاء التفاصيل" : "Hide") : (isAr ? "فتح النتيجة" : "Open Result")}
                        </button>
                        {selectedResult?.id === r.id && (
                          <div className="platform-user-history-drawer">
                            <b>{isAr ? "تفاصيل وإحصاءات الجولة" : "Result Details"}</b>
                            <pre className="platform-stats-pre">{JSON.stringify(r.stats, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {viewTab === "continue" && (
              <div className="platform-profile-section">
                {unfinishedGames.length === 0 ? (
                  <p className="platform-empty-note">
                    {isAr ? "لا توجد ألعاب غير مكتملة حاليًا. ابدأ لعبة جديدة في أي وقت!" : "No unfinished games right now."}
                  </p>
                ) : (
                  <div className="platform-user-list">
                    {unfinishedGames.map((sess) => (
                      <div key={sess.id} className="platform-user-card">
                        <div>
                          <b>{sess.gameName}</b>
                          <small>
                            {isAr ? `الجولة ${sess.roundNumber} من ${sess.totalRounds}` : `Round ${sess.roundNumber}/${sess.totalRounds}`} ·{" "}
                            {isAr ? `النقاط: ${sess.score}` : `Score: ${sess.score}`}
                          </small>
                        </div>
                        <div className="platform-user-actions">
                          <button className="platform-btn-gold" onClick={() => onContinueGame(sess)}>
                            <Play size={14} /> ▶️ متابعة اللعبة
                          </button>
                          <button className="platform-btn-ghost" onClick={() => onStartNewGame(sess.gameKey)}>
                            <PlusCircle size={14} /> 🆕 لعبة جديدة
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PremiumLockModal({
  user,
  telegramUrl,
  onClose,
  onOpenAccount,
  onRefresh,
}: {
  user: ClientUser | null;
  telegramUrl: string;
  onClose: () => void;
  onOpenAccount: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleRequest = async () => {
    if (!user) {
      onClose();
      onOpenAccount();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "requestSubscription" }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(
          data.alreadyPending
            ? "طلبك مسجل بالفعل وقيد المراجعة لدى المشرف."
            : "تم إرسال طلب الاشتراك بنجاح! تواصل مع المشرف عبر Telegram لتفعيله فورًا.",
        );
        await onRefresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="platform-modal-backdrop" dir="rtl">
      <div className="platform-lock-modal">
        <button className="platform-close-btn lock-close" onClick={onClose} aria-label="إغلاق">
          <X size={18} />
        </button>
        <div className="platform-lock-badge"><Lock size={28} /></div>
        <h2>🔒 هذه الميزة متاحة ضمن الميزات المتقدمة</h2>
        <p>
          للوصول إلى الألعاب والتصنيفات والميزات المتقدمة، اطلب تفعيل اشتراك{" "}
          <b>Premium ⭐</b> لحسابك وتواصل مع المشرف.
        </p>

        {feedback && <div className="platform-alert-ok">{feedback}</div>}

        <div className="platform-lock-actions">
          <button className="platform-btn-gold" disabled={busy} onClick={() => void handleRequest()}>
            <Crown size={17} /> ⭐ طلب الاشتراك
          </button>
          {telegramUrl && (
            <a
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
              className="platform-btn-telegram"
            >
              <Send size={16} /> 📩 التواصل مع المشرف عبر Telegram
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
