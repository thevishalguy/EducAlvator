// Mock API for the EducAlvator prototype.
// Data is persisted in localStorage and seeded on first load.
// Every function returns a Promise so it plugs cleanly into TanStack Query.

import { authCreateLogin } from "./auth";
import { syncReport } from "./reports";

const DB_KEY = "educalvator.db.v6"; // v6: demo parent vishal123@gmail.com ↔ student askrishna@gmail.com

// The public demo logins (also offered as autofill on the sign-in page). These are
// the only passwords the browser knows: every other password is checked by the
// app's server against its stored hash (server/accounts.js).
const DEMO_LOGINS = { "askrishna@gmail.com": "vishal2010", "vishal123@gmail.com": "vishal2010" };

// Older database versions kept plaintext passwords, so they don't stay behind.
try {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("educalvator.db.") && k !== DB_KEY)
    .forEach((k) => localStorage.removeItem(k));
} catch {
  /* storage unavailable */
}

// --- date helpers for attendance / weekly goal (all local, no timezone libs) ---
function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
// Inclusive days from a join date to today (min 1) — the attendance denominator.
function daysSince(createdDate) {
  if (!createdDate) return 1;
  const start = new Date(createdDate + "T00:00:00").getTime();
  const now = new Date(todayStr() + "T00:00:00").getTime();
  return Math.max(1, Math.floor((now - start) / 86400000) + 1);
}
// Distinct attended days within the last 7 calendar days (weekly-goal "done").
function activeDaysThisWeek(history = []) {
  const weekAgo = todayStr(new Date(Date.now() - 6 * 86400000));
  return new Set((history || []).filter((h) => h?.date && h.date >= weekAgo).map((h) => h.date)).size;
}

// A fresh, all-zero stats block. Everything grows from real usage.
function freshStats(createdDate = todayStr()) {
  return {
    createdDate,
    subjects: { maths: 0, english: 0, science: 0 },
    attendance: { present: 0, total: 1, history: [], status: "absent", lastAttendedDate: null, lastAttendedTime: null },
    games: { EduRunner: 0, EduJumper: 0, EduSurfer: 0 },
    gameHighScores: { EduRunner: 0, EduJumper: 0, EduSurfer: 0 },
    gameStats: {},
    quizzes: { totalTaken: 0, totalPoints: 0, averageScore: 0, history: [] },
    streak: 0,
    studyTimeMin: 0,
    weeklyGoal: { done: 0, total: 5 },
    lastActiveAt: 0,
  };
}

export const PLAN_LIMITS = { free: 1, pro: 1, max: 2 };

export const PLANS = [
  {
    id: "free",
    name: "Free Explorer",
    price: 0,
    cadence: "forever",
    tagline: "A gentle start for one curious learner.",
    students: 1,
    features: [
      "1 student profile",
      "Ask up to 6 questions per day",
      "Play 1 game per day",
      "Open up to 3 study PDFs per day",
      "Upload section is not available",
    ],
    cta: "Start free",
  },
  {
    id: "pro",
    name: "Pro Student",
    price: 799,
    cadence: "per month",
    tagline: "Everything one student needs to explore and remember.",
    students: 1,
    featured: true,
    badge: "Most room to grow",
    features: [
      "1 student profile",
      "Ask up to 40 questions per day",
      "Play up to 5 games per day",
      "Open up to 10 study PDFs per day",
      "Upload up to 5 files per day",
      "All subject games, quizzes & flashcards",
    ],
    cta: "Choose Pro",
  },
  {
    id: "max",
    name: "Max Family",
    price: 1499,
    cadence: "per month",
    tagline: "A calmer picture of progress for two learners.",
    students: 2,
    features: [
      "2 student profiles",
      "Ask up to 80 questions per day",
      "Play up to 13 games per day",
      "Open up to 25 study PDFs per day",
      "Unlimited uploads",
      "All features for every learner",
    ],
    cta: "Choose Max",
  },
];

// Contact details for the custom / school plan.
export const CONTACT = {
  email: "sales@educalvator.example",
  whatsapp: "919789164642", // digits only, used for wa.me links
  whatsappDisplay: "+91 9789164642",
};

export const CUSTOM_PLAN = {
  id: "custom",
  name: "Custom / School",
  tagline: "Classrooms, tutoring centres, or 3+ learners.",
  features: [
    "Unlimited student profiles",
    "Admin & teacher dashboards",
    "Bulk onboarding and reporting",
    "Priority support & onboarding",
  ],
};

