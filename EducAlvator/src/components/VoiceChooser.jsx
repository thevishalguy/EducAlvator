import { useEffect, useRef, useState } from "react";
import { VOICES, PREVIEW_TEXT, getVoiceId, setVoiceId, deviceVoiceFor, voicesReady, speakText, ttsSupported } from "../lib/voices";

// The Study Buddy's speaking voice. Choosing one saves it and plays a short sample;
// Voice Mode and "Read aloud" then speak in it.
export default function VoiceChooser() {
  const [selected, setSelected] = useState(getVoiceId);
  const [playing, setPlaying] = useState(null);
  const [deviceNames, setDeviceNames] = useState({});
  const speakerRef = useRef(null);

  useEffect(() => {
    let alive = true;
    voicesReady().then(() => {
      if (!alive) return;
      setDeviceNames(Object.fromEntries(VOICES.map((v) => [v.id, deviceVoiceFor(v)?.name || ""])));
    });
    return () => {
      alive = false;
      speakerRef.current?.stop();
    };
  }, []);

  const choose = (id) => {
    setSelected(id);
    setVoiceId(id);
    speakerRef.current?.stop();
    setPlaying(id);
    const speaker = speakText(PREVIEW_TEXT, {
      voiceId: id,
      onDone: () => {
        if (speakerRef.current !== speaker) return;
        speakerRef.current = null;
        setPlaying(null);
      },
    });
    speakerRef.current = speaker;
  };

  if (!ttsSupported) {
    return <p className="text-sm font-medium text-muted">This browser can't speak replies. Try Chrome or Edge to use voices.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Study Buddy voice">
      {VOICES.map((v) => {
        const isOn = selected === v.id;
        const isPlaying = playing === v.id;
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={isOn}
            onClick={() => choose(v.id)}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
              isOn ? "border-accent bg-accent-tint" : "border-line bg-surface-2 hover:border-line-strong"
            }`}
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                isOn ? "bg-accent text-white" : "bg-surface text-muted"
              } ${isPlaying ? "animate-pulse" : ""}`}
              aria-hidden="true"
            >
              {isPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 10v4M9 7v10M13 4v16M17 7v10M21 10v4" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
                </svg>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-ink">{v.name}</span>
                {isOn && <span className="rounded-md bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Selected</span>}
              </span>
              <span className="block text-xs font-medium text-muted">
                {v.desc} · {v.accent}
              </span>
              {deviceNames[v.id] && <span className="block truncate text-[10px] text-faint">Uses {deviceNames[v.id]}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
