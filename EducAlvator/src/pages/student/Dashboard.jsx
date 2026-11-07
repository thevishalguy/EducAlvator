import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { apiGetStudent, apiCheckInAttendance, apiGetLeaderboard, apiGetResources, gradeHasGames } from "../../lib/api";
import { useAuth } from "../../lib/store";
import { useChat } from "../../lib/chatStore";
import { GAMES } from "../../lib/games";
import { syncReport, getLocalActivity, timeAgo } from "../../lib/reports";
import { Spinner } from "../../components/ui";
import { Icons } from "../../components/icons";
import ModuleCard, { MODULE_STYLE, roundsProgress, useBookmarks, savedFirst } from "../../components/ModuleCard";
import StudentReport from "../../components/StudentReport";
import Leaderboard from "../../components/Leaderboard";

function ActivityItem({ title, category, duration, icon: Icon, iconBg, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group -mx-4 flex w-[calc(100%+2rem)] items-center justify-between gap-3 rounded-xl border-b border-line px-4 py-4 text-left transition-colors last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-105 ${iconBg}`}>
          <Icon className="h-6 w-6 text-ink" />
        </div>
        <div className="min-w-0">
          <h4 className="mb-1 truncate text-sm font-bold text-ink">{title}</h4>
          <p className="truncate text-xs font-medium text-muted">{category}</p>
        </div>
      </div>
      <div className="shrink-0 rounded-lg border border-line bg-bg-soft px-3 py-1.5 text-xs font-bold text-faint">
        {duration}
      </div>
    </button>
  );
}

// Games and quizzes finished in the last 7 days (the "modules" in the greeting).
function modulesThisWeek(recent) {
  const weekAgo = Date.now() - 7 * 86400000;
  return recent.filter((r) => (r.type === "games" || r.type === "quizzes") && r.at >= weekAgo).length;
}

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  // Bookmarked game worlds are listed first.
  const [saved, toggleSaved] = useBookmarks(user.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: student, isLoading } = useQuery({
    queryKey: ["student", user.id],
    queryFn: () => apiGetStudent(user.id),
  });
  const { data: board } = useQuery({
    queryKey: ["leaderboard", student?.grade],
    queryFn: () => apiGetLeaderboard(student.grade, student.id),
    enabled: !!student,
  });
  const { data: resources } = useQuery({
    queryKey: ["resources", student?.grade],
    queryFn: () => apiGetResources(student.grade),
    enabled: !!student,
  });
  const sessions = useChat((s) => s.byUser[user.id]?.sessions);

  // Record today's attendance check-in locally, then notify the parent view.
  useEffect(() => {
    if (!student?.id) return;
    apiCheckInAttendance(student.id).then(() => {
      queryClient.invalidateQueries({ queryKey: ["student", user.id] });
      syncReport(student);
    });
  }, [student?.id, user.id, queryClient]);

  if (isLoading) return <Spinner label="Loading your space…" />;

  // Fold this student's own activity into the report they see.
  const reportStudent = { ...student, ...getLocalActivity(student.id) };
  const done = modulesThisWeek(reportStudent.recent);
  const hasGames = gradeHasGames(student.grade);

  // "My Next Lessons": the least-played game, a PDF per subject, and the latest chat.
  const nextGame = GAMES.slice().sort((a, b) => roundsProgress(student, a).rounds - roundsProgress(student, b).rounds)[0];
  const pdf = (subjectKey) => (resources || []).find((r) => r.subjectKey === subjectKey);
  const pdfSize = (r) => `${r.sizeKB} KB`;
  const lastChat = (sessions || []).slice().sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const sciencePdf = pdf("science");
  const englishPdf = pdf("english");

  return (
    <div>
      {/* Hero */}
      <section className="mb-10">
        <h1 className="page-title mb-2">Hello, {student.name.split(" ")[0]}!</h1>
        <p className="text-lg font-medium text-muted">
          You've completed{" "}
          <span className="font-bold text-accent">
            {done} {done === 1 ? "module" : "modules"}
          </span>{" "}
          this week. {done ? "Keep it up!" : "Pick a game below to get started."}
        </p>
      </section>

      {/* Game modules */}
      <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8 xl:grid-cols-3">
        {savedFirst(GAMES, saved).map((g) => (
          <ModuleCard
            key={g.slug}
            game={g}
            student={student}
            classmates={board || []}
            hasGames={hasGames}
            saved={saved.includes(g.slug)}
            onToggleSave={toggleSaved}
          />
        ))}
      </section>

      {/* Next lessons + leaderboard */}
      <section className="mb-10 grid grid-cols-1 gap-6 lg:gap-8 xl:grid-cols-12">
        <div className="card p-8 xl:col-span-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl text-ink">My Next Lessons</h2>
            <Link to="/app/resources" className="text-sm font-bold text-accent hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {hasGames && (
              <ActivityItem
                title={MODULE_STYLE[nextGame.slug].title}
                category={`${nextGame.subject} · Game Center`}
                duration="10 questions"
                icon={Icons.Gamepad2}
                iconBg="bg-pastel-orange"
                onClick={() => navigate(`/app/games/${nextGame.slug}`)}
              />
            )}
            {sciencePdf && (
              <ActivityItem
                title={`${sciencePdf.title} PDF`}
                category="Science Resources"
                duration={pdfSize(sciencePdf)}
                icon={Icons.Document}
                iconBg="bg-pastel-teal"
                onClick={() => navigate("/app/resources")}
              />
            )}
            <ActivityItem
              title={lastChat ? lastChat.title : "Ask your first question"}
              category="Study Buddy AI"
              duration={lastChat ? timeAgo(lastChat.updatedAt) : "Start"}
              icon={Icons.Message}
              iconBg="bg-bg-soft"
              onClick={() => navigate("/app/chat")}
            />
            {englishPdf && (
              <ActivityItem
                title={englishPdf.title}
                category="English Resources"
                duration={pdfSize(englishPdf)}
                icon={Icons.Play}
                iconBg="bg-pastel-purple"
                onClick={() => navigate("/app/resources")}
              />
            )}
          </div>
        </div>

        <div className="xl:col-span-4">
          <Leaderboard grade={student.grade} selfId={student.id} limit={4} />
        </div>
      </section>

      {/* Report */}
      <section className="card p-8">
        <div className="mb-6">
          <h2 className="text-2xl text-ink">Your Report</h2>
          <p className="mt-1 text-sm font-medium text-muted">This month at a glance</p>
        </div>
        <StudentReport student={reportStudent} />
      </section>
    </div>
  );
}