// Games exist for grades 1–10 only.
export const MAX_GAME_GRADE = 10;
export function gradeHasGames(grade) {
  return Number(grade) >= 1 && Number(grade) <= MAX_GAME_GRADE;
}

// File uploads in the study buddy are available on Pro and Max, not Free.
export function planHasUploads(plan) {
  return plan === "pro" || plan === "max";
}

// Daily question allowance by plan (for display in the study buddy).
export const PLAN_QUESTION_LIMIT = { free: 6, pro: 40, max: Infinity };

function uid(prefix) {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}

// Ensure a student has the full stats schema, filling any MISSING field with a
// zero default. Never overwrites accumulated real values. Keeps the derived
// fields (attendance total, weekly-goal done) current on every read.
export function normalizeStudentStats(student) {
  if (!student) return;
  const st = (student.stats = student.stats || {});
  const base = freshStats(st.createdDate);

  st.createdDate = st.createdDate || base.createdDate;
  st.subjects = { ...base.subjects, ...(st.subjects || {}) };
  st.games = { ...base.games, ...(st.games || {}) };
  st.gameHighScores = { ...base.gameHighScores, ...(st.gameHighScores || {}) };
  st.gameStats = st.gameStats || {};
  st.attendance = { ...base.attendance, ...(st.attendance || {}) };
  st.attendance.history = st.attendance.history || [];
  st.attendance.present = st.attendance.present ?? 0;
  st.quizzes = { ...base.quizzes, ...(st.quizzes || {}) };
  st.quizzes.history = st.quizzes.history || [];
  st.streak = st.streak ?? 0;
  st.studyTimeMin = st.studyTimeMin ?? 0;
  st.lastActiveAt = st.lastActiveAt ?? 0;

  // Derived (recomputed every read so the graphs reflect the current date):
  st.attendance.total = daysSince(st.createdDate);
  st.weeklyGoal = { total: 5, done: Math.min(5, activeDaysThisWeek(st.attendance.history)) };
}

function makeStudent(partial) {
  const base = { id: uid("s"), avatar: "🦊", grade: 5, stats: freshStats(), ...partial };
  if (!base.stats) base.stats = freshStats();
  normalizeStudentStats(base);
  return base;
}

function seed() {
  // Demo student starts with a clean, all-zero report — it fills in as the
  // student actually uses the app (games, quizzes, attendance check-ins).
  const s1 = makeStudent({
    id: "s1",
    name: "Krishna",
    email: "askrishna@gmail.com",
    avatar: "🦊",
    grade: 10,
    parentId: "p1",
  });

  const parent = {
    id: "p1",
    name: "Vishal",
    email: "vishal123@gmail.com",
    plan: "max",
    demo: true, // demo = unrestricted: unlimited questions, games, uploads, resources, quizzes, decks
    studentIds: ["s1"],
  };

  return { parents: [parent], students: [s1] };
}

function read() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all students have the rich stats schema populated
      if (Array.isArray(parsed.students)) {
        parsed.students.forEach(normalizeStudentStats);
      }
      // Remove plaintext passwords saved by earlier versions (progress is kept).
      const accounts = [...(parsed.parents || []), ...(parsed.students || [])].filter((a) => "password" in a);
      accounts.forEach((a) => delete a.password);
      // Earlier versions seeded made-up classmates into the leaderboards.
      const hadClassmates = "classmates" in parsed;
      delete parsed.classmates;
      if (accounts.length || hadClassmates) write(parsed);
      return parsed;
    }
  } catch {
    /* ignore */
  }
  const fresh = seed();
  write(fresh);
  return fresh;
}

function write(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    // Trigger cross-tab sync pulse
    localStorage.setItem("educalvator.reports_pulse", JSON.stringify({ at: Date.now() }));
  } catch {
    /* ignore */
  }
}

const wait = (ms = 220) => new Promise((r) => setTimeout(r, ms));

export function resetDemoData() {
  const fresh = seed();
  write(fresh);
  return fresh;
}

// Whether these are one of the demo logins, whose accounts the sign-in page may
// create on first use.
export function isDemoLogin(email, password) {
  return DEMO_LOGINS[String(email).trim().toLowerCase()] === password;
}

