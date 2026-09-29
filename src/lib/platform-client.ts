"use client";

export type ClientUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  isPremium: boolean;
  gamesPlayed: number;
  bestScore: number;
  latestRequestStatus: string | null;
  requests: Array<{
    id: string;
    status: string;
    adminNotes: string;
    createdAt: string;
  }>;
};

export type ClientGameResult = {
  id: string;
  gameKey: string;
  gameName: string;
  mode: string;
  score: number;
  rounds: number;
  rankLabel: string;
  stats: Record<string, unknown>;
  createdAt: string;
};

export type ClientUnfinishedSession = {
  id: string;
  gameKey: string;
  gameName: string;
  mode: string;
  roomCode: string | null;
  roundNumber: number;
  totalRounds: number;
  score: number;
  statePayload: Record<string, unknown>;
  updatedAt: string;
};

export type ClientAccessState = {
  globalMode: "EVERYTHING_FREE" | "MIXED" | "PREMIUM";
  telegramUrl: string;
  games: Record<string, "FREE" | "PREMIUM">;
  categories: Record<string, "FREE" | "PREMIUM">;
  features: Record<string, "FREE" | "PREMIUM">;
};

export async function recordGameResultToAccount(params: {
  gameKey: "secret" | "quiz" | "scene" | "rush";
  gameName: string;
  mode: "local" | "online";
  score: number;
  rounds: number;
  rankLabel: string;
  stats: Record<string, unknown>;
}) {
  try {
    await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "recordResult", ...params }),
    });
    window.dispatchEvent(new CustomEvent("laabtna:account-updated"));
  } catch {
    /* Optional account tracking never interrupts gameplay */
  }
}

export async function saveUnfinishedSessionToAccount(params: {
  gameKey: "secret" | "quiz" | "scene" | "rush";
  gameName: string;
  mode: "local" | "online";
  roomCode?: string | null;
  roundNumber: number;
  totalRounds: number;
  score: number;
  statePayload: Record<string, unknown>;
}) {
  try {
    await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "saveSession", ...params }),
    });
    window.dispatchEvent(new CustomEvent("laabtna:account-updated"));
  } catch {
    /* Non-blocking */
  }
}

export async function clearUnfinishedSessionOnAccount(gameKey: "secret" | "quiz" | "scene" | "rush") {
  try {
    await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "clearSession", gameKey }),
    });
    window.dispatchEvent(new CustomEvent("laabtna:account-updated"));
  } catch {
    /* Non-blocking */
  }
}

export function triggerPremiumLockModal(reason?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("laabtna:open-premium-lock", { detail: { reason } }));
  }
}
