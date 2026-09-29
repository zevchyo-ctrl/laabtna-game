"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Check,
  Crown,
  Gamepad2,
  Lock,
  LogOut,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

type AdminSection =
  | "dashboard"
  | "users"
  | "games"
  | "features"
  | "subscriptions"
  | "requests"
  | "statistics"
  | "settings"
  | "seo";

type GlobalMode = "EVERYTHING_FREE" | "MIXED" | "PREMIUM";

type AdminUserRow = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  isPremium: boolean;
  gamesPlayed: number;
  bestScore: number;
  pendingRequest: boolean;
  latestRequestStatus: string | null;
  history: Array<{
    id: string;
    gameName: string;
    mode: string;
    score: number;
    rounds: number;
    rankLabel: string;
    createdAt: string;
  }>;
};

type AdminRequestRow = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  status: string;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
};

type AdminPayload = {
  authenticated: boolean;
  stats: {
    totalUsers: number;
    premiumUsers: number;
    freeUsers: number;
    pendingRequests: number;
    totalGamesPlayed: number;
  };
  globalMode: GlobalMode;
  telegramUrl: string;
  seo?: {
    title: string;
    description: string;
    keywords: string;
    canonicalUrl: string;
    ogImage: string;
    googleVerification?: string;
    bingVerification?: string;
    secretTitle?: string;
    secretDesc?: string;
    quizTitle?: string;
    quizDesc?: string;
    sceneTitle?: string;
    sceneDesc?: string;
    rushTitle?: string;
    rushDesc?: string;
  };
  games: Array<{ gameKey: string; nameAr: string; nameEn: string; tier: string }>;
  categories: Array<{ categoryKey: string; gameKey: string; nameAr: string; nameEn: string; tier: string }>;
  features: Array<{ featureKey: string; nameAr: string; nameEn: string; descriptionAr: string; tier: string }>;
  users: AdminUserRow[];
  requests: AdminRequestRow[];
};

