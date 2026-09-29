export type QuizDifficulty = "easy" | "medium" | "hard";
export type QuizLanguage = "ar" | "en";

export type QuizQuestionSeed = {
  id: string;
  category: string;
  difficulty: QuizDifficulty;
  ar: { text: string; answer: string; choices: string[] };
  en: { text: string; answer: string; choices: string[] };
};

export const quizCategories = [
  { id: "geography", ar: "🌍 جغرافيا", en: "🌍 Geography" },
  { id: "history", ar: "🏛️ تاريخ", en: "🏛️ History" },
  { id: "science", ar: "🔬 علوم", en: "🔬 Science" },
  { id: "sports", ar: "⚽ رياضة", en: "⚽ Sports" },
  { id: "movies", ar: "🎬 أفلام ومسلسلات", en: "🎬 Movies & TV" },
  { id: "music", ar: "🎵 موسيقى", en: "🎵 Music" },
  { id: "animals", ar: "🐾 حيوانات", en: "🐾 Animals" },
  { id: "technology", ar: "💻 تقنية", en: "💻 Technology" },
  { id: "transport", ar: "🚗 سيارات ومواصلات", en: "🚗 Transport" },
  { id: "food", ar: "🍔 أطعمة", en: "🍔 Food" },
  { id: "general", ar: "🧠 معلومات عامة", en: "🧠 General knowledge" },
  { id: "culture", ar: "🎭 ثقافة", en: "🎭 Culture" },
  { id: "literature", ar: "📚 أدب", en: "📚 Literature" },
  { id: "space", ar: "🌌 فضاء", en: "🌌 Space" },
  { id: "nature", ar: "🌱 طبيعة", en: "🌱 Nature" },
  { id: "education", ar: "🏫 تعليم", en: "🏫 Education" },
  { id: "games", ar: "🎮 ألعاب", en: "🎮 Games" },
  { id: "competitions", ar: "🏆 مسابقات", en: "🏆 Competitions" },
] as const;

