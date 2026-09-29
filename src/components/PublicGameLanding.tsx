"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  Compass,
  Gamepad2,
  Globe2,
  HelpCircle,
  Home,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { gamesSeoCatalog, type GameSeoData } from "@/lib/seo";

export default function PublicGameLanding({
  game,
  siteUrl,
}: {
  game: GameSeoData;
  siteUrl: string;
}) {
  const otherGames = Object.values(gamesSeoCatalog).filter((g) => g.key !== game.key);

  const gameSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": `${game.nameAr} | لعبتنا`,
    "alternateName": game.nameEn,
    "url": `${siteUrl}/${game.slug}`,
    "applicationCategory": "GameApplication",
    "operatingSystem": "All",
    "browserRequirements": "Requires JavaScript. Requires HTML5.",
    "description": game.description,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "الرئيسية",
        "item": siteUrl,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": game.nameAr,
        "item": `${siteUrl}/${game.slug}`,
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `هل لعبة ${game.nameAr} مجانية وبدون تسجيل؟`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `نعم، يمكنك بدء لعب ${game.nameAr} فورًا وبشكل مجاني تمامًا مع أصدقائك بدون الحاجة لإنشاء حساب أو تسجيل دخول أو تحميل أي تطبيق.`,
        },
      },
      {
        "@type": "Question",
        "name": `هل تدعم لعبة ${game.nameAr} اللعب على نفس الهاتف والأونلاين؟`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "نعم، تدعم اللعبة وضع اللعب على هاتف واحد (Same-Phone) عبر تمرير الجهاز، بالإضافة إلى وضع الأونلاين المباشر عبر رمز غرفة متزامن من أي مكان.",
        },
      },
      {
        "@type": "Question",
        "name": `كم عدد اللاعبين المناسب للعبة ${game.nameAr}؟`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "يمكن لعبها مع صديقين أو مجموعات سهرات وعائلية تبدأ من 2 إلى 10 لاعبين في نفس الجلسة.",
        },
      },
    ],
  };

  return (
    <article className="seo-landing-shell" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <nav className="seo-breadcrumbs" aria-label="مسار التنقل">
        <Link href="/" className="seo-crumb-link">
          <Home size={14} />
          <span>الرئيسية</span>
        </Link>
        <ChevronLeft size={13} className="seo-crumb-sep" />
        <span className="seo-crumb-current">{game.nameAr}</span>
      </nav>

      <header className="seo-hero-card">
        <div className="seo-game-badge">
          <span>{game.icon}</span>
          <small>لعبتنا · ألعاب جماعية للأصدقاء</small>
        </div>
        <h1 className="seo-main-heading">{game.title}</h1>
        <p className="seo-lead-text">{game.headline}. {game.summary}</p>

        <div className="seo-cta-box">
          <Link href={`/?game=${game.key}`} className="primary-button big seo-play-btn">
            <Play size={20} />
            <b>ابدأ لعب {game.nameAr} الآن مجانًا</b>
            <ArrowLeft size={18} />
          </Link>
          <span className="seo-cta-note">
            <Sparkles size={14} /> بدون تسجيل · بدون تحميل · على الجوال والكمبيوتر
          </span>
        </div>
      </header>

      <section className="seo-content-block">
        <h2 className="seo-section-title">
          <Gamepad2 size={20} /> كيف تعمل لعبة {game.nameAr}؟
        </h2>
        <p className="seo-paragraph">
          تم تصميم {game.nameAr} لتمنحك ولأصدقائك تجربة ألعاب جماعية تفاعلية تركز على الذكاء والمنافسة والمرح بدون أي تعقيد. تعتمد اللعبة على مشاركة الجميع وتوزيع الأدوار بعدالة، مما يجعلها مثالية للسهرات والجلسات العائلية واجتماعات الأصدقاء.
        </p>

        <div className="seo-steps-grid">
          <div className="seo-step-card">
            <div className="seo-step-num">1</div>
            <h3>الخطوة الأولى</h3>
            <p>{game.howToPlay.step1}</p>
          </div>
          <div className="seo-step-card">
            <div className="seo-step-num">2</div>
            <h3>الخطوة الثانية</h3>
            <p>{game.howToPlay.step2}</p>
          </div>
          <div className="seo-step-card">
            <div className="seo-step-num">3</div>
            <h3>الخطوة الثالثة</h3>
            <p>{game.howToPlay.step3}</p>
          </div>
          <div className="seo-step-card">
            <div className="seo-step-num">4</div>
            <h3>الخطوة الرابعة</h3>
            <p>{game.howToPlay.step4}</p>
          </div>
        </div>
      </section>

      <section className="seo-content-block">
        <h2 className="seo-section-title">
          <Smartphone size={20} /> طرق اللعب: على نفس الهاتف أو أونلاين مع الأصدقاء
        </h2>
        <div className="seo-modes-grid">
          <div className="seo-mode-card">
            <div className="seo-mode-icon">📱</div>
            <h3>اللعب على نفس الهاتف (Same-Phone Mode)</h3>
            <p>{game.modesExplanation.samePhone}</p>
            <ul className="seo-feature-list">
              <li>مناسبة للجلسات والسهرات الواقعية</li>
              <li>لا تتطلب اتصال إنترنت لجميع اللاعبين</li>
              <li>حماية تامة لسرية الأدوار والأسئلة عند تمرير الهاتف</li>
            </ul>
          </div>
          <div className="seo-mode-card">
            <div className="seo-mode-icon">🌐</div>
            <h3>اللعب أونلاين عبر الغرف (Online Multiplayer)</h3>
            <p>{game.modesExplanation.online}</p>
            <ul className="seo-feature-list">
              <li>رمز غرفة مكوّن من 5 أحرف سهل المشاركة</li>
              <li>مزامنة لحظية للوقت والأدوار والنتائج</li>
              <li>تشفير خادمي سلطوي يمنع التلاعب والغش</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="seo-content-block">
        <h2 className="seo-section-title">
          <ShieldCheck size={20} /> مميزات لعبة {game.nameAr} على منصة لعبتنا
        </h2>
        <div className="seo-highlights-grid">
          {game.features.map((feat, idx) => (
            <div key={idx} className="seo-highlight-item">
              <Zap size={16} />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="seo-content-block">
        <h2 className="seo-section-title">
          <HelpCircle size={20} /> الأسئلة الشائعة حول لعبة {game.nameAr}
        </h2>
        <div className="seo-faq-list">
          <details className="seo-faq-item" open>
            <summary>هل لعبة {game.nameAr} مجانية بالكامل؟</summary>
            <p>نعم، اللعبة متاحة مجانًا لكافة الأصدقاء ويمكنك بدء أي جولة مباشرة بدون قيود أو دفع مسبق.</p>
          </details>
          <details className="seo-faq-item">
            <summary>هل أحتاج لإنشاء حساب لبدء اللعب؟</summary>
            <p>لا، يمكنك إدخال اسمك المستعار وبدء الجولة في ثوانٍ معدودة. توفر المنصة نظام حسابات اختياريًا فقط لمن يرغب في حفظ سجل النتائج ومتابعة الألعاب غير المكتملة.</p>
          </details>
          <details className="seo-faq-item">
            <summary>هل تعمل اللعبة على هواتف آيفون وأندرويد والكمبيوتر؟</summary>
            <p>نعم، تم تحسين المنصة بالكامل لتعمل بسلاسة فائقة عبر جميع متصفحات الهواتف الذكية والأجهزة اللوحية وأجهزة الكمبيوتر بدون تحميل.</p>
          </details>
        </div>
      </section>

      <section className="seo-content-block seo-internal-links-block">
        <h2 className="seo-section-title">
          <Compass size={20} /> ألعاب جماعية أخرى للأصدقاء على لعبتنا
        </h2>
        <p className="seo-paragraph">
          اكتشف باقي الألعاب الجماعية المتوفرة على منصة لعبتنا واستمتع بتحديات جديدة في كل سهرة:
        </p>
        <div className="seo-other-games-grid">
          {otherGames.map((item) => (
            <Link key={item.key} href={`/${item.slug}`} className="seo-other-game-card">
              <span className="seo-other-game-icon">{item.icon}</span>
              <div>
                <h3>{item.nameAr}</h3>
                <p>{item.description}</p>
                <span className="seo-view-link">
                  تعرف على طريقة اللعب <ChevronLeft size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="seo-landing-footer">
        <div className="seo-footer-inner">
          <Link href="/" className="seo-footer-brand">
            <b>لعبتنا | LAABTNA</b>
            <small>لعبتنا جمعتنا — منصة ألعاب جماعية أونلاين للأصدقاء</small>
          </Link>
          <div className="seo-footer-nav">
            <Link href="/">الرئيسية</Link>
            <Link href="/secret-word">الكلمة السرية</Link>
            <Link href="/general-questions">الأسئلة العامة</Link>
            <Link href="/guess-the-scene">خمن المشهد</Link>
            <Link href="/quick-challenge">التحدي السريع</Link>
          </div>
          <p className="seo-footer-copy">© {new Date().getFullYear()} لعبتنا (LAABTNA). جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </article>
  );
}
