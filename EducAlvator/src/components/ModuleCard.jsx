import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Badge } from "./ui";
import { Icons } from "./icons";

// Card look and title for each game world, by slug.
export const MODULE_STYLE = {
  maths: { bg: "bg-pastel-orange", title: "EduRunner: Fractions & Algebra" },
  english: { bg: "bg-pastel-purple", title: "EduJumper: Grammar Quest" },
  science: { bg: "bg-pastel-teal", title: "EduSurfer: Science & Physics" },
};

const bookmarkKey = (uid) => `educalvator.bookmarks.${uid}`;
function readBookmarks(uid) {
  try {
    return JSON.parse(localStorage.getItem(bookmarkKey(uid))) || [];
  } catch {
    return [];
  }
}

// Saved (bookmarked) game worlds, in the order they were saved.
export function useBookmarks(uid) {
  const [saved, setSaved] = useState(() => readBookmarks(uid));
  const toggle = (slug) => {
    const next = saved.includes(slug) ? saved.filter((s) => s !== slug) : [...saved, slug];
    try {
      localStorage.setItem(bookmarkKey(uid), JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
    setSaved(next);
  };
  return [saved, toggle];
}

// Saved games first (the most recently saved at the very front), then the rest
// in their usual order.
export function savedFirst(games, saved) {
  const rank = (g) => (saved.includes(g.slug) ? saved.length - saved.indexOf(g.slug) : 0);
  return [...games].sort((a, b) => rank(b) - rank(a));
}

// Rounds played against the next ten-round milestone, so the bar always moves.
export function roundsProgress(student, game) {
  const rounds = student?.stats?.gameStats?.[game.name]?.rounds || 0;
  return { rounds, goal: Math.ceil((rounds + 1) / 10) * 10 };
}

export default function ModuleCard({ game, student, classmates = [], hasGames = true, saved = false, onToggleSave }) {
  const navigate = useNavigate();
  const style = MODULE_STYLE[game.slug];
  const { rounds, goal } = roundsProgress(student, game);

  const others = classmates.filter((c) => !c.self);
  const shown = others.slice(0, 3);
  const more = others.length - shown.length;

  return (
    <div className={`${style.bg} relative flex h-full flex-col rounded-3xl border border-black/5 p-6 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.05)] transition-transform duration-300 hover:-translate-y-1 dark:border-white/5`}>
      <div className="mb-6 flex items-start justify-between">
        <Badge>{game.subject}</Badge>
        <button
          onClick={() => onToggleSave?.(game.slug)}
          aria-label={saved ? `Remove ${game.name} bookmark` : `Bookmark ${game.name}`}
          aria-pressed={saved}
          className={`transition-colors hover:text-accent ${saved ? "text-accent" : "text-faint"}`}
        >
          <Icons.Bookmark className={`h-6 w-6 ${saved ? "fill-current" : ""}`} />
        </button>
      </div>

      <h3 className="mb-6 flex-1 text-xl leading-tight text-ink">{style.title}</h3>

      <div className="space-y-4">
        <div className="mb-1 flex justify-between text-xs font-bold text-muted">
          <span>Progress</span>
          <span>{rounds}/{goal} rounds</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div
            className="h-2 rounded-full bg-accent transition-all duration-1000 ease-out"
            style={{ width: `${(rounds / goal) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex -space-x-2">
            {shown.length ? (
              shown.map((c) => <Avatar key={c.id} name={c.name} size={32} muted />)
            ) : (
              <Avatar name={student.name} size={32} />
            )}
            {more > 0 && (
              <div className="grid h-8 w-8 place-items-center rounded-full bg-surface text-[10px] font-bold text-muted shadow-sm ring-2 ring-bg">
                +{more}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate(`/app/games/${game.slug}`)}
            disabled={!hasGames}
            className="flex items-center gap-1 rounded-full bg-accent px-5 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {hasGames ? "Continue" : "Not available"}
          </button>
        </div>
      </div>
    </div>
  );
}
