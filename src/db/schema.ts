import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const rooms = pgTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    mode: text("mode").notNull(),
    gameType: text("game_type").notNull().default("secret"),
    hostPlayerId: text("host_player_id").notNull(),
    status: text("status").notNull().default("lobby"),
    settings: jsonb("settings").notNull(),
    roundNumber: integer("round_number").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("rooms_code_unique").on(table.code)],
);

export const roomPlayers = pgTable(
  "room_players",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull(),
    nickname: text("nickname").notNull(),
    sessionToken: text("session_token").notNull(),
    isHost: boolean("is_host").notNull().default(false),
    isConnected: boolean("is_connected").notNull().default(true),
    score: integer("score").notNull().default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("room_players_token_unique").on(table.sessionToken),
    uniqueIndex("room_players_room_nickname_unique").on(table.roomId, table.nickname),
  ],
);

export const gameRounds = pgTable(
  "game_rounds",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull(),
    number: integer("number").notNull(),
    phase: text("phase").notNull().default("opening"),
    secretWord: text("secret_word").notNull(),
    category: text("category").notNull(),
    impostorIds: jsonb("impostor_ids").notNull(),
    pairings: jsonb("pairings").notNull(),
    questionRound: integer("question_round").notNull().default(1),
    turnIndex: integer("turn_index").notNull().default(0),
    questionLog: jsonb("question_log").notNull().default([]),
    revealData: jsonb("reveal_data"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("game_rounds_room_number_unique").on(table.roomId, table.number)],
);

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: text("id").primaryKey(),
    questionText: text("question_text").notNull(),
    correctAnswer: text("correct_answer").notNull(),
    choices: jsonb("choices").notNull(),
    category: text("category").notNull(),
    difficulty: text("difficulty").notNull(),
    language: text("language").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("quiz_questions_language_seed_unique").on(table.id)],
);

export const quizGames = pgTable(
  "quiz_games",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull(),
    status: text("status").notNull().default("lobby"),
    settings: jsonb("settings").notNull(),
    roundNumber: integer("round_number").notNull().default(0),
    turnIndex: integer("turn_index").notNull().default(0),
    currentTurnId: text("current_turn_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("quiz_games_room_unique").on(table.roomId)],
);

export const quizTurns = pgTable(
  "quiz_turns",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id").notNull(),
    roomId: text("room_id").notNull(),
    roundNumber: integer("round_number").notNull(),
    turnIndex: integer("turn_index").notNull(),
    playerId: text("player_id").notNull(),
    questionId: text("question_id").notNull(),
    status: text("status").notNull().default("active"),
    changedQuestion: boolean("changed_question").notNull().default(false),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("quiz_turns_game_round_turn_unique").on(table.gameId, table.roundNumber, table.turnIndex)],
);

export const quizPlayerStats = pgTable(
  "quiz_player_stats",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id").notNull(),
    playerId: text("player_id").notNull(),
    correctCount: integer("correct_count").notNull().default(0),
    incorrectCount: integer("incorrect_count").notNull().default(0),
    passedCount: integer("passed_count").notNull().default(0),
    changedCount: integer("changed_count").notNull().default(0),
  },
  (table) => [uniqueIndex("quiz_player_stats_game_player_unique").on(table.gameId, table.playerId)],
);

export const sceneCards = pgTable(
  "scene_cards",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    difficulty: text("difficulty").notNull(),
    language: text("language").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("scene_cards_id_unique").on(table.id)],
);

