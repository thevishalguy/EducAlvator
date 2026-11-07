import { useState, useEffect, useRef, useMemo } from "react";
import { NavLink, Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Logo, Avatar } from "./ui";
import { Icons } from "./icons";
import { useAuth, useAppTheme } from "../lib/store";
import { useChat } from "../lib/chatStore";
import { apiGetStudent, apiGetParent, apiGetResources } from "../lib/api";
import { getUsage, limitFor } from "../lib/usage";
import { getLocalActivity, timeAgo } from "../lib/reports";
import { matchesQuery, recordSearch, removeSearch, searchHistory } from "../lib/search";
import { GAMES } from "../lib/games";
import { MODULE_STYLE } from "./ModuleCard";
import EduPanelButton from "./EduPanelButton";

/* ---------------- Public nav (home / privacy) ---------------- */
export function PublicNav() {
  const navigate = useNavigate();
  const items = [
    ["Features", "/#features"],
    ["Motive", "/#motive"],
    ["Pricing", "/#pricing"],
    ["About", "/#about"],
  ];
  return (
    <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 lg:px-10">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {items.map(([label, href]) => (
            <a key={label} href={href} className="text-sm font-bold text-faint transition-colors hover:text-accent">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/sign-in" className="hidden px-3 py-2 text-sm font-bold text-ink transition-colors hover:text-accent sm:block">
            Sign in
          </Link>
          <button
            onClick={() => navigate("/parent-sign-up")}
            className="whitespace-nowrap rounded-full bg-accent px-4 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-accent-deep sm:px-5"
          >
            Sign up
          </button>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-sidebar text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 md:flex-row md:items-center md:justify-between lg:px-10">
        <Logo inverse />
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-gray-400">
          <Link to="/sign-in" className="hover:text-white">Sign in</Link>
          <Link to="/parent-sign-up" className="hover:text-white">Create account</Link>
          <a href="/#pricing" className="hover:text-white">Pricing</a>
          <Link to="/privacy" className="hover:text-white">Privacy</Link>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-5 py-4 text-xs font-medium text-gray-500 lg:px-10">
          © {new Date().getFullYear()} EducAlvator · A learning prototype
        </p>
      </div>
    </footer>
  );
}

/* ---------------- App shell (student / parent) ---------------- */
function SidebarItem({ to, end, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
          isActive
            ? "bg-accent text-white shadow-[0_4px_12px_rgba(224,93,67,0.3)]"
            : "text-gray-400 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-semibold tracking-wide">{label}</span>
    </NavLink>
  );
}

