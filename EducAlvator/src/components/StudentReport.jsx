import { RingChart, SubjectBars, ScoreBars, WeekAttendanceStrip } from "./charts";
import { ACTIVITY_LABELS, timeAgo } from "../lib/reports";
import ReportReview from "./ReportReview";

// Complete real-time pictorial report:
// 1. Academic progress with subject mastery tiers
// 2. Scores & Assessment results (AI quizzes with accuracy & scores)
// 3. Game high scores with trophies, accuracy, and total XP
// 4. Attendance with today's live check-in, weekly strip, and presence status
// 5. AI review: where the student is behind, how to improve, and the trend
export default function StudentReport({ student, compact = false }) {
  const { stats = {} } = student;
  const activity = student.activity; // present on live/own reports
  const recent = student.recent || [];

  // Everything defaults to zero — the report fills in as the student uses the app.
  const subjects = stats.subjects || { maths: 0, english: 0, science: 0 };
  const attendance = stats.attendance || { present: 0, total: 0 };
  const games = stats.games || { EduRunner: 0, EduJumper: 0, EduSurfer: 0 };
  const highScores = stats.gameHighScores || { EduRunner: 0, EduJumper: 0, EduSurfer: 0 };
  const gameStats = stats.gameStats || {};
  const quizzes = stats.quizzes || { totalTaken: 0, averageScore: 0, totalPoints: 0, history: [] };

  const avg = Math.round(
    ((subjects.maths || 0) + (subjects.english || 0) + (subjects.science || 0)) / 3
  );

  const bestHighScore = Math.max(...Object.values(highScores), 0);
  const attendancePct = attendance.total ? Math.round((attendance.present / attendance.total) * 100) : 0;

  const stat = (label, value, sub) => (
    <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-0.5 text-base font-extrabold text-ink">{value}</p>
      {sub && <p className="text-[10px] font-medium text-muted">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 1. Summary Metrics Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        {stat("Streak", `🔥 ${stats.streak || 0} days`, "Consecutive")}
        {stat("Academic Avg", `${avg}%`, "Across 3 subjects")}
        {stat("Quiz Avg", `${quizzes.averageScore || 0}%`, `${quizzes.totalTaken || 0} quizzes taken`)}
        {stat("Attendance", `${attendance.present}/${attendance.total}`, `${attendancePct}% rate`)}
        {stat("Top High Score", `${bestHighScore.toLocaleString()} XP`, "Personal best")}
        {stat("Study Time", `${Math.floor((stats.studyTimeMin || 0) / 60)}h ${(stats.studyTimeMin || 0) % 60}m`, "Logged so far")}
      </div>

      {/* 2. Real-time Activity Counts */}
      {activity && (
        <div className="rounded-3xl border border-line bg-surface p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-faint">
              Activity Summary
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {Object.keys(ACTIVITY_LABELS).map((k) => (
              <div key={k} className="rounded-2xl border border-line bg-surface-2 px-3 py-2.5 text-center">
                <p className="text-lg font-extrabold text-ink">{activity[k] ?? 0}</p>
                <p className="text-[10px] font-bold text-muted">{ACTIVITY_LABELS[k]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Primary Performance Grid (Academic Progress, Attendance, Game High Scores) */}
      <div className={`grid gap-4 ${compact ? "md:grid-cols-2 2xl:grid-cols-3" : "xl:grid-cols-3"}`}>
        
        {/* Academic Progress */}
        <div className="flex flex-col rounded-3xl border border-line bg-surface-2 p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <div className="min-w-0">
              <p className="eyebrow">Academic progress</p>
              <h4 className="text-base font-extrabold text-ink">Subject Mastery</h4>
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs font-bold text-accent">Overall {avg}%</span>
          </div>
          <div className="flex-1">
            <SubjectBars subjects={subjects} />
          </div>
          <div className="mt-4 border-t border-line pt-3 text-[11px] text-muted">
            <span className="font-semibold text-ink">Learning focus:</span> Games and quizzes automatically build subject mastery.
          </div>
        </div>

        {/* Attendance */}
        <div className="flex flex-col rounded-3xl border border-line bg-surface-2 p-5">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <div className="min-w-0">
              <p className="eyebrow">Attendance</p>
              <h4 className="text-base font-extrabold text-ink">Daily Presence</h4>
            </div>
            {attendance.lastAttendedTime && (
              <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                ✓ {attendance.lastAttendedTime}
              </span>
            )}
          </div>

          <div className="my-1 flex flex-col items-center justify-center">
            <RingChart
              value={attendance.present}
              total={attendance.total}
              sublabel={`${attendance.present}/${attendance.total} days`}
              size={110}
            />
          </div>

          {/* 7-day strip */}
          <div className="mt-3 border-t border-line pt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">This Week's Attendance</p>
            <WeekAttendanceStrip history={attendance.history} present={attendance.present} total={attendance.total} />
          </div>
        </div>

        {/* Game High Scores */}
        <div className={`flex flex-col rounded-3xl border border-line bg-surface-2 p-5 ${compact ? "md:col-span-2 lg:col-span-1" : ""}`}>
          <div className="mb-2 flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <div className="min-w-0">
              <p className="eyebrow">Game high scores</p>
              <h4 className="text-base font-extrabold text-ink">XP &amp; Personal Bests</h4>
            </div>
            <span className="shrink-0 whitespace-nowrap rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
              🏆 Best {bestHighScore} XP
            </span>
          </div>

          <div className="flex-1">
            <ScoreBars games={games} highScores={highScores} />
          </div>

          {/* Game stats pills */}
          <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-line pt-3 text-center">
            {Object.keys(games).map((g) => {
              const gst = gameStats[g] || {};
              return (
                <div key={g} className="rounded-xl bg-surface px-1.5 py-1.5">
                  <p className="text-[9px] font-semibold uppercase text-muted truncate">{g}</p>
                  <p className="text-xs font-bold text-ink">
                    🏆 {highScores[g] || 0}
                  </p>
                  <p className="text-[9px] text-muted">
                    {gst.accuracy ? `${gst.accuracy}% acc` : "Active"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 4. Quiz & Assessment Scores Section */}
      <div className="rounded-3xl border border-line bg-surface-2 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
          <div>
            <p className="eyebrow">Assessment scores</p>
            <h4 className="text-base font-extrabold text-ink">Recent AI Quiz Results</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink">
              Average: <span className="text-accent">{quizzes.averageScore || avg}%</span>
            </span>
            <span className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-bold text-faint">
              {quizzes.totalTaken || quizzes.history?.length || 0} Completed
            </span>
          </div>
        </div>

        {(!quizzes.history || quizzes.history.length === 0) ? (
          <p className="py-2 text-center text-xs text-muted">
            No quiz scores recorded yet. Scores appear here immediately as your child takes AI quizzes.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {quizzes.history.slice(0, 4).map((q) => {
              const subColor =
                q.subject === "maths"
                  ? "bg-pastel-orange text-ink"
                  : q.subject === "english"
                  ? "bg-pastel-purple text-ink"
                  : "bg-pastel-teal text-ink";
              return (
                <div key={q.id || q.topic} className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-3">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${subColor}`}>
                        {q.subject || "quiz"}
                      </span>
                      <span className="text-xs font-bold text-accent">
                        {q.percentage}%
                      </span>
                    </div>
                    <p className="text-xs font-bold text-ink line-clamp-1">{q.topic}</p>
                    <p className="text-[10px] text-muted">
                      {q.score} / {q.maxScore} pts · {q.correctCount}/{q.totalQuestions} correct
                    </p>
                  </div>
                  <p className="mt-2 text-[9px] text-muted/70">{timeAgo(q.date)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. AI Progress Review */}
      <ReportReview student={student} />
    </div>
  );
}