// Creates the parent profile for a new login. A parent profile left from before
// local sign-in (same email) is kept, with its students and progress.
export async function apiRegisterParent({ name, email }) {
  await wait();
  const db = read();
  const e = email.trim().toLowerCase();
  const existing = db.parents.find((p) => p.email.toLowerCase() === e);
  if (existing) return { role: "parent", id: existing.id, name: existing.name, email: existing.email };
  const parent = { id: uid("p"), name, email, plan: "free", studentIds: [] };
  db.parents.push(parent);
  write(db);
  return { role: "parent", id: parent.id, name: parent.name, email: parent.email };
}

// Resolve a signed-in email to its app profile. The server owns the credential;
// this returns the role/id/name the rest of the app needs.
export async function apiGetProfileByEmail(email) {
  await wait(60);
  const db = read();
  const e = String(email || "").trim().toLowerCase();
  const parent = db.parents.find((p) => p.email.toLowerCase() === e);
  if (parent) return { role: "parent", id: parent.id, name: parent.name, email: parent.email };
  const student = db.students.find((s) => s.email.toLowerCase() === e);
  if (student) return { role: "student", id: student.id, name: student.name, email: student.email };
  return null;
}

export async function apiGetStudent(id) {
  await wait(120);
  const db = read();
  const s = db.students.find((x) => x.id === id);
  if (!s) throw new Error("Student not found.");
  const parent = db.parents.find((p) => p.id === s.parentId);
  return { ...s, plan: parent?.plan ?? "free", demo: parent?.demo ?? false };
}

// Valid game stat keys (match GAMES[].name).
const GAME_KEYS = ["EduRunner", "EduJumper", "EduSurfer"];

// Add XP from a finished game to the student's stats (drives the dashboard &
// leaderboard). XP is clamped so a bad/forged message can't skew the records.
// Add XP and track high score from a finished game.
// Also dynamically boosts academic progress for the game's subject,
// records accuracy, updates study time, and syncs report in realtime.
export async function apiRecordGameScore(studentId, gameKey, xp, accuracy = 100) {
  await wait(80);
  if (!GAME_KEYS.includes(gameKey)) throw new Error("Unknown game.");
  const db = read();
  const s = db.students.find((x) => x.id === studentId);
  if (!s) throw new Error("Student not found.");
  normalizeStudentStats(s);

  const add = Math.max(0, Math.min(100000, Math.round(Number(xp) || 0)));
  const acc = Math.max(0, Math.min(100, Math.round(Number(accuracy) || 100)));

  // 1. Check and record high score
  const currentHighScore = s.stats.gameHighScores[gameKey] || 0;
  const isNewHighScore = add > currentHighScore;
  if (isNewHighScore) {
    s.stats.gameHighScores[gameKey] = add;
  }

  // 2. Cumulative XP
  s.stats.games[gameKey] = (s.stats.games[gameKey] || 0) + add;

  // 3. Round metrics
  const prevStats = s.stats.gameStats[gameKey] || { rounds: 0, accuracy: 100, highScore: 0, totalXP: 0 };
  const nextRounds = (prevStats.rounds || 0) + 1;
  const nextAcc = Math.round(((prevStats.accuracy || 100) * (nextRounds - 1) + acc) / nextRounds);
  s.stats.gameStats[gameKey] = {
    rounds: nextRounds,
    accuracy: nextAcc,
    highScore: s.stats.gameHighScores[gameKey],
    totalXP: s.stats.games[gameKey],
    lastScore: add,
    lastAccuracy: acc,
    lastPlayed: Date.now(),
    // Recent rounds, so the report review can tell whether accuracy is rising or falling.
    history: [...(prevStats.history || []), { acc, xp: add, at: Date.now() }].slice(-20),
  };

  // 4. Dynamic Academic Progress Boost
  const subjectMap = { EduRunner: "maths", EduJumper: "english", EduSurfer: "science" };
  const sub = subjectMap[gameKey];
  if (sub && s.stats.subjects[sub] !== undefined) {
    const boost = acc >= 90 ? 3 : acc >= 70 ? 2 : 1;
    s.stats.subjects[sub] = Math.min(100, s.stats.subjects[sub] + boost);
  }

  // 5. Update study time & presence
  s.stats.studyTimeMin = (s.stats.studyTimeMin || 0) + 5;
  s.stats.lastActiveAt = Date.now();
  s.stats.isOnline = true;

  write(db);
  const parent = db.parents.find((p) => p.id === s.parentId);
  const updatedStudent = { ...s, plan: parent?.plan ?? "free", demo: parent?.demo ?? false, isNewHighScore };

  // Sync to parent immediately in realtime
  syncReport(updatedStudent);

  return updatedStudent;
}