// Past Study Buddy chats, listed below the "Study Buddy" nav item. Clicking one
// reopens it; right-clicking opens a menu to rename or delete it.
function ChatHistory({ uid, onNavigate }) {
  const bucket = useChat((s) => s.byUser[uid]);
  const openSession = useChat((s) => s.openSession);
  const renameSession = useChat((s) => s.renameSession);
  const deleteSession = useChat((s) => s.deleteSession);
  const navigate = useNavigate();

  const [menu, setMenu] = useState(null); // { id, x, y } — open context menu
  const [editingId, setEditingId] = useState(null); // id of the row being renamed
  const [editValue, setEditValue] = useState("");

  // Close the context menu on any outside click or Escape.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e) => e.key === "Escape" && setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const sessions = (bucket?.sessions || []).slice().sort((a, b) => b.updatedAt - a.updatedAt);
  if (!sessions.length) return null;

  const open = (id) => {
    openSession(uid, id);
    onNavigate?.();
    navigate("/app/chat");
  };
  const openMenu = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ id, x: Math.min(e.clientX, window.innerWidth - 150), y: e.clientY });
  };
  const startRename = () => {
    const s = sessions.find((x) => x.id === menu.id);
    setEditingId(menu.id);
    setEditValue(s?.title || "");
    setMenu(null);
  };
  const commitRename = () => {
    if (editingId) renameSession(uid, editingId, editValue);
    setEditingId(null);
  };
  const doDelete = () => {
    // First click arms the confirm; second click deletes (no blocking dialog).
    if (!menu.confirming) {
      setMenu({ ...menu, confirming: true });
      return;
    }
    deleteSession(uid, menu.id);
    setMenu(null);
  };

  return (
    <div className="mt-3">
      <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Chat History</p>
      <div className="flex max-h-44 flex-col gap-0.5 overflow-y-auto">
        {sessions.map((s) =>
          editingId === s.id ? (
            <input
              key={s.id}
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditingId(null);
              }}
              onBlur={commitRename}
              className="mx-0.5 rounded-lg border border-accent bg-white/5 px-3 py-1.5 text-xs text-white outline-none"
            />
          ) : (
            <button
              key={s.id}
              onClick={() => open(s.id)}
              onContextMenu={(e) => openMenu(e, s.id)}
              title={`${s.title}  (right-click to rename or delete)`}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-left text-xs font-medium transition ${
                s.id === bucket.activeId ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M4 5h16v11H9l-5 4V5Z" />
              </svg>
              <span className="truncate">{s.title}</span>
            </button>
          )
        )}
      </div>

      {/* Right-click menu: Rename / Delete */}
      {menu && (
        <div
          className="fixed z-50 w-36 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl"
          style={{ top: menu.y, left: menu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={startRename} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-ink hover:bg-bg-soft">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
            </svg>
            Rename
          </button>
          <button onClick={doDelete} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-accent hover:bg-bg-soft">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            </svg>
            {menu.confirming ? "Click to confirm" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

// "Study Buddy Usage: NN%" — share of the daily question allowance used so far.
function StudyBuddyUsage({ uid, plan }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const compute = () => {
      const used = getUsage(uid).questions || 0;
      const lim = limitFor(plan, "questions");
      const cap = Number.isFinite(lim) ? lim : 80; // unlimited plan: gauge against a soft cap
      setPct(cap ? Math.min(100, Math.round((used / cap) * 100)) : 0);
    };
    compute();
    const t = setInterval(compute, 3000); // reflect new questions as they're asked
    return () => clearInterval(t);
  }, [uid, plan]);
  return (
    <div className="mx-0.5 mt-3 rounded-xl bg-white/5 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white">Study Buddy Usage</p>
        <p className="text-xs font-semibold text-accent">{pct}%</p>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Promo box at the foot of the sidebar. Its wording follows the account's real
// plan, and it leads to where the plan is shown (only parents can change it).
function PlanPromo({ plan, to, onNavigate }) {
  const navigate = useNavigate();
  const copy =
    plan === "max"
      ? { title: "You're on Max", body: "All premium games & AI features are unlocked.", cta: "View Plan" }
      : plan === "pro"
      ? { title: "Level Up to Max", body: "Add a second learner and unlimited uploads.", cta: "Upgrade Now" }
      : { title: "Level Up to Pro", body: "Unlock all premium games & AI features.", cta: "Upgrade Now" };
  return (
    <div className="group relative mt-4 shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-[#E05D43] to-[#c95138] p-6 text-white shadow-xl">
      <div className="absolute right-0 top-0 p-4 opacity-20">
        <Icons.ArrowUpRight className="h-16 w-16 -translate-y-4 translate-x-4 transform transition-transform duration-500 group-hover:scale-110" />
      </div>
      <h4 className="relative z-10 mb-1 text-xl font-bold">{copy.title}</h4>
      <p className="relative z-10 mb-5 text-sm text-white/80">{copy.body}</p>
      <button
        onClick={() => {
          onNavigate?.();
          navigate(to);
        }}
        className="relative z-10 w-full rounded-xl bg-white py-2.5 text-sm font-extrabold text-[#E05D43] shadow-sm transition-colors hover:bg-gray-50"
      >
        {copy.cta}
      </button>
    </div>
  );
}

// Closes a header dropdown on any click outside it or on Escape.
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

const dropdownClass = "absolute right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl";

// Places the header search can jump to directly.
const SEARCH_PAGES = [
  { label: "Dashboard", to: "/app" },
  { label: "Game Center", to: "/app/games" },
  { label: "Resources", to: "/app/resources" },
  { label: "Study Buddy", to: "/app/chat" },
  { label: "Leaderboard", to: "/app/leaderboard" },
  { label: "Settings", to: "/app/settings" },
];

// "Search courses, lessons…": suggestions appear as you type, like a web search.
// Terms you search most often come first; then pages, games and study PDFs that
// match; and the last row always offers to ask the Study Buddy.
function HeaderSearch({ uid, grade }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [historyVersion, setHistoryVersion] = useState(0);
  const boxRef = useRef(null);
  const { data: resources } = useQuery({
    queryKey: ["resources", grade],
    queryFn: () => apiGetResources(grade),
    enabled: !!grade,
  });

  // Keep the box in step with the search shown on the Resources page.
  const urlQuery = location.pathname === "/app/resources" ? new URLSearchParams(location.search).get("q") || "" : null;
  useEffect(() => {
    if (urlQuery !== null) setQ(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const term = q.trim();
  const suggestions = useMemo(() => {
    const rows = [];
    const seen = new Set();
    const add = (row) => {
      const key = row.label.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      rows.push(row);
    };
    for (const h of searchHistory(uid, term).slice(0, term ? 4 : 6)) {
      add({ kind: "history", label: h.term, run: () => submit(h.term) });
    }
    if (term) {
      for (const p of SEARCH_PAGES.filter((p) => matchesQuery(p.label, term))) {
        add({ kind: "page", label: p.label, run: () => go(p.label, p.to) });
      }
      for (const g of GAMES) {
        const title = MODULE_STYLE[g.slug].title;
        if (matchesQuery(`${title} ${g.subject}`, term)) add({ kind: "game", label: title, run: () => go(title, `/app/games/${g.slug}`) });
      }
      for (const r of (resources || []).filter((r) => matchesQuery(`${r.title} ${r.subject}`, term)).slice(0, 5)) {
        add({ kind: "resource", label: r.title, hint: r.subject, run: () => submit(r.title) });
      }
    }
    return rows.slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, uid, resources, historyVersion]);

  const rows = term
    ? [...suggestions, { kind: "ask", label: `Ask Study Buddy about "${term}"`, run: () => ask(term) }]
    : suggestions;

  const finish = (text) => {
    recordSearch(uid, text);
    setHistoryVersion((v) => v + 1);
    setOpen(false);
    setActive(-1);
  };
  function submit(text) {
    const t = text.trim();
    setQ(t);
    if (t) finish(t);
    navigate(t ? `/app/resources?q=${encodeURIComponent(t)}` : "/app/resources");
  }
  function go(label, to) {
    finish(label);
    setQ("");
    navigate(to);
  }
  function ask(text) {
    finish(text);
    setQ("");
    navigate("/app/chat", { state: { ask: text } });
  }

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      const n = rows.length;
      if (!n) return;
      setActive((a) => (e.key === "ArrowDown" ? (a + 1) % n : (a - 1 + n) % n));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const iconFor = (kind) =>
    kind === "history" ? (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6M3 4v4h4M12 7.5V12l3 2" />
      </svg>
    ) : kind === "game" ? (
      <Icons.Gamepad2 className="h-4 w-4" />
    ) : kind === "resource" ? (
      <Icons.Document className="h-4 w-4" />
    ) : kind === "ask" ? (
      <Icons.Message className="h-4 w-4" />
    ) : (
      <Icons.Search className="h-4 w-4" />
    );

  return (
    <div ref={boxRef} className="relative hidden md:block">
      <form
        role="search"
        className="group relative"
        onSubmit={(e) => {
          e.preventDefault();
          if (open && active >= 0 && rows[active]) rows[active].run();
          else submit(q);
        }}
      >
        <Icons.Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint transition-colors group-focus-within:text-accent" />
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open && rows.length > 0}
          aria-controls="header-search-list"
          aria-activedescendant={active >= 0 ? `header-search-${active}` : undefined}
          aria-autocomplete="list"
          aria-label="Search courses and lessons"
          placeholder="Search courses, lessons..."
          autoComplete="off"
          className="w-56 rounded-full border border-line bg-surface py-2.5 pl-11 pr-6 text-sm font-semibold text-ink shadow-sm transition-shadow placeholder:text-faint focus:border-accent/30 focus:outline-none focus:ring-2 focus:ring-accent/20 xl:w-72"
        />
      </form>
      {open && rows.length > 0 && (
        <ul id="header-search-list" role="listbox" className="absolute left-0 top-full z-30 mt-2 w-80 max-w-[85vw] overflow-hidden rounded-2xl border border-line bg-surface py-2 shadow-xl xl:w-96">
          {!term && <li className="px-4 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-faint">Your searches</li>}
          {rows.map((r, i) => (
            <li
              key={`${r.kind}-${r.label}`}
              id={`header-search-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={r.run}
              onMouseEnter={() => setActive(i)}
              className={`group/row flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm ${i === active ? "bg-bg-soft" : ""}`}
            >
              <span className={r.kind === "history" || r.kind === "ask" ? "text-accent" : "text-faint"}>{iconFor(r.kind)}</span>
              <span className={`min-w-0 flex-1 truncate ${r.kind === "history" ? "font-bold text-accent-deep dark:text-accent" : "font-semibold text-ink"}`}>
                {r.label}
              </span>
              {r.hint && <span className="shrink-0 text-xs font-bold text-faint">{r.hint}</span>}
              {r.kind === "history" && (
                <button
                  type="button"
                  aria-label={`Remove "${r.label}" from your searches`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSearch(uid, r.label);
                    setHistoryVersion((v) => v + 1);
                  }}
                  className="shrink-0 rounded-md px-1 text-faint opacity-0 hover:text-ink group-hover/row:opacity-100"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Bell: the latest activity saved on this device (the student's own, or the
// parent's children). The dot shows when something is new since it was last opened.
const SEEN_KEY = "educalvator.notifications_seen";
function readSeen() {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}
function NotificationBell({ uid, students: kids }) {
  const { open, setOpen, ref } = useDropdown();
  const [items, setItems] = useState([]);
  const [seenAt, setSeenAt] = useState(readSeen);
  const kidList = kids?.map((k) => `${k.id}:${k.name}`).join("|");

  useEffect(() => {
    const load = () => {
      const rows = kids
        ? kids.flatMap((k) =>
            getLocalActivity(k.id).recent.map((r) => ({ ...r, label: `${k.name.split(" ")[0]}: ${r.label}` }))
          )
        : getLocalActivity(uid).recent;
      setItems(rows.slice().sort((a, b) => b.at - a.at).slice(0, 8));
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, kidList]);

  const unread = items.some((i) => i.at > seenAt);
  const toggle = () => {
    if (!open) {
      const now = Date.now();
      setSeenAt(now);
      try {
        localStorage.setItem(SEEN_KEY, String(now));
      } catch {
        /* storage unavailable */
      }
    }
    setOpen(!open);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} aria-label="Notifications" className="relative p-2 text-faint transition-colors hover:text-ink">
        <Icons.Bell className="h-6 w-6" />
        {unread && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-bg bg-accent" />}
      </button>
      {open && (
        <div className={`${dropdownClass} w-80 max-w-[85vw]`}>
          <p className="border-b border-line px-4 py-3 text-sm font-extrabold text-ink">Recent activity</p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm font-medium text-muted">Nothing yet. Activity shows up here as it happens.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((i, n) => (
                <li key={`${i.at}-${n}`} className="border-b border-line px-4 py-3 last:border-0">
                  <p className="line-clamp-2 text-sm font-semibold text-ink">{i.label}</p>
                  <p className="mt-0.5 text-xs font-medium text-muted">{timeAgo(i.at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Account pill: name + grade, opening a menu with the email, Settings and Log out.
function ProfilePill({ user, subtitle, settingsTo, onSignOut }) {
  const { open, setOpen, ref } = useDropdown();
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        className="flex items-center gap-3 rounded-full border border-line bg-surface py-1.5 pl-2 pr-4 shadow-sm transition-shadow hover:shadow-md"
      >
        <Avatar name={user?.name} size={36} />
        <span className="hidden text-left sm:block">
          <span className="mb-0.5 block whitespace-nowrap text-sm font-bold leading-none text-ink">{user?.name}</span>
          <span className="block whitespace-nowrap text-[10px] font-bold uppercase leading-none tracking-wider text-accent">{subtitle}</span>
        </span>
      </button>
      {open && (
        <div className={`${dropdownClass} w-64`}>
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-bold text-ink">{user?.name}</p>
            <p className="truncate text-xs font-medium text-muted">{user?.email}</p>
          </div>
          <Link
            to={settingsTo}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-bg-soft"
          >
            <Icons.Settings className="h-5 w-5 text-faint" />
            Settings
          </Link>
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-ink transition-colors hover:bg-bg-soft"
          >
            <Icons.Logout className="h-5 w-5 text-faint" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ role }) {
  useAppTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isStudent = role === "student";
  const { data: student } = useQuery({
    queryKey: ["student", user?.id],
    queryFn: () => apiGetStudent(user.id),
    enabled: isStudent && !!user?.id,
  });
  const { data: parent } = useQuery({
    queryKey: ["parent", user?.id],
    queryFn: () => apiGetParent(user.id),
    enabled: !isStudent && !!user?.id,
  });
  const plan = (isStudent ? student?.plan : parent?.plan) || "free";

  const studentNav = [
    { to: "/app", end: true, icon: Icons.Dashboard, label: "Dashboard" },
    { to: "/app/games", icon: Icons.Gamepad2, label: "Game Center" },
    { to: "/app/resources", icon: Icons.BookOpen, label: "Resources" },
    { to: "/app/chat", icon: Icons.Message, label: "Study Buddy" },
    { to: "/app/leaderboard", icon: Icons.Trophy, label: "Leaderboard" },
    { to: "/app/settings", icon: Icons.Settings, label: "Settings" },
  ];
  const parentNav = [
    { to: "/parent", end: true, icon: Icons.Dashboard, label: "Family Dashboard" },
    { to: "/parent/settings", icon: Icons.Settings, label: "Settings" },
  ];
  const items = role === "parent" ? parentNav : studentNav;

  const doSignOut = () => {
    signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-bg font-sans">
      {/* Sidebar: fixed on desktop, a slide-in drawer on smaller screens */}
      {open && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed left-0 top-0 z-30 flex h-screen w-72 flex-col bg-sidebar p-6 transition-transform lg:z-20 lg:translate-x-0 lg:shadow-2xl ${
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="mb-12 shrink-0 px-2">
          <Logo to={role === "parent" ? "/parent" : "/app"} inverse />
        </div>

        <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2">
          <nav className="space-y-1.5" onClick={() => setOpen(false)}>
            {items.map((it) => (
              <SidebarItem key={it.to} {...it} />
            ))}
          </nav>
          {/* Past chats and today's allowance, students only. */}
          {isStudent && user?.id && <ChatHistory uid={user.id} onNavigate={() => setOpen(false)} />}
          {isStudent && user?.id && <StudyBuddyUsage uid={user.id} plan={plan} />}
        </div>

        <PlanPromo plan={plan} to={isStudent ? "/app/settings" : "/parent"} onNavigate={() => setOpen(false)} />
      </aside>

      <main className="relative min-w-0 flex-1 p-5 sm:p-8 lg:ml-72 lg:p-10">
        {/* Top header */}
        <header className="relative z-10 mb-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              aria-label="Menu"
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-ink shadow-sm lg:hidden"
            >
              <Icons.Menu className="h-5 w-5" />
            </button>
            <div className="hidden whitespace-nowrap text-sm font-bold text-faint xl:block">
              Welcome to <span className="text-accent">EducAlvator</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            {isStudent && <HeaderSearch uid={user?.id} grade={student?.grade} />}
            {/* The theme is changed in Settings, not from the header. */}
            <NotificationBell uid={user?.id} students={isStudent ? undefined : parent?.students || []} />
            <div className="relative">
              <ProfilePill
                user={user}
                subtitle={isStudent ? (student ? `Grade ${student.grade}` : "Student") : "Parent"}
                settingsTo={isStudent ? "/app/settings" : "/parent/settings"}
                onSignOut={doSignOut}
              />
              {/* Students: EduPanel download, just under the account button. */}
              {isStudent && (
                <div className="absolute right-0 top-full mt-2">
                  <EduPanelButton />
                </div>
              )}
            </div>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