export const sceneGames = pgTable(
  "scene_games",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull(),
    status: text("status").notNull().default("lobby"),
    settings: jsonb("settings").notNull(),
    teams: jsonb("teams").notNull(),
    scores: jsonb("scores").notNull(),
    roundNumber: integer("round_number").notNull().default(0),
    teamTurnIndex: integer("team_turn_index").notNull().default(0),
    currentTurnId: text("current_turn_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("scene_games_room_unique").on(table.roomId)],
);

export const sceneTurns = pgTable(
  "scene_turns",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id").notNull(),
    roomId: text("room_id").notNull(),
    roundNumber: integer("round_number").notNull(),
    teamTurnIndex: integer("team_turn_index").notNull(),
    team: text("team").notNull(),
    actorId: text("actor_id").notNull(),
    sceneId: text("scene_id").notNull(),
    status: text("status").notNull().default("handoff"),
    revealedAt: timestamp("revealed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("scene_turns_game_round_team_unique").on(table.gameId, table.roundNumber, table.teamTurnIndex)],
);

export const rushGames = pgTable(
  "rush_games",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull(),
    status: text("status").notNull().default("lobby"),
    settings: jsonb("settings").notNull(),
    roundNumber: integer("round_number").notNull().default(0),
    turnIndex: integer("turn_index").notNull().default(0),
    currentTurnId: text("current_turn_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("rush_games_room_unique").on(table.roomId)],
);

export const rushTurns = pgTable(
  "rush_turns",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id").notNull(),
    roomId: text("room_id").notNull(),
    roundNumber: integer("round_number").notNull(),
    turnIndex: integer("turn_index").notNull(),
    playerId: text("player_id").notNull(),
    challengePublic: jsonb("challenge_public").notNull(),
    challengeSecret: jsonb("challenge_secret").notNull(),
    status: text("status").notNull().default("active"),
    pointsEarned: integer("points_earned").notNull().default(0),
    responseMs: integer("response_ms"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("rush_turns_game_round_turn_unique").on(table.gameId, table.roundNumber, table.turnIndex)],
);

export const rushPlayerStats = pgTable(
  "rush_player_stats",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id").notNull(),
    playerId: text("player_id").notNull(),
    correctCount: integer("correct_count").notNull().default(0),
    wrongCount: integer("wrong_count").notNull().default(0),
    timeoutCount: integer("timeout_count").notNull().default(0),
    currentStreak: integer("current_streak").notNull().default(0),
    bestStreak: integer("best_streak").notNull().default(0),
    fastestMs: integer("fastest_ms"),
  },
  (table) => [uniqueIndex("rush_player_stats_game_player_unique").on(table.gameId, table.playerId)],
);

export const votes = pgTable(
  "votes",
  {
    id: text("id").primaryKey(),
    roundId: text("round_id").notNull(),
    voterId: text("voter_id").notNull(),
    targetId: text("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("votes_round_voter_unique").on(table.roundId, table.voterId)],
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const userProfiles = pgTable(
  "user_profiles",
  {
    userId: text("user_id").primaryKey(),
    displayName: text("display_name").notNull(),
    gamesPlayed: integer("games_played").notNull().default(0),
    bestScore: integer("best_score").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    userId: text("user_id").primaryKey(),
    isPremium: boolean("is_premium").notNull().default(false),
    activatedBy: text("activated_by"),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const subscriptionRequests = pgTable(
  "subscription_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    status: text("status").notNull().default("Pending"),
    adminNotes: text("admin_notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const gameSessions = pgTable(
  "game_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    gameKey: text("game_key").notNull(),
    gameName: text("game_name").notNull(),
    mode: text("mode").notNull().default("local"),
    roomCode: text("room_code"),
    roundNumber: integer("round_number").notNull().default(1),
    totalRounds: integer("total_rounds").notNull().default(1),
    score: integer("score").notNull().default(0),
    statePayload: jsonb("state_payload").notNull().default({}),
    status: text("status").notNull().default("unfinished"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("game_sessions_user_game_unique").on(table.userId, table.gameKey)],
);

export const gameResults = pgTable(
  "game_results",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    gameKey: text("game_key").notNull(),
    gameName: text("game_name").notNull(),
    mode: text("mode").notNull(),
    score: integer("score").notNull().default(0),
    rounds: integer("rounds").notNull().default(1),
    rankLabel: text("rank_label").notNull().default("—"),
    stats: jsonb("stats").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const gameAccess = pgTable(
  "game_access",
  {
    gameKey: text("game_key").primaryKey(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    tier: text("tier").notNull().default("FREE"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const categoryAccess = pgTable(
  "category_access",
  {
    categoryKey: text("category_key").primaryKey(),
    gameKey: text("game_key").notNull(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    tier: text("tier").notNull().default("FREE"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const featureAccess = pgTable(
  "feature_access",
  {
    featureKey: text("feature_key").primaryKey(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    descriptionAr: text("description_ar").notNull().default(""),
    tier: text("tier").notNull().default("FREE"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const adminSettings = pgTable(
  "admin_settings",
  {
    settingKey: text("setting_key").primaryKey(),
    settingValue: text("setting_value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);
