// Per-student daily usage limits, enforced across the app.
// Counts reset each calendar day. Stored per student in localStorage.

const USAGE_KEY = "educalvator.usage.v1";

// Daily caps by plan. Infinity = unlimited. uploads:0 = feature not available.
export const DAILY_LIMITS = {
  free: { questions: 6, games: 1, uploads: 0, resources: 3, quizzes: Infinity, flashcards: Infinity },
  pro: { questions: 40, games: 5, uploads: 5, resources: 10, quizzes: Infinity, flashcards: Infinity },
  max: { questions: 80, games: 13, uploads: Infinity, resources: 25, quizzes: Infinity, flashcards: Infinity },
};

// Demo accounts are unrestricted — unlimited everything, so the demo login can
// show off the full product with no caps.
export const DEMO_LIMITS = { questions: Infinity, games: Infinity, uploads: Infinity, resources: Infinity, quizzes: Infinity, flashcards: Infinity };

export const USAGE_LABELS = {
  questions: "Questions",
  games: "Game plays",
  uploads: "Uploads",
  resources: "Study PDFs",
  quizzes: "Quizzes",
  flashcards: "Flashcard decks",
};

const EMPTY = () => ({ questions: 0, games: 0, uploads: 0, resources: 0, quizzes: 0, flashcards: 0 });

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(USAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(obj) {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

// Today's counts for a student (fresh object if a new day started).
export function getUsage(studentId) {
  const u = readAll()[studentId];
  if (!u || u.date !== today()) return { date: today(), ...EMPTY() };
  return { date: u.date, ...EMPTY(), ...u };
}

// A demo account uses DEMO_LIMITS regardless of plan.
export function limitFor(plan, type, demo = false) {
  const l = demo ? DEMO_LIMITS : DAILY_LIMITS[plan] || DAILY_LIMITS.free;
  return l[type];
}

export function remaining(plan, studentId, type, demo = false) {
  const lim = limitFor(plan, type, demo);
  if (lim === Infinity) return Infinity;
  const used = getUsage(studentId)[type] || 0;
  return Math.max(0, lim - used);
}

export function canUse(plan, studentId, type, n = 1, demo = false) {
  return remaining(plan, studentId, type, demo) >= n;
}

// Record usage; returns the updated counts for today.
export function record(studentId, type, n = 1) {
  const all = readAll();
  let u = all[studentId];
  if (!u || u.date !== today()) u = { date: today(), ...EMPTY() };
  u[type] = (u[type] || 0) + n;
  all[studentId] = u;
  writeAll(all);
  return u;
}

export function fmtLimit(v) {
  return v === Infinity ? "Unlimited" : String(v);
}
