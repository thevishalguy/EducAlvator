// Student report — LOCAL ONLY. No cloud, no Firestore.
//
// All report/progress data lives in the browser (localStorage): the student's
// session writes it, and the parent's session — in the SAME browser — reads it,
// updating across tabs via storage events + a BroadcastChannel. Nothing is sent
// anywhere. (Login credentials are separate: EducAlvator's own server keeps them as
// password hashes; this file does not touch them.)

const DB_KEY = "educalvator.db.v6"; // must match api.js (the student/parent data layer)
const ACT_KEY = "educalvator.activity.v2"; // cumulative activity + recent feed, per student id
const PULSE_KEY = "educalvator.reports_pulse"; // cross-tab "something changed" ping (also pinged by api.js write())
const CHANNEL = "educalvator_reports";
const RECENT_MAX = 14;

// Activity surfaced in the report. (Daily usage caps live separately in usage.js.)
export const ACTIVITY_TYPES = ["questions", "games", "quizzes", "flashcards", "resources"];
export const ACTIVITY_LABELS = {
  questions: "Questions asked",
  games: "Games played",
  quizzes: "Quizzes taken",
  flashcards: "Flashcard decks",
  resources: "PDFs opened",
};

const emptyActivity = () => ({ questions: 0, games: 0, quizzes: 0, flashcards: 0, resources: 0 });

// "5m ago"-style label for an activity timestamp.
export function timeAgo(ms) {
  if (!ms) return "";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function reportId(email) {
  return String(email || "").trim().toLowerCase();
}

// Cross-tab notifier (same browser only). Optional — storage events also work.
let channel = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) channel = new BroadcastChannel(CHANNEL);
} catch {
  /* unsupported / blocked */
}

function readAct() {
  try {
    return JSON.parse(localStorage.getItem(ACT_KEY)) || {};
  } catch {
    return {};
  }
}
function writeAct(obj) {
  try {
    localStorage.setItem(ACT_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

// Cumulative activity counts + recent feed for a student (used on their own
// dashboard and folded into the report the parent reads).
export function getLocalActivity(studentId) {
  const r = readAct()[studentId];
  return { activity: { ...emptyActivity(), ...(r?.activity || {}) }, recent: r?.recent || [] };
}

// Find a student record in the local data layer by email.
function findStudentByEmail(id) {
  try {
    const db = JSON.parse(localStorage.getItem(DB_KEY));
    if (!db?.students) return null;
    return db.students.find((s) => reportId(s.email) === id) || null;
  } catch {
    return null;
  }
}

// Build the report object for a student: their stored stats + local activity.
export function buildReport(student) {
  if (!student) return null;
  const { activity, recent } = getLocalActivity(student.id);
  return {
    studentId: student.id,
    studentEmail: reportId(student.email),
    studentName: student.name || "",
    grade: student.grade ?? null,
    stats: student.stats || {},
    activity,
    recent,
  };
}

// Read the current local report for a child's email (parent side).
export function getLocalReport(email) {
  const id = reportId(email);
  if (!id) return null;
  const student = findStudentByEmail(id);
  return student ? buildReport(student) : null;
}

// Notify any open parent view (other tabs, same browser) to re-read. No cloud.
// `student` is accepted for call-site compatibility but isn't sent anywhere.
export function syncReport(/* student */) {
  try {
    localStorage.setItem(PULSE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  try {
    channel && channel.postMessage({ at: Date.now() });
  } catch {
    /* ignore */
  }
}

// Student side: record one activity event — bump the cumulative count, prepend
// to the recent feed, persist locally, and ping the parent view.
export function logActivity(student, type, label) {
  if (!student?.id) return;
  const all = readAct();
  const cur = all[student.id] || { activity: emptyActivity(), recent: [] };
  cur.activity = { ...emptyActivity(), ...cur.activity };
  if (type in cur.activity) cur.activity[type] += 1;
  cur.recent = [{ type, label: label || type, at: Date.now() }, ...(cur.recent || [])].slice(0, RECENT_MAX);
  all[student.id] = cur;
  writeAct(all);
  syncReport();
}

// Parent side: read the child's report now and on every local change (same
// browser, across tabs). cb(report | null). Returns an unsubscribe function.
export function watchReport(email, cb) {
  const id = reportId(email);
  if (!id) {
    cb(null);
    return () => {};
  }
  const push = () => cb(getLocalReport(id));
  push(); // initial read

  const onStorage = (e) => {
    if (!e || !e.key || e.key === PULSE_KEY || e.key === DB_KEY || e.key === ACT_KEY) push();
  };
  const onMsg = () => push();

  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  try {
    channel && channel.addEventListener("message", onMsg);
  } catch {
    /* ignore */
  }

  return () => {
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
    try {
      channel && channel.removeEventListener("message", onMsg);
    } catch {
      /* ignore */
    }
  };
}