// Record an assessment / quiz result into student stats.
// Computes quiz percentages, updates assessment averages, records topic history,
// dynamically boosts the academic progress for the tested subject, and mirrors in realtime.
export async function apiRecordQuizScore(studentId, { topic, score, maxScore, correctCount, totalQuestions, subject }) {
  await wait(80);
  const db = read();
  const s = db.students.find((x) => x.id === studentId);
  if (!s) throw new Error("Student not found.");
  normalizeStudentStats(s);

  const t = String(topic || "AI Quiz").trim();
  const max = Math.max(1, Number(maxScore) || 50);
  const pts = Math.max(0, Math.round(Number(score) || 0));
  const total = Math.max(1, Number(totalQuestions) || 5);
  const correct = Math.max(0, Math.min(total, Number(correctCount) || 0));
  const percentage = Math.round((correct / total) * 100);

  // Infer subject from topic if not explicitly passed
  let sub = subject;
  if (!sub) {
    const lower = t.toLowerCase();
    if (lower.includes("fraction") || lower.includes("math") || lower.includes("algebra") || lower.includes("number") || lower.includes("geometry") || lower.includes("arithmetic") || lower.includes("percent")) {
      sub = "maths";
    } else if (lower.includes("verb") || lower.includes("grammar") || lower.includes("speech") || lower.includes("english") || lower.includes("word") || lower.includes("read") || lower.includes("poem")) {
      sub = "english";
    } else {
      sub = "science";
    }
  }

  const quizEntry = {
    id: uid("q"),
    topic: t,
    subject: sub,
    score: pts,
    maxScore: max,
    correctCount: correct,
    totalQuestions: total,
    percentage,
    date: Date.now(),
  };

  s.stats.quizzes.history = [quizEntry, ...(s.stats.quizzes.history || [])].slice(0, 25);
  s.stats.quizzes.totalTaken = (s.stats.quizzes.totalTaken || 0) + 1;
  s.stats.quizzes.totalPoints = (s.stats.quizzes.totalPoints || 0) + pts;
  const pcts = s.stats.quizzes.history.map((q) => q.percentage);
  s.stats.quizzes.averageScore = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);

  // Dynamic Academic Progress adjustment
  if (s.stats.subjects[sub] !== undefined) {
    const delta = percentage >= 80 ? 3 : percentage >= 60 ? 1 : 0;
    s.stats.subjects[sub] = Math.max(0, Math.min(100, s.stats.subjects[sub] + delta));
  }

  // Update study time & presence
  s.stats.studyTimeMin = (s.stats.studyTimeMin || 0) + 10;
  s.stats.lastActiveAt = Date.now();
  s.stats.isOnline = true;

  write(db);
  const parent = db.parents.find((p) => p.id === s.parentId);
  const updatedStudent = { ...s, plan: parent?.plan ?? "free", demo: parent?.demo ?? false };

  // Sync to parent immediately in realtime
  syncReport(updatedStudent);

  return updatedStudent;
}

// Check in attendance when the student is active or visits their learning space.
// Increments days present on new days, records timestamp, maintains streak,
// and syncs realtime attendance to the parent dashboard.
// Check in attendance when the student visits their learning space. Increments
// days present on each new day (starting from zero), keeps a consecutive-day
// streak, and recomputes the derived denominators. Fully local.
export async function apiCheckInAttendance(studentId) {
  const db = read();
  const s = db.students.find((x) => x.id === studentId);
  if (!s) return null;
  normalizeStudentStats(s);

  const now = Date.now();
  const td = todayStr(new Date(now));
  const timeStr = new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (s.stats.attendance.lastAttendedDate !== td) {
    const yesterday = todayStr(new Date(now - 86400000));
    // Streak continues only if the previous attended day was yesterday.
    s.stats.streak = s.stats.attendance.lastAttendedDate === yesterday ? (s.stats.streak || 0) + 1 : 1;
    s.stats.attendance.present = (s.stats.attendance.present || 0) + 1;
    s.stats.attendance.lastAttendedDate = td;
    s.stats.attendance.lastAttendedTime = timeStr;
    s.stats.attendance.status = "present";
    s.stats.attendance.history = [
      { date: td, status: "present", time: timeStr, note: "Visited learning space" },
      ...(s.stats.attendance.history || []).filter((h) => h.date !== td),
    ].slice(0, 60);
  }

  s.stats.lastActiveAt = now;
  normalizeStudentStats(s); // refresh attendance.total + weeklyGoal
  write(db);

  const parent = db.parents.find((p) => p.id === s.parentId);
  const updatedStudent = { ...s, plan: parent?.plan ?? "free", demo: parent?.demo ?? false };
  syncReport(updatedStudent);
  return updatedStudent;
}

