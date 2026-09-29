"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, Volume2, VolumeX, Vibrate } from "lucide-react";
import { saveSoundPreferences, soundPreferences, type SoundPreferences } from "@/lib/sounds";

export default function SoundControls({ language = "ar", className = "" }: { language?: "ar" | "en"; className?: string }) {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<SoundPreferences>({ sound: true, vibration: true });
  useEffect(() => setPreferences(soundPreferences()), []);
  const update = (next: SoundPreferences) => { setPreferences(next); saveSoundPreferences(next); };
  const labels = language === "ar"
    ? { title: "إعدادات التجربة", sound: "المؤثرات الصوتية", vibration: "الاهتزاز" }
    : { title: "Experience settings", sound: "Sound effects", vibration: "Vibration" };
  return <div className={`sound-controls ${className}`}>
    <button className="sound-controls-trigger" onClick={() => setOpen((value) => !value)} aria-label={labels.title}><SlidersHorizontal size={17} /></button>
    {open && <div className="sound-controls-panel"><b>{labels.title}</b><label><span>{preferences.sound ? <Volume2 size={15} /> : <VolumeX size={15} />}{labels.sound}</span><input type="checkbox" checked={preferences.sound} onChange={(event) => update({ ...preferences, sound: event.target.checked })} /></label><label><span><Vibrate size={15} />{labels.vibration}</span><input type="checkbox" checked={preferences.vibration} onChange={(event) => update({ ...preferences, vibration: event.target.checked })} /></label></div>}
  </div>;
}