export const quizQuestionSeeds: QuizQuestionSeed[] = [
  { id: "geo-1", category: "geography", difficulty: "easy", ar: { text: "ما هي عاصمة اليابان؟", answer: "طوكيو", choices: ["طوكيو", "سيول", "بكين", "بانكوك"] }, en: { text: "What is the capital of Japan?", answer: "Tokyo", choices: ["Tokyo", "Seoul", "Beijing", "Bangkok"] } },
  { id: "geo-2", category: "geography", difficulty: "medium", ar: { text: "أي محيط هو الأكبر مساحة؟", answer: "المحيط الهادئ", choices: ["المحيط الهادئ", "المحيط الأطلسي", "المحيط الهندي", "المحيط المتجمد"] }, en: { text: "Which ocean is the largest?", answer: "Pacific Ocean", choices: ["Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean"] } },
  { id: "hist-1", category: "history", difficulty: "easy", ar: { text: "في أي دولة تقع الأهرامات الشهيرة في الجيزة؟", answer: "مصر", choices: ["مصر", "العراق", "اليونان", "المكسيك"] }, en: { text: "In which country are the famous Giza pyramids?", answer: "Egypt", choices: ["Egypt", "Iraq", "Greece", "Mexico"] } },
  { id: "hist-2", category: "history", difficulty: "hard", ar: { text: "من أول إنسان سار على سطح القمر؟", answer: "نيل أرمسترونغ", choices: ["نيل أرمسترونغ", "يوري غاغارين", "باز ألدرين", "جون غلين"] }, en: { text: "Who was the first person to walk on the Moon?", answer: "Neil Armstrong", choices: ["Neil Armstrong", "Yuri Gagarin", "Buzz Aldrin", "John Glenn"] } },
  { id: "sci-1", category: "science", difficulty: "easy", ar: { text: "ما الغاز الذي تحتاجه النباتات للبناء الضوئي؟", answer: "ثاني أكسيد الكربون", choices: ["ثاني أكسيد الكربون", "الأكسجين", "النيتروجين", "الهيدروجين"] }, en: { text: "Which gas do plants need for photosynthesis?", answer: "Carbon dioxide", choices: ["Carbon dioxide", "Oxygen", "Nitrogen", "Hydrogen"] } },
  { id: "sci-2", category: "science", difficulty: "medium", ar: { text: "كم عدد الكواكب في مجموعتنا الشمسية؟", answer: "8", choices: ["8", "7", "9", "10"] }, en: { text: "How many planets are in our Solar System?", answer: "8", choices: ["8", "7", "9", "10"] } },
  { id: "sport-1", category: "sports", difficulty: "easy", ar: { text: "كم لاعبًا في فريق كرة القدم داخل الملعب؟", answer: "11", choices: ["11", "9", "10", "12"] }, en: { text: "How many players are on a football team on the pitch?", answer: "11", choices: ["11", "9", "10", "12"] } },
  { id: "sport-2", category: "sports", difficulty: "medium", ar: { text: "في أي رياضة تُستخدم الريشة؟", answer: "تنس الريشة", choices: ["تنس الريشة", "الغولف", "البيسبول", "المبارزة"] }, en: { text: "In which sport is a shuttlecock used?", answer: "Badminton", choices: ["Badminton", "Golf", "Baseball", "Fencing"] } },
  { id: "movie-1", category: "movies", difficulty: "easy", ar: { text: "ما اسم الفن الذي يجمع الصور المتحركة والصوت؟", answer: "السينما", choices: ["السينما", "الرسم", "النحت", "الشعر"] }, en: { text: "What art form combines moving images and sound?", answer: "Cinema", choices: ["Cinema", "Painting", "Sculpture", "Poetry"] } },
  { id: "movie-2", category: "movies", difficulty: "medium", ar: { text: "ما الجائزة السينمائية التي تُمنح على هيئة تمثال ذهبي؟", answer: "الأوسكار", choices: ["الأوسكار", "غرامي", "إيمي", "توني"] }, en: { text: "Which film award is presented as a golden statuette?", answer: "Oscar", choices: ["Oscar", "Grammy", "Emmy", "Tony"] } },
  { id: "music-1", category: "music", difficulty: "easy", ar: { text: "كم وترًا قياسيًا للغيتار؟", answer: "6", choices: ["6", "4", "5", "8"] }, en: { text: "How many strings does a standard guitar have?", answer: "6", choices: ["6", "4", "5", "8"] } },
  { id: "music-2", category: "music", difficulty: "medium", ar: { text: "أي آلة موسيقية لها مفاتيح سوداء وبيضاء؟", answer: "البيانو", choices: ["البيانو", "الطبلة", "الناي", "الكمان"] }, en: { text: "Which instrument has black and white keys?", answer: "Piano", choices: ["Piano", "Drum", "Flute", "Violin"] } },
  { id: "animal-1", category: "animals", difficulty: "easy", ar: { text: "ما أسرع حيوان بري؟", answer: "الفهد", choices: ["الفهد", "الأسد", "الحصان", "الغزال"] }, en: { text: "What is the fastest land animal?", answer: "Cheetah", choices: ["Cheetah", "Lion", "Horse", "Gazelle"] } },
  { id: "animal-2", category: "animals", difficulty: "medium", ar: { text: "ما الحيوان المعروف بقدرته على تغيير لون جلده؟", answer: "الحرباء", choices: ["الحرباء", "السلحفاة", "الباندا", "القندس"] }, en: { text: "Which animal is known for changing its skin color?", answer: "Chameleon", choices: ["Chameleon", "Turtle", "Panda", "Beaver"] } },
  { id: "tech-1", category: "technology", difficulty: "easy", ar: { text: "ماذا تعني CPU في الحاسوب؟", answer: "وحدة المعالجة المركزية", choices: ["وحدة المعالجة المركزية", "ذاكرة الوصول", "وحدة التخزين", "بطاقة الرسوم"] }, en: { text: "What does CPU stand for?", answer: "Central Processing Unit", choices: ["Central Processing Unit", "Computer Power Unit", "Core Program Utility", "Central Print Unit"] } },
  { id: "tech-2", category: "technology", difficulty: "medium", ar: { text: "أي لغة تُستخدم غالبًا لتنسيق صفحات الويب؟", answer: "CSS", choices: ["CSS", "HTML", "SQL", "Python"] }, en: { text: "Which language is commonly used to style web pages?", answer: "CSS", choices: ["CSS", "HTML", "SQL", "Python"] } },
  { id: "transport-1", category: "transport", difficulty: "easy", ar: { text: "ما المركبة التي تسير على قضبان حديدية؟", answer: "القطار", choices: ["القطار", "السفينة", "الطائرة", "الحافلة"] }, en: { text: "Which vehicle travels on rails?", answer: "Train", choices: ["Train", "Ship", "Plane", "Bus"] } },
  { id: "transport-2", category: "transport", difficulty: "medium", ar: { text: "ما اللون الشائع لإشارة التوقف المرورية؟", answer: "الأحمر", choices: ["الأحمر", "الأخضر", "الأصفر", "الأزرق"] }, en: { text: "What color is a standard stop traffic light?", answer: "Red", choices: ["Red", "Green", "Yellow", "Blue"] } },
  { id: "food-1", category: "food", difficulty: "easy", ar: { text: "من أي فاكهة يُصنع الزبيب؟", answer: "العنب", choices: ["العنب", "التفاح", "التمر", "التين"] }, en: { text: "Raisins are made from which fruit?", answer: "Grapes", choices: ["Grapes", "Apples", "Dates", "Figs"] } },
  { id: "food-2", category: "food", difficulty: "medium", ar: { text: "ما المكوّن الأساسي في الحمص؟", answer: "الحمص", choices: ["الحمص", "العدس", "الفول", "الأرز"] }, en: { text: "What is the main ingredient in hummus?", answer: "Chickpeas", choices: ["Chickpeas", "Lentils", "Beans", "Rice"] } },
  { id: "general-1", category: "general", difficulty: "easy", ar: { text: "كم يومًا في الأسبوع؟", answer: "7", choices: ["7", "5", "6", "8"] }, en: { text: "How many days are in a week?", answer: "7", choices: ["7", "5", "6", "8"] } },
  { id: "general-2", category: "general", difficulty: "medium", ar: { text: "ما المادة التي يُقاس بها وزن الأحجار الكريمة؟", answer: "القيراط", choices: ["القيراط", "الكيلوغرام", "اللتر", "المتر"] }, en: { text: "What unit is used to weigh gemstones?", answer: "Carat", choices: ["Carat", "Kilogram", "Litre", "Metre"] } },
  { id: "culture-1", category: "culture", difficulty: "easy", ar: { text: "ما لون لوحات إشارات الخطر غالبًا؟", answer: "الأحمر", choices: ["الأحمر", "الأبيض", "البنفسجي", "البرتقالي"] }, en: { text: "What color is commonly used for danger signs?", answer: "Red", choices: ["Red", "White", "Purple", "Orange"] } },
  { id: "culture-2", category: "culture", difficulty: "hard", ar: { text: "ما اسم الفن الياباني لطي الورق؟", answer: "الأوريغامي", choices: ["الأوريغامي", "الكاراتيه", "الهايكو", "الكيبانا"] }, en: { text: "What is the Japanese art of paper folding called?", answer: "Origami", choices: ["Origami", "Karate", "Haiku", "Ikebana"] } },
  { id: "lit-1", category: "literature", difficulty: "easy", ar: { text: "ماذا يسمى مؤلف الكتاب؟", answer: "الكاتب", choices: ["الكاتب", "الرسام", "المخرج", "المذيع"] }, en: { text: "What do we call the person who writes a book?", answer: "Author", choices: ["Author", "Painter", "Director", "Presenter"] } },
  { id: "lit-2", category: "literature", difficulty: "medium", ar: { text: "أي علامة ترقيم توضع في نهاية السؤال؟", answer: "علامة الاستفهام", choices: ["علامة الاستفهام", "الفاصلة", "النقطة", "النقطتان"] }, en: { text: "Which punctuation mark ends a question?", answer: "Question mark", choices: ["Question mark", "Comma", "Full stop", "Colon"] } },
  { id: "space-1", category: "space", difficulty: "easy", ar: { text: "ما النجم الأقرب إلى الأرض؟", answer: "الشمس", choices: ["الشمس", "الشعرى", "النجم القطبي", "فيغا"] }, en: { text: "Which star is closest to Earth?", answer: "The Sun", choices: ["The Sun", "Sirius", "Polaris", "Vega"] } },
  { id: "space-2", category: "space", difficulty: "medium", ar: { text: "ما الكوكب المعروف بالكوكب الأحمر؟", answer: "المريخ", choices: ["المريخ", "الزهرة", "المشتري", "عطارد"] }, en: { text: "Which planet is known as the Red Planet?", answer: "Mars", choices: ["Mars", "Venus", "Jupiter", "Mercury"] } },
  { id: "nature-1", category: "nature", difficulty: "easy", ar: { text: "ما الجزء من النبات الذي يمتص الماء من التربة؟", answer: "الجذور", choices: ["الجذور", "الأوراق", "الأزهار", "الثمار"] }, en: { text: "Which part of a plant absorbs water from soil?", answer: "Roots", choices: ["Roots", "Leaves", "Flowers", "Fruit"] } },
  { id: "nature-2", category: "nature", difficulty: "medium", ar: { text: "ما الظاهرة التي يتحول فيها الماء إلى بخار؟", answer: "التبخر", choices: ["التبخر", "التجمد", "التكاثف", "الذوبان"] }, en: { text: "What is the process of water turning into vapor?", answer: "Evaporation", choices: ["Evaporation", "Freezing", "Condensation", "Melting"] } },
  { id: "edu-1", category: "education", difficulty: "easy", ar: { text: "ما ناتج 8 × 7؟", answer: "56", choices: ["56", "48", "54", "64"] }, en: { text: "What is 8 × 7?", answer: "56", choices: ["56", "48", "54", "64"] } },
  { id: "edu-2", category: "education", difficulty: "medium", ar: { text: "ما الشكل ذو ثلاثة أضلاع؟", answer: "المثلث", choices: ["المثلث", "المربع", "الدائرة", "الخماسي"] }, en: { text: "Which shape has three sides?", answer: "Triangle", choices: ["Triangle", "Square", "Circle", "Pentagon"] } },
  { id: "game-1", category: "games", difficulty: "easy", ar: { text: "في الشطرنج، ما القطعة التي تتحرك بشكل حرف L؟", answer: "الحصان", choices: ["الحصان", "الملك", "الوزير", "الفيل"] }, en: { text: "In chess, which piece moves in an L shape?", answer: "Knight", choices: ["Knight", "King", "Queen", "Bishop"] } },
  { id: "game-2", category: "games", difficulty: "medium", ar: { text: "كم وجهًا للمكعب؟", answer: "6", choices: ["6", "4", "8", "12"] }, en: { text: "How many faces does a cube have?", answer: "6", choices: ["6", "4", "8", "12"] } },
  { id: "comp-1", category: "competitions", difficulty: "easy", ar: { text: "ما المركز الذي يحصل على الميدالية الذهبية؟", answer: "المركز الأول", choices: ["المركز الأول", "المركز الثاني", "المركز الثالث", "المركز الرابع"] }, en: { text: "Which place earns a gold medal?", answer: "First place", choices: ["First place", "Second place", "Third place", "Fourth place"] } },
  { id: "comp-2", category: "competitions", difficulty: "medium", ar: { text: "ما اسم اللوحة التي ترتب المتنافسين حسب نقاطهم؟", answer: "لوحة الصدارة", choices: ["لوحة الصدارة", "قائمة الحضور", "بطاقة الدعوة", "ساعة التوقيت"] }, en: { text: "What is the board ranking competitors by points called?", answer: "Leaderboard", choices: ["Leaderboard", "Attendance list", "Invitation card", "Stopwatch"] } },
];

export function localizedQuizQuestions(language: QuizLanguage) {
  return quizQuestionSeeds.map((question) => ({
    id: `${question.id}-${language}`,
    seedId: question.id,
    category: question.category,
    difficulty: question.difficulty,
    language,
    text: question[language].text,
    answer: question[language].answer,
    choices: question[language].choices,
  }));
}