export async function apiGetParent(id) {
  await wait(120);
  const db = read();
  const p = db.parents.find((x) => x.id === id);
  if (!p) throw new Error("Parent not found.");
  const students = p.studentIds
    .map((sid) => db.students.find((s) => s.id === sid))
    .filter(Boolean);
  return { ...p, students };
}

export async function apiSetPlan(parentId, plan) {
  await wait();
  const db = read();
  const p = db.parents.find((x) => x.id === parentId);
  if (!p) throw new Error("Parent not found.");
  p.plan = plan;
  // Trim extra students if downgrading below the new limit.
  const limit = PLAN_LIMITS[plan] ?? 1;
  if (p.studentIds.length > limit) {
    const removed = p.studentIds.slice(limit);
    p.studentIds = p.studentIds.slice(0, limit);
    db.students = db.students.filter((s) => !removed.includes(s.id));
  }
  write(db);
  return apiGetParent(parentId);
}

export async function apiCreateStudent(parentId, { name, email, password, grade }) {
  await wait();
  const db = read();
  const p = db.parents.find((x) => x.id === parentId);
  if (!p) throw new Error("Parent not found.");
  const e = email.trim().toLowerCase();
  // One of this parent's students from before local sign-in, whose login is being
  // made again: it keeps its profile and progress.
  const existing = db.students.find((s) => s.email.toLowerCase() === e);
  if ((existing && existing.parentId !== parentId) || db.parents.some((pp) => pp.email.toLowerCase() === e))
    throw new Error("That email is already in use.");
  const limit = PLAN_LIMITS[p.plan] ?? 1;
  if (!existing && p.studentIds.length >= limit)
    throw new Error(
      `Your ${p.plan.toUpperCase()} plan allows ${limit} student profile${limit > 1 ? "s" : ""}. Upgrade to add more.`
    );

  // Create the student's login FIRST (the parent stays signed in). If this fails,
  // nothing is written to the data layer, so the login and the profile stay in sync.
  await authCreateLogin(email, password);
  if (existing) return apiGetParent(parentId);

  const avatars = ["🦊", "🐰", "🐼", "🐨", "🦁", "🐸", "🦉"];
  // New students start with a clean, all-zero report (freshStats via makeStudent).
  const student = makeStudent({
    name,
    email,
    grade: Number(grade),
    parentId,
    avatar: avatars[p.studentIds.length % avatars.length],
  });
  db.students.push(student);
  p.studentIds.push(student.id);
  write(db);
  return apiGetParent(parentId);
}

export async function apiDeleteStudent(parentId, studentId) {
  await wait();
  const db = read();
  const p = db.parents.find((x) => x.id === parentId);
  if (!p) throw new Error("Parent not found.");
  p.studentIds = p.studentIds.filter((id) => id !== studentId);
  db.students = db.students.filter((s) => s.id !== studentId);
  write(db);
  return apiGetParent(parentId);
}

export async function apiGetLeaderboard(grade, selfId) {
  await wait(120);
  const db = read();
  const g = Number(grade);
  // Only real students on this device: no made-up classmates.
  const rows = db.students
    .filter((s) => s.grade === g)
    .map((s) => ({
      id: s.id,
      name: s.name,
      avatar: s.avatar,
      xp:
        s.stats.games.EduRunner +
        s.stats.games.EduJumper +
        s.stats.games.EduSurfer +
        s.stats.subjects.maths * 6,
      self: s.id === selfId,
    }))
    .sort((a, b) => b.xp - a.xp);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

// Study resources (PDFs). The library is empty: no sample PDFs are shipped.
// To add one, put the file under public/resources/ and add an entry here:
// { id, grade, subject, subjectKey: "maths" | "english" | "science", color,
//   title, desc, url: "/resources/...pdf", sizeKB }
const RESOURCES = [];

export async function apiGetResources(grade) {
  await wait(120);
  return RESOURCES.filter((r) => r.grade === Number(grade));
}
