// Search helpers shared by the header search box and the Resources page.

const words = (text) => String(text || "").toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];

// True when every word of the query starts a word of the text, in any order.
// A number has to match the whole word, so "chapter 1" doesn't find Chapter 10.
export function matchesQuery(text, query) {
  const want = words(query);
  if (!want.length) return true;
  const have = words(text);
  return want.every((q) => have.some((w) => (/^\d+$/.test(q) ? w === q : w.startsWith(q))));
}

// Per-student history of searches, so terms searched more often rank first.
const historyKey = (uid) => `educalvator.search.${uid}`;

function readHistory(uid) {
  try {
    return JSON.parse(localStorage.getItem(historyKey(uid))) || {};
  } catch {
    return {};
  }
}

export function recordSearch(uid, term) {
  const t = String(term || "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!uid || !t) return;
  const all = readHistory(uid);
  const key = t.toLowerCase();
  const prev = all[key] || { term: t, count: 0 };
  all[key] = { term: t, count: prev.count + 1, last: Date.now() };
  // Keep the 50 most-used terms.
  const kept = Object.entries(all)
    .sort((a, b) => b[1].count - a[1].count || b[1].last - a[1].last)
    .slice(0, 50);
  try {
    localStorage.setItem(historyKey(uid), JSON.stringify(Object.fromEntries(kept)));
  } catch {
    /* storage unavailable */
  }
}

export function removeSearch(uid, term) {
  const all = readHistory(uid);
  delete all[String(term).toLowerCase()];
  try {
    localStorage.setItem(historyKey(uid), JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
}

// Past searches matching the query, most searched first (then most recent).
export function searchHistory(uid, query) {
  return Object.values(readHistory(uid))
    .filter((h) => matchesQuery(h.term, query))
    .sort((a, b) => b.count - a.count || b.last - a.last);
}
