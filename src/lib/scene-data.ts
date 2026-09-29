export type SceneLanguage = "ar" | "en";
export type SceneDifficulty = "easy" | "medium" | "hard";

export type SceneSeed = {
  id: string;
  category: string;
  difficulty: SceneDifficulty;
  ar: { title: string; description: string };
  en: { title: string; description: string };
};

export const sceneCategories = [
  { id: "daily", ar: "🏠 حياة يومية", en: "🏠 Daily life" },
  { id: "travel", ar: "✈️ سفر", en: "✈️ Travel" },
  { id: "school", ar: "🎒 مدرسة", en: "🎒 School" },
  { id: "work", ar: "💼 عمل", en: "💼 Work" },
  { id: "funny", ar: "😂 مواقف مضحكة", en: "😂 Funny moments" },
  { id: "food", ar: "🍔 أطعمة", en: "🍔 Food" },
  { id: "technology", ar: "📱 تقنية", en: "📱 Technology" },
] as const;

export const sceneSeeds: SceneSeed[] = [
  { id: "keys-home", category: "daily", difficulty: "easy", ar: { title: "المفاتيح داخل المنزل", description: "شخص نسي مفاتيح السيارة داخل المنزل ويحاول تذكر أين وضعها." }, en: { title: "Keys locked inside", description: "A person forgot their car keys inside the house and is trying to remember where they left them." } },
  { id: "late-flight", category: "travel", difficulty: "easy", ar: { title: "متأخر عن الرحلة", description: "شخص يركض في المطار لأنه متأخر عن رحلته." }, en: { title: "Late for a flight", description: "A person is rushing through an airport because they are late for a flight." } },
  { id: "broken-umbrella", category: "daily", difficulty: "easy", ar: { title: "المظلة العالقة", description: "شخص يحاول فتح مظلة تحت المطر لكنها لا تعمل." }, en: { title: "Broken umbrella", description: "A person tries to open an umbrella in the rain but it will not work." } },
  { id: "lost-phone", category: "technology", difficulty: "easy", ar: { title: "أين هاتفي؟", description: "شخص يكتشف أن هاتفه غير موجود ويبحث عنه بقلق." }, en: { title: "Where is my phone?", description: "A person discovers their phone is missing and searches anxiously." } },
  { id: "forgot-wallet", category: "food", difficulty: "easy", ar: { title: "المحفظة المنسية", description: "شخص يدخل مطعمًا ثم يتذكر أنه نسي محفظته." }, en: { title: "Forgotten wallet", description: "A person enters a restaurant and realizes they forgot their wallet." } },
  { id: "taxi-wave", category: "travel", difficulty: "easy", ar: { title: "التاكسي لا يتوقف", description: "شخص يحاول إيقاف سيارة أجرة لكنها تمر من جانبه." }, en: { title: "Taxi will not stop", description: "A person tries to stop a taxi but it does not stop." } },
  { id: "fridge-forget", category: "daily", difficulty: "easy", ar: { title: "الثلاجة المحيرة", description: "شخص يفتح الثلاجة ثم ينسى ما الذي جاء ليأخذه." }, en: { title: "The confusing fridge", description: "A person opens the refrigerator and forgets what they wanted." } },
  { id: "mosquito-night", category: "funny", difficulty: "medium", ar: { title: "البعوضة المزعجة", description: "شخص يحاول النوم بينما بعوضة تزعجه باستمرار." }, en: { title: "Annoying mosquito", description: "A person tries to sleep while a mosquito keeps bothering them." } },
  { id: "forgot-school-bag", category: "school", difficulty: "easy", ar: { title: "الحقيبة المنسية", description: "شخص يصل إلى المدرسة ويكتشف أنه نسي حقيبته." }, en: { title: "Forgotten school bag", description: "A person arrives at school and realizes they forgot their bag." } },
  { id: "group-photo", category: "funny", difficulty: "medium", ar: { title: "صورة جماعية صعبة", description: "شخص يحاول التقاط صورة جماعية والجميع يتحرك في كل مرة." }, en: { title: "Moving group photo", description: "A person is trying to take a group photo while everyone keeps moving." } },
  { id: "hot-coffee", category: "food", difficulty: "easy", ar: { title: "قهوة ساخنة جدًا", description: "شخص يأخذ رشفة قهوة شديدة السخونة ويحاول التماسك." }, en: { title: "Very hot coffee", description: "A person takes a sip of very hot coffee and tries to keep calm." } },
  { id: "video-call-freeze", category: "technology", difficulty: "medium", ar: { title: "تجمّد الاتصال", description: "شخص في مكالمة فيديو ويحاول فهم ما إذا كان الآخرون يسمعونه." }, en: { title: "Frozen video call", description: "A person is on a video call and tries to tell if anyone can hear them." } },
  { id: "elevator-stuck", category: "daily", difficulty: "medium", ar: { title: "مصعد متوقف", description: "شخص عالق في مصعد ويحاول طلب المساعدة." }, en: { title: "Stuck elevator", description: "A person is stuck in an elevator and tries to call for help." } },
  { id: "wrong-classroom", category: "school", difficulty: "medium", ar: { title: "الفصل الخطأ", description: "طالب يدخل فصلًا دراسيًا ثم يكتشف أن الجميع ينظرون إليه باستغراب." }, en: { title: "Wrong classroom", description: "A student enters a classroom and realizes everyone is staring at them." } },
  { id: "presentation-nerves", category: "work", difficulty: "medium", ar: { title: "عرض تقديمي متوتر", description: "شخص يقف أمام الجمهور ليبدأ عرضًا تقديميًا وينسى أول كلمة." }, en: { title: "Presentation nerves", description: "A person stands before an audience to present and forgets their first word." } },
  { id: "suitcase-overflow", category: "travel", difficulty: "hard", ar: { title: "حقيبة لا تُغلق", description: "مسافر يحاول إغلاق حقيبة مليئة أكثر من اللازم." }, en: { title: "Overstuffed suitcase", description: "A traveler tries to close an overstuffed suitcase." } },
  { id: "cake-surprise", category: "food", difficulty: "medium", ar: { title: "مفاجأة كعكة", description: "شخص يحمل كعكة عيد ميلاد ويحاول ألا يكشف المفاجأة." }, en: { title: "Cake surprise", description: "A person carries a birthday cake and tries not to ruin the surprise." } },
  { id: "printer-jam", category: "work", difficulty: "hard", ar: { title: "ورق عالق في الطابعة", description: "شخص يحاول إصلاح طابعة انحشر الورق بداخلها." }, en: { title: "Printer jam", description: "A person tries to fix a printer with paper stuck inside." } },
  { id: "charger-search", category: "technology", difficulty: "easy", ar: { title: "البحث عن الشاحن", description: "شخص يتفحص كل مكان بحثًا عن شاحن هاتفه." }, en: { title: "Searching for a charger", description: "A person checks everywhere looking for their phone charger." } },
  { id: "slippery-floor", category: "funny", difficulty: "hard", ar: { title: "أرضية زلقة", description: "شخص يمشي بحذر شديد فوق أرضية مبللة دون أن يقع." }, en: { title: "Slippery floor", description: "A person carefully walks over a wet floor without falling." } },
];

export function localizedScenes(language: SceneLanguage) {
  return sceneSeeds.map((scene) => ({
    id: `${scene.id}-${language}`,
    seedId: scene.id,
    category: scene.category,
    difficulty: scene.difficulty,
    language,
    title: scene[language].title,
    description: scene[language].description,
  }));
}
