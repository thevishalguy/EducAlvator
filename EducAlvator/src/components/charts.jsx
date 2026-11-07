// Charts for the student report box.
// Clean utilitarian styling matching the app's aesthetic.
// All graphs start strictly from 0 with visual zero-baselines and smooth mount animations.

import { useState, useEffect } from "react";

const OPACITY = { maths: 1, english: 0.72, science: 0.5, EduRunner: 1, EduJumper: 0.75, EduSurfer: 0.55 };
const subjectLabels = { maths: "Maths", english: "English", science: "Science" };

export function RingChart({ value, total, label, sublabel, size = 120 }) {
  const targetPct = total ? Math.round((value / total) * 100) : value;
  const [animatedPct, setAnimatedPct] = useState(0);
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    // Start strictly from 0 upon mount
    setAnimatedPct(0);
    setDisplayVal(0);

    const timer = setTimeout(() => {
      setAnimatedPct(targetPct);
    }, 60);

    // Number count-up animation from 0
    if (targetPct === 0) return () => clearTimeout(timer);

    const duration = 1000;
    const startTime = performance.now();
    let animId;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayVal(Math.round(ease * targetPct));
      if (progress < 1) {
        animId = requestAnimationFrame(tick);
      }
    };
    animId = requestAnimationFrame(tick);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animId);
    };
  }, [targetPct]);

  const r = size / 2 - 11;
  const c = 2 * Math.PI * r;
  const dash = (animatedPct / 100) * c;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="8" opacity="0.2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.16, 1, 0.3, 1)" }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-bold"
          style={{ fill: "var(--ink)", fontSize: 24, fontWeight: 700 }}
        >
          {displayVal}%
        </text>
        {sublabel && (
          <text x="50%" y="64%" textAnchor="middle" style={{ fill: "var(--muted)", fontSize: 10.5, fontWeight: 500 }}>
            {sublabel}
          </text>
        )}
      </svg>
      {label && <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>}
    </div>
  );
}

function masteryBadge(val) {
  if (val >= 85) return { label: "Mastered", tone: "bg-accent-tint text-accent-deep font-semibold" };
  if (val >= 70) return { label: "Proficient", tone: "bg-surface text-ink font-medium border border-line" };
  if (val >= 50) return { label: "Developing", tone: "bg-surface text-muted font-normal border border-line" };
  return { label: "Foundational", tone: "bg-bg-soft text-muted font-normal" };
}

export function SubjectBars({ subjects = {} }) {
  const entries = Object.entries(subjects);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Start progress bars strictly from 0 upon mount
    setAnimated(false);
    const timer = setTimeout(() => {
      setAnimated(true);
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-2.5">
      {entries.map(([key, val]) => {
        const badge = masteryBadge(val);
        const targetWidth = Math.min(100, Math.max(0, val));
        const currentWidth = animated ? targetWidth : 0;
        return (
          <div key={key}>
            {/* Subject name + percentage: both always visible (never truncated away) */}
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">{subjectLabels[key] || key}</span>
              <span className="shrink-0 text-xs font-bold text-ink">{animated ? val : 0}%</span>
            </div>
            {/* Visual bar container starting from 0 baseline */}
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-ink/5">
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${currentWidth}%`,
                  opacity: OPACITY[key] ?? 1,
                  transition: "width 1.1s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            </div>
            {/* Mastery tier on its own line so it never crowds the name/percentage */}
            <div className="mt-1 text-right">
              <span className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.tone}`}>
                {badge.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ScoreBars({ games = {}, highScores = {} }) {
  const entries = Object.entries(games);
  const max = Math.max(...entries.map(([, v]) => v), 100);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Start game bars strictly from 0 baseline upon mount
    setAnimated(false);
    const timer = setTimeout(() => {
      setAnimated(true);
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full">
      {/* Visual Zero Baseline Indicators */}
      <div className="mb-1 flex items-center justify-between text-[9px] font-bold text-muted">
        <span>0 XP (Base)</span>
        <span>Max: {max.toLocaleString()} XP</span>
      </div>

      {/* Bar container with clear 0 baseline */}
      <div className="relative flex items-end justify-around gap-2 border-b-2 border-line-strong pb-0.5" style={{ height: 110 }}>
        {/* Baseline marker at 0 */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-line/30" />

        {entries.map(([key, val]) => {
          const high = highScores[key] || 0;
          const targetHeight = Math.max(4, (val / max) * 85);
          const currentHeight = animated ? targetHeight : 0;
          return (
            <div key={key} className="flex h-full flex-1 flex-col items-center justify-end">
              <span className={`mb-1 text-[10px] font-bold text-ink transition-opacity duration-700 ${animated ? "opacity-100" : "opacity-0"}`}>
                {val.toLocaleString()} XP
              </span>
              <div
                className="w-full max-w-[42px] rounded-t-lg bg-accent"
                style={{
                  height: `${currentHeight}px`,
                  opacity: OPACITY[key] ?? 1,
                  transition: "height 1.1s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-around gap-2 pt-1">
        {entries.map(([key]) => {
          const high = highScores[key] || 0;
          return (
            <div key={key} className="min-w-0 flex-1 text-center">
              <p className="truncate text-[11px] font-semibold text-ink">{key}</p>
              <p className="text-[10px] text-muted">
                Best: <span className="font-bold text-accent">{high}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 7-Day attendance week strip — reflects REAL check-in history (Mon–Sun of the
// current week). A day is "present" only if the student actually checked in that
// date. Starts empty and fills in as they use the app.
const isoDate = (d) => d.toISOString().slice(0, 10);

export function WeekAttendanceStrip({ history = [] }) {
  // Single-letter day labels keep the 7 columns legible in narrow report cards;
  // the full day name is available on hover. Status is shown by the icon, not a
  // word, so nothing overflows the cell.
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const full = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const now = new Date();
  const dow = now.getDay(); // 0 Sun .. 6 Sat
  const monday = new Date(now);
  monday.setDate(now.getDate() + (dow === 0 ? -6 : 1 - dow));
  const todayIso = isoDate(now);
  const attended = new Set((history || []).map((h) => h?.date).filter(Boolean));

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-1 text-center">
        {labels.map((d, i) => {
          const day = new Date(monday);
          day.setDate(monday.getDate() + i);
          const ds = isoDate(day);
          const isToday = ds === todayIso;
          const isFuture = ds > todayIso;
          const isPresent = attended.has(ds);
          return (
            <div
              key={i}
              title={full[i]}
              className={`flex flex-col items-center gap-0.5 rounded-xl border py-1 transition-colors ${
                isPresent
                  ? isToday
                    ? "border-accent bg-accent-tint/60 text-accent-deep"
                    : "border-line bg-surface text-ink"
                  : isToday
                  ? "border-accent/50 bg-surface text-ink"
                  : "border-line bg-surface-2/40 text-muted"
              }`}
            >
              <span className="text-[9px] font-semibold uppercase leading-none">{d}</span>
              <span className="grid h-4 w-4 place-items-center text-[11px] font-bold leading-none">
                {isPresent ? (
                  <span className="text-accent">✓</span>
                ) : (
                  <span className="text-muted/40">{isFuture ? "·" : "✕"}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
