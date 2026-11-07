# EducAlvator — Implementation Plan & Progress Notes

> Resume protocol: this is a prototype (no git, no tests). On resume, re-run
> `npm run build`, open the app with `npm run dev`, and re-check the endpoints
> before trusting any "done" below.

## Current state (audit result)
Functionally rich prototype. Core user workflows work end-to-end against Google
Gemini: Study Buddy chat (with native PDF/image reading, voice, history), AI quiz
& flashcards, three AI-fed Three.js games, parent/student accounts & plans — all
on a **mock localStorage data layer** and a **Vite dev-middleware backend**.

## Priority backlog (dependency-ordered)

### P0 — Foundational (needed before "production" is even meaningful)
1. **Extract the API routes into a real server** (Express/Hono) + Vite proxy.
   The current backend only exists while `vite` runs. *Everything deployment-,
   scaling-, and CI-deploy-related depends on this.* Files: new `server/`,
   `vite.config.js` (proxy), move the 3 handlers. **Not done** — large, and the
   user has not scoped a hosting target; left as the explicit next step.
2. **Rotate the Google Gemini API key.** It previously lived in committed-able
   source. Owner action (Google AI Studio). **Owner-blocked.**

### P1 — Security / correctness (safe to do now)
3. `.env.example` with placeholders only. **Done (this audit).**
4. Request-body size cap + in-memory rate limiting + 429 on the AI endpoints
   (abuse/cost protection; TRACEN topic 1). **Done (this audit).** Files:
   `vite.config.js`.
5. Consistent server error shape; never leak internal exceptions. Mostly in place
   (handlers return `{error, detail}`); detail is truncated. **Satisfied.**

### P2 — Product gaps found in audit
6. **Game → app score bridge** (`postMessage` from `endGame()` → `PlayGame.jsx`
   updates XP/stats/leaderboard). **DONE & verified.** All 3 games post a
   same-origin `GAME_COMPLETE`; `PlayGame` validates origin+type and persists via
   `apiRecordGameScore` (XP clamped), then invalidates the student & leaderboard
   queries. Evidence: XP moved +500, "Saved" badge shown, wrong-type ignored.
7. **Route-based code splitting** (`React.lazy`/`Suspense`). **DONE & verified.**
   Initial bundle 640 kB→302 kB (gzip 187→90 kB); Chat (react-markdown) now a
   lazy 174 kB chunk; "chunk too large" warning gone.

### P3 — Engineering hygiene (optional for a prototype)
8. Add ESLint + a minimal Vitest smoke test for `lib/usage.js` / `lib/quiz.js`
   (pure logic). None exist today.
9. Basic CI workflow (install + build) once a git remote exists (repo is not a
   git repository yet).

## Explicitly out of scope for this prototype (with reason)
- Real database + migrations, real auth/sessions, SSR, Docker/K8s, message
  queues, sagas, pub/sub, distributed transactions, schedulers. The directive
  itself says to apply these only where warranted; none is warranted for a
  single-service client-side demo. They become relevant **after** P0 (real
  server) and a defined hosting target — document, don't pre-build.

## Progress log
- Audit complete; `npm run build` passes (390 modules, 5.71s; one 640 kB chunk).
- Added `.env.example`, request-size cap, and in-memory rate limiting (P1 #3, #4).
- Docs created: requirements-inventory, architecture (+ TRACEN table), this plan,
  verification-report.
- P2 done: code splitting (bundle 640→302 kB) and the game→app score bridge, both
  verified. Remaining actionable: ESLint + unit tests + CI (needs git), server
  extraction (needs a hosting decision), key rotation (owner).
