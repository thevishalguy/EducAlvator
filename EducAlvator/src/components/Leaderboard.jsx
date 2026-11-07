import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGetLeaderboard } from "../lib/api";
import { Spinner, Avatar } from "./ui";
import { Icons } from "./icons";

// Dark "Top of the Class" widget. `limit` shows the top rows with a link to the
// full rankings; without it, every row is listed.
export default function Leaderboard({ grade, selfId, limit }) {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", grade],
    queryFn: () => apiGetLeaderboard(grade, selfId),
  });
  const rows = limit ? (data || []).slice(0, limit) : data || [];

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-sidebar p-8 text-white shadow-xl">
      <div className="absolute right-0 top-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-accent opacity-20 blur-3xl" />

      <h2 className="relative z-10 mb-2 text-xl">Top of the Class</h2>
      <p className="relative z-10 mb-6 text-sm font-medium text-gray-400">Grade {grade} Leaderboard</p>

      {isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <p className="relative z-10 flex-1 text-sm font-medium text-gray-400">No one on the board yet. Play a game to get on it.</p>
      ) : (
        <ul className="relative z-10 flex-1 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`w-4 shrink-0 text-center text-sm font-bold ${row.rank === 1 ? "text-yellow-400" : "text-gray-500"}`}>
                  {row.rank}
                </span>
                <Avatar name={row.name} size={36} muted={!row.self} className="ring-sidebar" />
                <span className="truncate text-sm font-bold text-gray-200">
                  {row.name} {row.self && <span className="text-accent">(you)</span>}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-accent/10 px-2 py-1 text-xs font-bold text-accent">
                <Icons.Flame className="h-3 w-3" />
                {row.xp.toLocaleString()} XP
              </div>
            </li>
          ))}
        </ul>
      )}

      {limit && (
        <Link
          to="/app/leaderboard"
          className="relative z-10 mt-6 block w-full rounded-xl border border-white/10 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-white/5"
        >
          See Full Rankings
        </Link>
      )}
    </div>
  );
}