export default function AdminDashboardModal({
  onClose,
  onConfigChanged,
}: {
  onClose: () => void;
  onConfigChanged: () => void;
}) {
  const [passcode, setPasscode] = useState("");
  const [data, setData] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "free" | "premium" | "pending">("all");
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [telegramInput, setTelegramInput] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoCanonical, setSeoCanonical] = useState("");
  const [seoOgImage, setSeoOgImage] = useState("");
  const [googleVerif, setGoogleVerif] = useState("");
  const [bingVerif, setBingVerif] = useState("");
  const [secretTitle, setSecretTitle] = useState("");
  const [secretDesc, setSecretDesc] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [sceneTitle, setSceneTitle] = useState("");
  const [sceneDesc, setSceneDesc] = useState("");
  const [rushTitle, setRushTitle] = useState("");
  const [rushDesc, setRushDesc] = useState("");
  const [categoryGameFilter, setCategoryGameFilter] = useState<string>("all");
  const [newFeatKey, setNewFeatKey] = useState("");
  const [newFeatAr, setNewFeatAr] = useState("");
  const [newFeatDesc, setNewFeatDesc] = useState("");

  const loadAdmin = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin", { method: "GET" });
      if (res.ok) {
        const payload = (await res.json()) as AdminPayload;
        setData(payload);
        setTelegramInput(payload.telegramUrl || "");
        if (payload.seo) {
          setSeoTitle(payload.seo.title || "");
          setSeoDesc(payload.seo.description || "");
          setSeoKeywords(payload.seo.keywords || "");
          setSeoCanonical(payload.seo.canonicalUrl || "");
          setSeoOgImage(payload.seo.ogImage || "");
          setGoogleVerif(payload.seo.googleVerification || "");
          setBingVerif(payload.seo.bingVerification || "");
          setSecretTitle(payload.seo.secretTitle || "");
          setSecretDesc(payload.seo.secretDesc || "");
          setQuizTitle(payload.seo.quizTitle || "");
          setQuizDesc(payload.seo.quizDesc || "");
          setSceneTitle(payload.seo.sceneTitle || "");
          setSceneDesc(payload.seo.sceneDesc || "");
          setRushTitle(payload.seo.rushTitle || "");
          setRushDesc(payload.seo.rushDesc || "");
        }
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdmin();
  }, [loadAdmin]);

  const adminCommand = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "تعذر تنفيذ العملية");
        return;
      }
      if (payload.action === "logout") {
        setData(null);
        onClose();
        return;
      }
      const adminData = body as AdminPayload;
      setData(adminData);
      setTelegramInput(adminData.telegramUrl || "");
      if (adminData.seo) {
        setSeoTitle(adminData.seo.title || "");
        setSeoDesc(adminData.seo.description || "");
        setSeoKeywords(adminData.seo.keywords || "");
        setSeoCanonical(adminData.seo.canonicalUrl || "");
        setSeoOgImage(adminData.seo.ogImage || "");
        setGoogleVerif(adminData.seo.googleVerification || "");
        setBingVerif(adminData.seo.bingVerification || "");
        setSecretTitle(adminData.seo.secretTitle || "");
        setSecretDesc(adminData.seo.secretDesc || "");
        setQuizTitle(adminData.seo.quizTitle || "");
        setQuizDesc(adminData.seo.quizDesc || "");
        setSceneTitle(adminData.seo.sceneTitle || "");
        setSceneDesc(adminData.seo.sceneDesc || "");
        setRushTitle(adminData.seo.rushTitle || "");
        setRushDesc(adminData.seo.rushDesc || "");
      }
      onConfigChanged();
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setBusy(false);
    }
  };

  const filteredUsers = (data?.users ?? []).filter((u) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q || u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (filter === "free") return !u.isPremium;
    if (filter === "premium") return u.isPremium;
    if (filter === "pending") return u.pendingRequest;
    return true;
  });

  const filteredCategories = (data?.categories ?? []).filter((c) =>
    categoryGameFilter === "all" ? true : c.gameKey === categoryGameFilter,
  );

  return (
    <div className="platform-modal-backdrop" dir="rtl">
      <div className="platform-admin-shell">
        <header className="platform-admin-header">
          <div className="platform-admin-brand">
            <span><ShieldCheck size={19} /></span>
            <div>
              <b>لوحة تحكم المشرف · LAABTNA</b>
              <small>إدارة الصلاحيات والاشتراكات والمستخدمين</small>
            </div>
          </div>
          <div className="platform-admin-top-actions">
            {data?.authenticated && (
              <button
                className="platform-btn-ghost"
                disabled={busy}
                onClick={() => void adminCommand({ action: "logout" })}
              >
                <LogOut size={15} /> خروج المشرف
              </button>
            )}
            <button className="platform-close-btn" onClick={onClose} aria-label="إغلاق">
              <X size={18} />
            </button>
          </div>
        </header>

        {error && <div className="platform-alert-error">{error}</div>}

        {loading ? (
          <div className="platform-admin-login-box">
            <p>جارٍ التحقق من جلسة المشرف...</p>
          </div>
        ) : !data?.authenticated ? (
          <form
            className="platform-admin-login-box"
            onSubmit={(e) => {
              e.preventDefault();
              void adminCommand({ action: "login", passcode });
            }}
          >
            <div className="platform-lock-badge"><Lock size={26} /></div>
            <h2>الدخول السري للمشرف</h2>
            <p>أدخل رمز المشرف للوصول إلى لوحة التحكم الكاملة.</p>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="رمز المشرف"
              autoFocus
            />
            <button type="submit" className="platform-btn-gold" disabled={busy || !passcode.trim()}>
              <ShieldCheck size={17} /> دخول لوحة التحكم
            </button>
          </form>
        ) : (
          <div className="platform-admin-body">
            <nav className="platform-admin-nav">
              <button className={section === "dashboard" ? "active" : ""} onClick={() => setSection("dashboard")}>
                📊 لوحة القيادة
              </button>
              <button className={section === "users" ? "active" : ""} onClick={() => setSection("users")}>
                👥 المستخدمون ({data.stats.totalUsers})
              </button>
              <button className={section === "games" ? "active" : ""} onClick={() => setSection("games")}>
                🎮 صلاحيات الألعاب والتصنيفات
              </button>
              <button className={section === "features" ? "active" : ""} onClick={() => setSection("features")}>
                🔒 الميزات المتقدمة
              </button>
              <button className={section === "subscriptions" ? "active" : ""} onClick={() => setSection("subscriptions")}>
                ⭐ الاشتراكات ({data.stats.premiumUsers})
              </button>
              <button className={section === "requests" ? "active" : ""} onClick={() => setSection("requests")}>
                📋 طلبات الاشتراك ({data.stats.pendingRequests})
              </button>
              <button className={section === "statistics" ? "active" : ""} onClick={() => setSection("statistics")}>
                📈 الإحصاءات
              </button>
              <button className={section === "settings" ? "active" : ""} onClick={() => setSection("settings")}>
                ⚙️ الإعدادات
              </button>
              <button className={section === "seo" ? "active" : ""} onClick={() => setSection("seo")}>
                🔎 SEO
              </button>
            </nav>

            <div className="platform-admin-content">
              {section === "dashboard" && (
                <div className="platform-admin-section">
                  <div className="platform-mode-banner">
                    <div>
                      <b>الوضع العام للمنصة (Global Access Mode)</b>
                      <small>تحكم فوري بجميع الألعاب والتصنيفات والميزات بدون إعادة نشر</small>
                    </div>
                    <div className="platform-mode-buttons">
                      <button
                        className={data.globalMode === "EVERYTHING_FREE" ? "selected free" : ""}
                        disabled={busy}
                        onClick={() => void adminCommand({ action: "setGlobalMode", globalMode: "EVERYTHING_FREE" })}
                      >
                        🟢 كل شيء مجاني (EVERYTHING FREE)
                      </button>
                      <button
                        className={data.globalMode === "MIXED" ? "selected mixed" : ""}
                        disabled={busy}
                        onClick={() => void adminCommand({ action: "setGlobalMode", globalMode: "MIXED" })}
                      >
                        🟡 الوضع المختلط (MIXED MODE)
                      </button>
                      <button
                        className={data.globalMode === "PREMIUM" ? "selected premium" : ""}
                        disabled={busy}
                        onClick={() => void adminCommand({ action: "setGlobalMode", globalMode: "PREMIUM" })}
                      >
                        🔒 وضع المشتركين (PREMIUM MODE)
                      </button>
                    </div>
                  </div>

                  <div className="platform-stats-grid">
                    <div className="platform-stat-card">
                      <Users size={18} />
                      <span>إجمالي الحسابات</span>
                      <b>{data.stats.totalUsers}</b>
                    </div>
                    <div className="platform-stat-card gold">
                      <Crown size={18} />
                      <span>مشتركو Premium</span>
                      <b>{data.stats.premiumUsers}</b>
                    </div>
                    <div className="platform-stat-card warn">
                      <Sparkles size={18} />
                      <span>طلبات اشتراك معلقة</span>
                      <b>{data.stats.pendingRequests}</b>
                    </div>
                    <div className="platform-stat-card teal">
                      <Gamepad2 size={18} />
                      <span>مرات اللعب المسجلة</span>
                      <b>{data.stats.totalGamesPlayed}</b>
                    </div>
                  </div>
                </div>
              )}

              {section === "users" && (
                <div className="platform-admin-section">
                  <div className="platform-toolbar">
                    <div className="platform-search-box">
                      <Search size={15} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ابحث بالبريد الإلكتروني أو الاسم..."
                      />
                    </div>
                    <div className="platform-filter-pills">
                      <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>الكل</button>
                      <button className={filter === "free" ? "active" : ""} onClick={() => setFilter("free")}>🆓 مجاني</button>
                      <button className={filter === "premium" ? "active" : ""} onClick={() => setFilter("premium")}>⭐ Premium</button>
                      <button className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>⏳ طلب معلق</button>
                    </div>
                  </div>

                  <div className="platform-user-list">
                    {filteredUsers.map((u) => (
                      <div key={u.id} className="platform-user-card">
                        <div>
                          <b>{u.displayName}</b>
                          <small>{u.email}</small>
                          <div className="platform-badges-row">
                            <span className={u.isPremium ? "badge-prem" : "badge-free"}>
                              {u.isPremium ? "⭐ Premium" : "🆓 Free"}
                            </span>
                            {u.pendingRequest && <span className="badge-pending">📋 طلب معلق</span>}
                            <span>الألعاب: {u.gamesPlayed}</span>
                            <span>أعلى نتيجة: {u.bestScore}</span>
                          </div>
                        </div>
                        <div className="platform-user-actions">
                          <button
                            className="platform-btn-ghost"
                            onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                          >
                            {selectedUser?.id === u.id ? "إخفاء السجل" : "عرض السجل"}
                          </button>
                          {u.isPremium ? (
                            <button
                              className="platform-btn-danger"
                              disabled={busy}
                              onClick={() => void adminCommand({ action: "setUserPremium", userId: u.id, isPremium: false })}
                            >
                              إلغاء Premium
                            </button>
                          ) : (
                            <button
                              className="platform-btn-gold"
                              disabled={busy}
                              onClick={() => void adminCommand({ action: "setUserPremium", userId: u.id, isPremium: true })}
                            >
                              تفعيل Premium
                            </button>
                          )}
                        </div>
                        {selectedUser?.id === u.id && (
                          <div className="platform-user-history-drawer">
                            <b>سجل نتائج {u.displayName}</b>
                            {u.history.length === 0 ? (
                              <small>لا توجد نتائج مسجلة بعد.</small>
                            ) : (
                              u.history.map((h) => (
                                <div key={h.id} className="platform-mini-history-row">
                                  <span>{h.gameName} ({h.mode === "online" ? "أونلاين" : "محلي"})</span>
                                  <b>{h.score} نقطة · {h.rankLabel}</b>
                                  <small>{new Date(h.createdAt).toLocaleDateString("ar")}</small>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === "games" && (
                <div className="platform-admin-section">
                  <h3>🎮 التحكم بصلاحيات الألعاب الأربع</h3>
                  <div className="platform-access-grid">
                    {data.games.map((g) => (
                      <div key={g.gameKey} className="platform-access-item">
                        <div>
                          <b>{g.nameAr}</b>
                          <small>{g.nameEn}</small>
                        </div>
                        <div className="platform-tier-switch">
                          <button
                            className={g.tier === "FREE" ? "active-free" : ""}
                            disabled={busy}
                            onClick={() => void adminCommand({ action: "setGameTier", gameKey: g.gameKey, tier: "FREE" })}
                          >
                            FREE
                          </button>
                          <button
                            className={g.tier === "PREMIUM" ? "active-prem" : ""}
                            disabled={busy}
                            onClick={() => void adminCommand({ action: "setGameTier", gameKey: g.gameKey, tier: "PREMIUM" })}
                          >
                            🔒 PREMIUM
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="platform-section-divider" />
                  <div className="platform-toolbar">
                    <h3>📂 التحكم بصلاحيات التصنيفات</h3>
                    <div className="platform-filter-pills">
                      <button className={categoryGameFilter === "all" ? "active" : ""} onClick={() => setCategoryGameFilter("all")}>الكل</button>
                      <button className={categoryGameFilter === "secret" ? "active" : ""} onClick={() => setCategoryGameFilter("secret")}>الكلمة السرية</button>
                      <button className={categoryGameFilter === "quiz" ? "active" : ""} onClick={() => setCategoryGameFilter("quiz")}>الأسئلة العامة</button>
                      <button className={categoryGameFilter === "scene" ? "active" : ""} onClick={() => setCategoryGameFilter("scene")}>خمن المشهد</button>
                      <button className={categoryGameFilter === "rush" ? "active" : ""} onClick={() => setCategoryGameFilter("rush")}>التحدي السريع</button>
                    </div>
                  </div>

                  <div className="platform-access-grid compact">
                    {filteredCategories.map((c) => (
                      <div key={c.categoryKey} className="platform-access-item">
                        <div>
                          <b>{c.nameAr}</b>
                          <small>{c.gameKey}</small>
                        </div>
                        <div className="platform-tier-switch">
                          <button
                            className={c.tier === "FREE" ? "active-free" : ""}
                            disabled={busy}
                            onClick={() => void adminCommand({ action: "setCategoryTier", categoryKey: c.categoryKey, tier: "FREE" })}
                          >
                            FREE
                          </button>
                          <button
                            className={c.tier === "PREMIUM" ? "active-prem" : ""}
                            disabled={busy}
                            onClick={() => void adminCommand({ action: "setCategoryTier", categoryKey: c.categoryKey, tier: "PREMIUM" })}
                          >
                            PREMIUM
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === "features" && (
                <div className="platform-admin-section">
                  <h3>🔒 التحكم بالميزات المتقدمة</h3>
                  <div className="platform-access-grid">
                    {data.features.map((f) => (
                      <div key={f.featureKey} className="platform-access-item">
                        <div>
                          <b>{f.nameAr}</b>
                          <small>{f.descriptionAr || f.featureKey}</small>
                        </div>
                        <div className="platform-tier-switch">
                          <button
                            className={f.tier === "FREE" ? "active-free" : ""}
                            disabled={busy}
                            onClick={() => void adminCommand({ action: "setFeatureTier", featureKey: f.featureKey, tier: "FREE" })}
                          >
                            FREE
                          </button>
                          <button
                            className={f.tier === "PREMIUM" ? "active-prem" : ""}
                            disabled={busy}
                            onClick={() => void adminCommand({ action: "setFeatureTier", featureKey: f.featureKey, tier: "PREMIUM" })}
                          >
                            🔒 PREMIUM
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form
                    className="platform-add-feature-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newFeatKey.trim() || !newFeatAr.trim()) return;
                      void adminCommand({
                        action: "addFeature",
                        featureKey: newFeatKey,
                        nameAr: newFeatAr,
                        descriptionAr: newFeatDesc,
                        tier: "PREMIUM",
                      });
                      setNewFeatKey("");
                      setNewFeatAr("");
                      setNewFeatDesc("");
                    }}
                  >
                    <b>إضافة ميزة قابلة للتحكم مستقبلاً</b>
                    <div className="platform-form-row">
                      <input value={newFeatKey} onChange={(e) => setNewFeatKey(e.target.value)} placeholder="معرف الميزة (مثال: voice_pack)" />
                      <input value={newFeatAr} onChange={(e) => setNewFeatAr(e.target.value)} placeholder="الاسم بالعربية" />
                      <input value={newFeatDesc} onChange={(e) => setNewFeatDesc(e.target.value)} placeholder="وصف مختصر" />
                      <button type="submit" className="platform-btn-gold" disabled={busy}>إضافة</button>
                    </div>
                  </form>
                </div>
              )}

              {section === "subscriptions" && (
                <div className="platform-admin-section">
                  <h3>⭐ المشتركون الفعالون في Premium</h3>
                  <div className="platform-user-list">
                    {data.users.filter((u) => u.isPremium).length === 0 ? (
                      <p>لا يوجد مشتركو Premium حاليًا.</p>
                    ) : (
                      data.users
                        .filter((u) => u.isPremium)
                        .map((u) => (
                          <div key={u.id} className="platform-user-card">
                            <div>
                              <b>{u.displayName} ⭐</b>
                              <small>{u.email}</small>
                            </div>
                            <button
                              className="platform-btn-danger"
                              disabled={busy}
                              onClick={() => void adminCommand({ action: "setUserPremium", userId: u.id, isPremium: false })}
                            >
                              إلغاء الاشتراك
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

              {section === "requests" && (
                <div className="platform-admin-section">
                  <h3>📋 طلبات الاشتراك عبر Telegram</h3>
                  <div className="platform-user-list">
                    {data.requests.length === 0 ? (
                      <p>لا توجد طلبات اشتراك حتى الآن.</p>
                    ) : (
                      data.requests.map((r) => (
                        <div key={r.id} className="platform-user-card">
                          <div>
                            <b>{r.displayName}</b>
                            <small>{r.email} · {new Date(r.createdAt).toLocaleString("ar")}</small>
                            <div className="platform-badges-row">
                              <span
                                className={
                                  r.status === "Approved"
                                    ? "badge-prem"
                                    : r.status === "Rejected"
                                    ? "badge-danger"
                                    : "badge-pending"
                                }
                              >
                                {r.status === "Approved" ? "مقبول" : r.status === "Rejected" ? "مرفوض" : "قيد المراجعة (Pending)"}
                              </span>
                            </div>
                          </div>
                          <div className="platform-user-actions">
                            <button
                              className="platform-btn-gold"
                              disabled={busy || r.status === "Approved"}
                              onClick={() =>
                                void adminCommand({
                                  action: "decideRequest",
                                  requestId: r.id,
                                  decision: "Approved",
                                  adminNotes: "تم القبول وتفعيل البريميوم",
                                })
                              }
                            >
                              <Check size={14} /> قبول الاشتراك
                            </button>
                            <button
                              className="platform-btn-danger"
                              disabled={busy || r.status === "Rejected"}
                              onClick={() =>
                                void adminCommand({
                                  action: "decideRequest",
                                  requestId: r.id,
                                  decision: "Rejected",
                                  adminNotes: "تم رفض الطلب",
                                })
                              }
                            >
                              <X size={14} /> رفض الطلب
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {section === "statistics" && (
                <div className="platform-admin-section">
                  <h3><BarChart3 size={18} /> إحصاءات المنصة</h3>
                  <div className="platform-stats-grid">
                    <div className="platform-stat-card"><span>إجمالي المستخدمين</span><b>{data.stats.totalUsers}</b></div>
                    <div className="platform-stat-card gold"><span>مشتركو Premium</span><b>{data.stats.premiumUsers}</b></div>
                    <div className="platform-stat-card"><span>المستخدمون المجانيون</span><b>{data.stats.freeUsers}</b></div>
                    <div className="platform-stat-card warn"><span>الطلبات المعلقة</span><b>{data.stats.pendingRequests}</b></div>
                    <div className="platform-stat-card teal"><span>إجمالي الجولات المكتملة</span><b>{data.stats.totalGamesPlayed}</b></div>
                  </div>
                  <h4>أحدث الحسابات المسجلة</h4>
                  <div className="platform-user-list">
                    {data.users.slice(0, 6).map((u) => (
                      <div key={u.id} className="platform-mini-history-row">
                        <b>{u.displayName} ({u.email})</b>
                        <span>{u.isPremium ? "⭐ Premium" : "🆓 Free"}</span>
                        <small>{new Date(u.createdAt).toLocaleDateString("ar")}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === "settings" && (
                <div className="platform-admin-section">
                  <h3><Settings size={18} /> إعدادات التواصل مع المشرف</h3>
                  <form
                    className="platform-settings-box"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void adminCommand({ action: "setTelegramUrl", telegramUrl: telegramInput });
                    }}
                  >
                    <label>
                      <span>رابط حساب أو قناة المشرف على Telegram (ADMIN_TELEGRAM_URL)</span>
                      <input
                        dir="ltr"
                        value={telegramInput}
                        onChange={(e) => setTelegramInput(e.target.value)}
                        placeholder="https://t.me/your_admin_contact"
                      />
                    </label>
                    <button type="submit" className="platform-btn-gold" disabled={busy}>
                      <Send size={15} /> حفظ رابط Telegram
                    </button>
                  </form>
                </div>
              )}

              {section === "seo" && (
                <div className="platform-admin-section">
                  <h3>🔎 تهيئة محركات البحث (SEO & Metadata)</h3>
                  <form
                    className="platform-settings-box"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void adminCommand({
                        action: "setSeoSettings",
                        seo: {
                          title: seoTitle,
                          description: seoDesc,
                          keywords: seoKeywords,
                          canonicalUrl: seoCanonical,
                          ogImage: seoOgImage,
                          googleVerification: googleVerif,
                          bingVerification: bingVerif,
                          secretTitle,
                          secretDesc,
                          quizTitle,
                          quizDesc,
                          sceneTitle,
                          sceneDesc,
                          rushTitle,
                          rushDesc,
                        },
                      });
                    }}
                  >
                    <h4>إعدادات الموقع الرئيسية</h4>
                    <label>
                      <span>عنوان الموقع الرئيسي (Homepage Meta Title)</span>
                      <input
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        placeholder="لعبتنا | ألعاب جماعية أونلاين للأصدقاء بدون تسجيل"
                      />
                    </label>
                    <label>
                      <span>الوصف التعريفي العام (Meta Description)</span>
                      <input
                        value={seoDesc}
                        onChange={(e) => setSeoDesc(e.target.value)}
                        placeholder="لعبتنا جمعتنا — منصة ألعاب جماعية أونلاين للأصدقاء بدون تسجيل..."
                      />
                    </label>
                    <label>
                      <span>الكلمات المفتاحية العامة (Meta Keywords)</span>
                      <input
                        value={seoKeywords}
                        onChange={(e) => setSeoKeywords(e.target.value)}
                        placeholder="ألعاب جماعية أونلاين, ألعاب جماعية للأصدقاء, ألعاب بدون تسجيل..."
                      />
                    </label>
                    <label>
                      <span>الرابط الدائم المعتمد (Canonical URL)</span>
                      <input
                        dir="ltr"
                        value={seoCanonical}
                        onChange={(e) => setSeoCanonical(e.target.value)}
                        placeholder="https://laabtna.com"
                      />
                    </label>
                    <label>
                      <span>رابط صورة المشاركة الاجتماعية (Open Graph Image URL)</span>
                      <input
                        dir="ltr"
                        value={seoOgImage}
                        onChange={(e) => setSeoOgImage(e.target.value)}
                        placeholder="https://laabtna.com/images/laabtna-og.png"
                      />
                    </label>

                    <div className="platform-section-divider" />
                    <h4>أكواد التحقق من محركات البحث</h4>
                    <label>
                      <span>Google Search Console (google-site-verification)</span>
                      <input
                        dir="ltr"
                        value={googleVerif}
                        onChange={(e) => setGoogleVerif(e.target.value)}
                        placeholder="مثال: abc123def456_GoogleCode"
                      />
                    </label>
                    <label>
                      <span>Bing Webmaster Tools (msvalidate.01)</span>
                      <input
                        dir="ltr"
                        value={bingVerif}
                        onChange={(e) => setBingVerif(e.target.value)}
                        placeholder="مثال: 9A8B7C6D5E4F3G2H1I"
                      />
                    </label>

                    <div className="platform-section-divider" />
                    <h4>عناوين ووصف صفحات الألعاب العامة</h4>
                    <label>
                      <span>عنوان صفحة "الكلمة السرية"</span>
                      <input value={secretTitle} onChange={(e) => setSecretTitle(e.target.value)} />
                    </label>
                    <label>
                      <span>وصف صفحة "الكلمة السرية"</span>
                      <input value={secretDesc} onChange={(e) => setSecretDesc(e.target.value)} />
                    </label>

                    <label>
                      <span>عنوان صفحة "الأسئلة العامة"</span>
                      <input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
                    </label>
                    <label>
                      <span>وصف صفحة "الأسئلة العامة"</span>
                      <input value={quizDesc} onChange={(e) => setQuizDesc(e.target.value)} />
                    </label>

                    <label>
                      <span>عنوان صفحة "خمن المشهد"</span>
                      <input value={sceneTitle} onChange={(e) => setSceneTitle(e.target.value)} />
                    </label>
                    <label>
                      <span>وصف صفحة "خمن المشهد"</span>
                      <input value={sceneDesc} onChange={(e) => setSceneDesc(e.target.value)} />
                    </label>

                    <label>
                      <span>عنوان صفحة "التحدي السريع"</span>
                      <input value={rushTitle} onChange={(e) => setRushTitle(e.target.value)} />
                    </label>
                    <label>
                      <span>وصف صفحة "التحدي السريع"</span>
                      <input value={rushDesc} onChange={(e) => setRushDesc(e.target.value)} />
                    </label>

                    <button type="submit" className="platform-btn-gold" disabled={busy}>
                      <Check size={15} /> حفظ إعدادات SEO
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
