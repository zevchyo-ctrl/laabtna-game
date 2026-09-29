export type SoundEffect =
  | "click" | "select" | "start" | "success" | "fail" | "timeout" | "warning"
  | "fileOpen" | "fileClose" | "vote" | "reveal" | "change" | "pass" | "victory"
  | "special" | "score" | "transition";

export type SoundPreferences = { sound: boolean; vibration: boolean };
const storageKey = "laabtna:audio-preferences";
const defaults: SoundPreferences = { sound: true, vibration: true };
let context: AudioContext | null = null;

export function soundPreferences(): SoundPreferences {
  if (typeof window === "undefined") return defaults;
  try { return { ...defaults, ...JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") }; }
  catch { return defaults; }
}

export function saveSoundPreferences(next: SoundPreferences) {
  if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(next));
}

function audio() {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!context) context = new AudioCtor();
  if (context.state === "suspended") void context.resume().catch(() => undefined);
  return context;
}

function tone(frequency: number, duration: number, type: OscillatorType, volume = 0.045, delay = 0) {
  const ctx = audio();
  if (!ctx || !soundPreferences().sound) return;
  try {
    const now = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(now); oscillator.stop(now + duration + 0.02);
  } catch { /* Audio is strictly optional. */ }
}

export function vibrate(pattern: number | number[] = 8) {
  if (typeof navigator === "undefined" || !soundPreferences().vibration) return;
  try { navigator.vibrate?.(pattern); } catch { /* Unsupported vibration never affects play. */ }
}

export function playEffect(effect: SoundEffect) {
  if (typeof window === "undefined") return;
  const map: Record<SoundEffect, () => void> = {
    click: () => { tone(460, .045, "sine", .022); vibrate(5); },
    select: () => { tone(610, .065, "triangle", .028); vibrate(7); },
    start: () => { tone(440, .09, "sine", .04); tone(660, .11, "sine", .04, .09); vibrate(14); },
    success: () => { tone(540, .1, "sine", .04); tone(790, .14, "sine", .05, .09); vibrate([10, 25, 10]); },
    fail: () => { tone(220, .14, "triangle", .035); vibrate(12); },
    timeout: () => { tone(170, .18, "sawtooth", .04); tone(130, .23, "sawtooth", .032, .13); vibrate([24, 35, 30]); },
    warning: () => { tone(760, .055, "square", .026); vibrate(8); },
    fileOpen: () => { tone(310, .06, "triangle", .03); tone(480, .08, "triangle", .026, .055); vibrate(8); },
    fileClose: () => { tone(430, .07, "triangle", .028); tone(280, .09, "triangle", .024, .05); vibrate(7); },
    vote: () => { tone(360, .07, "square", .025); tone(520, .08, "square", .022, .065); vibrate(10); },
    reveal: () => { tone(280, .11, "sine", .03); tone(430, .12, "sine", .035, .07); tone(650, .15, "sine", .04, .14); vibrate([9, 18, 14]); },
    change: () => { tone(480, .07, "triangle", .03); tone(360, .07, "triangle", .028, .07); vibrate(9); },
    pass: () => { tone(300, .1, "sine", .025); vibrate(7); },
    victory: () => { tone(523, .1, "sine", .04); tone(659, .1, "sine", .042, .1); tone(784, .18, "sine", .046, .2); vibrate([12, 28, 14]); },
    special: () => { tone(392, .08, "triangle", .036); tone(587, .09, "triangle", .04, .07); tone(784, .12, "triangle", .045, .14); vibrate([10, 18, 12]); },
    score: () => { tone(700, .06, "sine", .032); tone(980, .09, "sine", .036, .055); },
    transition: () => { tone(380, .05, "sine", .022); tone(500, .06, "sine", .024, .045); },
  };
  map[effect]();
}

export function playCountdownSecond(second: number) {
  if (typeof window === "undefined" || second <= 0) return;
  if (second === 1) {
    tone(980, 0.085, "sawtooth", 0.052);
    tone(1240, 0.075, "square", 0.04, 0.06);
    vibrate([14, 18, 14]);
    return;
  }
  if (second <= 5) {
    tone(760 + (5 - second) * 42, 0.065, "square", 0.036);
    vibrate(8);
    return;
  }
  tone(560, 0.04, "sine", 0.02);
}
