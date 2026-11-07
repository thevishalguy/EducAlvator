import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gameBySlug } from "../../lib/games";
import { apiGetStudent, gradeHasGames, apiRecordGameScore } from "../../lib/api";
import { useAuth } from "../../lib/store";
import { logActivity } from "../../lib/reports";
import { Button, Badge, Spinner, UsagePill } from "../../components/ui";
import { getUsage, record, canUse, limitFor } from "../../lib/usage";

export default function PlayGame() {
  const { slug } = useParams();
  const user = useAuth((s) => s.user);
  const game = gameBySlug(slug);
  const [fullscreen, setFullscreen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [gamesUsed, setGamesUsed] = useState(0);
  const [saved, setSaved] = useState(null); // last {xp, accuracy} reported by the game
  const lastCounted = useRef(null);
  const frameRef = useRef(null); // the game iframe currently on screen
  const queryClient = useQueryClient();

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", user.id],
    queryFn: () => apiGetStudent(user.id),
  });

  // Listen for the game's postMessage when a round ends, and persist the XP to
  // the student's stats. We only accept same-origin messages from this page's own
  // game iframe and trust the host's known game (game.name), not the iframe's
  // claimed identity.
  useEffect(() => {
    if (!student || !game) return;
    const onMessage = async (e) => {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return;
      const d = e.data;
      if (!d || d.type !== "GAME_COMPLETE") return;
      const xp = Math.max(0, Math.round(Number(d.score) || 0));
      const accuracy = Math.max(0, Math.min(100, Math.round(Number(d.accuracy) || 0)));
      try {
        const updated = await apiRecordGameScore(student.id, game.name, xp, accuracy);
        queryClient.invalidateQueries({ queryKey: ["student", user.id] });
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
        setSaved({ xp, accuracy, isNewHigh: updated?.isNewHighScore });
        // Mirror the fresh scores + log the play to the parent's live report.
        const label = updated?.isNewHighScore
          ? `🏆 New High Score! ${game.name}: ${xp} XP (${accuracy}% accuracy)`
          : `Played ${game.name} · +${xp} XP (${accuracy}%)`;
        logActivity(updated, "games", label);
      } catch {
        /* ignore a bad message */
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [student, game, user.id, queryClient]);

  // Count one game play per game opened and enforce the daily cap. Keyed by
  // slug so switching games re-checks, while StrictMode re-runs don't double-count.
  useEffect(() => {
    if (!student || !game) return;
    if (!gradeHasGames(student.grade)) return; // handled by the no-games screen
    if (lastCounted.current === slug) return;
    lastCounted.current = slug;
    setBlocked(false);
    setGamesUsed(getUsage(student.id).games);
    if (!canUse(student.plan, student.id, "games", 1, student.demo)) {
      setBlocked(true);
    } else {
      setGamesUsed(record(student.id, "games").games);
    }
  }, [student, game, slug]);

  if (!game) {
    return (
      <div className="card p-10 text-center">
        <p className="text-muted">That game could not be found.</p>
        <Button as="link" to="/app/games" className="mt-4">Back to Game Center</Button>
      </div>
    );
  }
  if (isLoading) return <Spinner label="Loading game…" />;

  // No games for grades 11–12.
  if (!gradeHasGames(student.grade)) {
    return (
      <div className="card p-10 text-center">
        <h1 className="text-2xl text-ink">Games aren't available for Grade {student.grade}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Game worlds run for Grades 1–10. Head to Resources for Grade {student.grade} study material instead.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button as="link" to="/app/resources">Go to Resources</Button>
          <Button as="link" to="/app/games" variant="outline">Back to Game Center</Button>
        </div>
      </div>
    );
  }

  const gamesLimit = limitFor(student.plan, "games", student.demo);

  // Daily game-play cap reached.
  if (blocked) {
    return (
      <div className="card p-10 text-center">
        <h1 className="text-2xl text-ink">
          You've used today's game plays
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Your <span className="font-semibold capitalize">{student.plan}</span> plan allows{" "}
          {gamesLimit} game {gamesLimit === 1 ? "play" : "plays"} per day. Come back tomorrow, or ask
          a parent to upgrade for more.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button as="link" to="/app/resources">Study resources</Button>
          <Button as="link" to="/app/games" variant="outline">Back to Game Center</Button>
        </div>
      </div>
    );
  }

  // Grade is assigned automatically — the student only picks a topic in-game.
  const src = `${game.src}?grade=${student.grade}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/app/games" className="text-sm font-bold text-faint hover:text-accent">← Game Center</Link>
          <Badge>{game.subject}</Badge>
          <h1 className="text-2xl tracking-tight text-ink">{game.name}</h1>
          <Badge tone="outline">Grade {student.grade}</Badge>
          <UsagePill label="Games today" used={gamesUsed} limit={gamesLimit} />
          {saved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-tint px-2.5 py-1 text-xs font-semibold text-accent-deep">
              ✓ Saved +{saved.xp} XP · {saved.accuracy}%
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setFullscreen(true)}>Full view</Button>
          <Button as="a" href={src} target="_blank" rel="noopener" variant="outline">Open in new tab</Button>
        </div>
      </div>

      {!fullscreen && (
        <>
          <div className="overflow-hidden rounded-[2rem] border border-line bg-black shadow-xl">
            <iframe
              ref={frameRef}
              title={game.name}
              src={src}
              className="w-full"
              style={{ height: "70vh", minHeight: 420 }}
              allow="fullscreen; autoplay; gamepad"
            />
          </div>
          <p className="text-sm font-medium text-muted">
            Your grade (Grade {student.grade}) is set automatically — just choose a topic and play.
          </p>
        </>
      )}

      {/* Full view: fixed overlay with a working navigation toolbar on top */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg">
          <div className="flex items-center justify-between gap-3 bg-sidebar px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFullscreen(false)}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/5"
              >
                ← Exit full view
              </button>
              <span className="hidden text-sm font-bold text-white sm:inline">{game.name}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Grade {student.grade}</span>
            </div>
            <nav className="flex items-center gap-1">
              <Link to="/app/games" onClick={() => setFullscreen(false)} className="rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white">Game Center</Link>
              <Link to="/app" onClick={() => setFullscreen(false)} className="rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white">Dashboard</Link>
              <Link to="/app/resources" onClick={() => setFullscreen(false)} className="hidden rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white sm:block">Resources</Link>
            </nav>
          </div>
          <iframe
            ref={frameRef}
            title={game.name}
            src={src}
            className="min-h-0 w-full flex-1 bg-black"
            allow="fullscreen; autoplay; gamepad"
          />
        </div>
      )}
    </div>
  );
}
