import { useEffect, useMemo, useState } from "react";

// AI review under the assessment scores: what the student is behind on, how to
// improve, and whether results are rising or falling across attempts. Written by
// the Study Buddy's AI from this report's numbers and cached in this browser, so
// it only asks again when the report has changed.

const GAMES = ["EduRunner", "EduJumper", "EduSurfer"];

// The numbers the review is based on (the server keeps only these fields too).
function reviewData(student) {
  const stats = student.stats || {};
  const gameStats = stats.gameStats || {};
  const quizzes = (stats.quizzes?.history || [])
    .slice(0, 25)
    .map((q) => ({
      topic: q.topic,
      subject: q.subject,
      percentage: q.percentage,
      date: q.date ? new Date(q.date).toISOString() : "",
    }))
    .reverse(); // oldest first, so the trend reads left to right
  const games = {};
  for (const g of GAMES) {
    const s = gameStats[g] || {};
    games[g] = {
      rounds: s.rounds || 0,
      averageAccuracy: s.rounds ? s.accuracy || 0 : 0,
      highScore: s.highScore || stats.gameHighScores?.[g] || 0,
      accuracyByRound: (s.history || []).map((h) => h.acc),
    };
  }
  return {
    subjects: stats.subjects || { maths: 0, english: 0, science: 0 },
    quizzes,
    games,
    activity: student.activity || {},
    attendance: { present: stats.attendance?.present || 0, total: stats.attendance?.total || 0 },
    streakDays: stats.streak || 0,
    studyMinutes: stats.studyTimeMin || 0,
  };
}

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
};
const cacheKey = (id) => `educalvator.review.${id}`;

function readCache(id) {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(id)));
  } catch {
    return null;
  }
}

function writeCache(id, value) {
  try {
    localStorage.setItem(cacheKey(id), JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

const TREND_STYLE = {
  improving: { label: "Improving", icon: "↗", cls: "bg-pastel-teal text-ink" },
  declining: { label: "Downfall", icon: "↘", cls: "bg-accent-tint text-accent-deep dark:text-accent" },
  steady: { label: "Steady", icon: "→", cls: "bg-pastel-purple text-ink" },
  mixed: { label: "Mixed", icon: "↕", cls: "bg-pastel-orange text-ink" },
  "not enough data": { label: "Not enough attempts yet", icon: "•", cls: "bg-surface text-muted" },
};

export default function ReportReview({ student }) {
  const data = useMemo(() => reviewData(student), [student]);
  const attempts = data.quizzes.length + GAMES.reduce((n, g) => n + data.games[g].rounds, 0);
  const sig = useMemo(() => hash(JSON.stringify(data)), [data]);

  const cached = readCache(student.id);
  const [review, setReview] = useState(cached?.review || null);
  const [stale, setStale] = useState(cached ? cached.sig !== sig : true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: data, grade: student.grade }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.review) throw new Error(body.error || "Review failed");
      setReview(body.review);
      setStale(false);
      writeCache(student.id, { sig, review: body.review, at: Date.now() });
    } catch {
      setError("Couldn't write the review right now. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Write a review once there's something to review, and again when the report changes.
  useEffect(() => {
    const c = readCache(student.id);
    setReview(c?.review || null);
    const changed = !c || c.sig !== sig;
    setStale(changed);
    if (changed && attempts > 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id, sig]);

  const trend = TREND_STYLE[review?.trend?.direction] || TREND_STYLE["not enough data"];

  return (
    <div className="rounded-3xl border border-line bg-surface-2 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
        <div>
          <p className="eyebrow">AI review</p>
          <h4 className="text-base font-extrabold text-ink">Progress Review</h4>
        </div>
        {attempts > 0 && (
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-bg-soft disabled:opacity-60"
          >
            {loading ? "Reviewing…" : "Refresh review"}
          </button>
        )}
      </div>

      {attempts === 0 ? (
        <p className="py-2 text-center text-xs text-muted">
          Not enough activity yet. A review appears here once some quizzes or game rounds have been played.
        </p>
      ) : loading && !review ? (
        <div className="space-y-2 py-1" aria-live="polite">
          <p className="text-xs font-medium text-muted">Reviewing the report…</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : !review ? (
        <div className="py-2 text-center">
          <p className="text-xs text-muted">{error || "The review hasn't been written yet."}</p>
          <button onClick={load} className="mt-2 rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-white hover:bg-accent-deep">
            Try again
          </button>
        </div>
      ) : (
        <div className={`grid gap-3 lg:grid-cols-3 ${loading ? "opacity-70" : ""}`}>
          <section className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-faint">Where they're behind</p>
            {review.lags.length ? (
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink">
                {review.lags.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted">Nothing stands out as behind right now.</p>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-faint">How to improve</p>
            <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink">
              {review.improve.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-accent-tint text-[9px] font-extrabold text-accent-deep dark:text-accent">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-faint">Across attempts</p>
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${trend.cls}`}>
                <span aria-hidden="true">{trend.icon}</span> {trend.label}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink">{review.trend.summary}</p>
          </section>
        </div>
      )}

      {review && attempts > 0 && (
        <p className="mt-3 text-[10px] text-muted">
          {error ? `${error} ` : ""}
          {stale && !loading ? "The report has changed since this review. " : ""}
          Written by AI from this report's numbers. Check it against the scores above.
        </p>
      )}
    </div>
  );
}
