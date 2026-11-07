# EducAlvator — Verification Report

> All results below are from **actual command runs / browser observation** this
> session. "Verified" means manually/observed — there is **no automated test
> suite** in this repo (none ever existed; see Remaining actions).

## A. Project outcome
EducAlvator is a **client-side React learning-app prototype**. Working core
workflows: parent/student sign-in and routing; AI Study Buddy chat on Google
Gemini (Markdown replies, native PDF/image/text reading, voice input + voice
mode, "thinking" timer, chat history with new/rename/delete/resume, usage meter);
AI quiz & flashcard generation; three Three.js games fed by AI-generated,
non-repeating questions; grade-specific resource browsing; parent plan & student
management. Data is mock localStorage; the API is Vite dev-middleware → Gemini.

## B. Implementation summary (this audit)
- **Docs:** added `docs/requirements-inventory.md`, `docs/architecture.md` (incl.
  the 20-topic TRACEN decision table), `docs/implementation-plan.md`, this report.
- **Security/reliability (`vite.config.js`):**
  - Request-body size cap (~30 MB) in `readJson` → `413` on oversize.
  - In-memory, per-socket-IP **rate limiting** (not using spoofable
    `X-Forwarded-For`) on all three AI endpoints → `429` + `Retry-After`
    (`/api/chat` 30/min, `/api/generate` 20/min, `/api/game-questions` 15/min).
  - `aiGuard` enforces POST-only + limit before any work.
- **`.env.example`** added (placeholder values only).
- (Earlier this session, not this audit: migrated the AI backend to native
  Gemini, removed hardcoded keys, tightened `.gitignore`, chat-history CRUD, etc.)

## C. Verification evidence
| Check | Command / procedure | Result |
|-------|---------------------|--------|
| Production build | `npm run build` | **PASS** — built in ~4–6 s. After code splitting: initial `index.js` **302 kB (90 kB gzip)** (was 640 kB / 187 kB); Chat is a lazy 174 kB chunk; no "chunk too large" warning. |
| Game→app score bridge | simulated same-origin `GAME_COMPLETE` on `/app/games/maths` | **PASS** — EduRunner XP 1840→2340 (+500), "Saved +500 XP" badge shown, persisted to mock DB; wrong-`type` message ignored (security guard). |
| Lint | — | **CANNOT RUN** — no ESLint config / `lint` script in repo. |
| Type check | — | **CANNOT RUN** — plain JS, no TypeScript / `tsconfig`. |
| Unit/integration/E2E tests | — | **CANNOT RUN** — no test framework or tests exist. |
| API: method guard | `GET /api/chat` | **PASS** — `405`. |
| API: chat functional | `POST /api/chat` (text) | **PASS** — `200`, reply present (Gemini). |
| API: native PDF | `POST /api/chat` w/ PDF data URL | **PASS** — identified "Dust of Snow"/Robert Frost, cited page/heading. |
| API: quiz gen | `POST /api/generate` (quiz) | **PASS** — 6 items. |
| API: game questions | `POST /api/game-questions` | **PASS** — forces 8 / matter 8. |
| Rate limiting (429) | 28 concurrent `POST /api/game-questions` | **PASS** — 13×`429` on overflow, with `Retry-After`. |
| Request size (413) | `POST /api/chat` ~31 MB body | **PASS** — `413 {"error":"Request too large."}`. |
| Secret in client bundle | inspect `dist/assets/*.js` | **PASS** — key is server-only (no `VITE_`); not present in bundle. |
| Git state | `git rev-parse` | repo is **not** a git repository. |

## D. Requirements coverage (see requirements-inventory.md)
- **Implemented & verified (observed working):** 16 — AUTH-2/3, CHAT-1/2/3/4/6/7/8, GEN-1, GAME-2, AI-1, SEC-1, plus rate-limit/size/405/413 checks.
- **Implemented (code present, not independently re-verified this audit):** 9 — AUTH-1/4, PLAN-1/2/3, GEN-2, GAME-1, RES-1, PAR-1, SEC-2.
- **Partial:** 2 — CHAT-5 (voice: UI works, device mic blocked in the sandbox pane), GAME-3 (no game→app score bridge yet).
- **Blocked:** 1 (owner action) — **rotate the Gemini API key** (was in source).
- **Not applicable:** the production-infra requirements the directive lists but
  that don't fit a single-service prototype (see TRACEN table).

## E. TRACEN checklist — see `docs/architecture.md`
All 20 topics assessed. Genuinely applicable & handled: **rate limiting**
(implemented, 429 verified), **timeouts** (satisfied — `fetchTimeout` on every
Gemini call), **retries/backoff** (implemented — verified via 503 retries), **CI**
(build passes; no CI config yet). The other 16 are **N/A** for a single-service
client-side prototype or **deferred** to a future server-extraction/deploy step,
per the directive's "apply only where appropriate" rule.

## F. Security & reliability
- **Fixed/strong:** key server-side only (no `VITE_`), gitignored; no hardcoded
  keys in source; per-call timeouts; bounded retries; input size cap; rate limits;
  consistent error shape (`{error, detail}`, detail truncated, no stack leaks).
- **Residual risks:** (1) **key must be rotated** — previously in source. (2) No
  real auth — localStorage "sessions" are not a security boundary (acceptable for
  a demo; **do not** treat as production auth). (3) Rate limiter is in-memory —
  resets on restart and is per-instance; fine for single-instance dev, needs
  shared storage if scaled. (4) `.env` still on disk with a live key (gitignored).

## G. Deployment
- Built locally: **YES** (`npm run build` passes).
- Started locally: **YES** (`npm run dev` / Vite preview; app reachable at :5173).
- Tested end to end: **PARTIAL** — browser-driven manual E2E of chat/history/games
  this session; no automated E2E.
- Deployed to a target environment: **NO.**
- Verified after deployment: **NO.**
- Note: the API only runs inside `vite`. A real deployment requires extracting the
  routes into a standalone server first (P0 in the plan). No hosting target is
  defined, so deployment is intentionally not attempted.

## H. Remaining actions
1. **Rotate the Gemini API key** (Google AI Studio) — it previously lived in
   source files. *Owner action.*
2. **Extract `/api/*` into a real server** (Express/Hono) + Vite proxy — required
   before any production deploy, CI-deploy, Docker, HTTPS, or scaling work.
3. Introduce **ESLint + a few unit tests** (`lib/usage.js`, `lib/quiz.js`) and a
   **CI workflow** once the repo is under git with a remote.
4. For production: define a hosting target, then do HTTPS/proxy, env-secret
   management, and post-deploy smoke tests.

_Completed since initial report:_ route-based code splitting (bundle 640→302 kB)
and the game→app score bridge — both verified above._

## I. How to run the project
```bash
npm install                 # install dependencies
cp .env.example .env        # then put your real GEMINI_API_KEY in .env
npm run dev                 # start app + AI middleware at http://localhost:5173
npm run build               # production build of the SPA (outputs dist/)
npm run preview             # serve the built SPA (+ AI middleware)
```
Demo logins (seeded): student `aarav@demo.com` / `student123`; parent
`parent@demo.com` / `parent123`. No test/lint/typecheck scripts exist yet.
