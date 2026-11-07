# EducAlvator — Architecture

## 1. What this is
A **single-page React application** (prototype) with:
- **Frontend:** React 18 + React Router 7, Vite 6, Tailwind v4, Zustand (auth/theme/chat stores), TanStack Query, react-markdown. Entry: `src/main.jsx` → `src/App.jsx`.
- **"Backend":** Vite dev-server **middleware** in `vite.config.js` (`nvidiaChatProxy`). Three JSON endpoints: `/api/chat`, `/api/generate`, `/api/game-questions`, all requiring a same-origin request and the HttpOnly session cookie that local sign-in issues (see below). This runs **only under `vite`** (dev) — there is no standalone server process.
- **Sign-in (local):** `server/accounts.js` keeps each login's email and a scrypt hash of its password in `data/accounts.json` (git-ignored, never served). `/api/auth/register`, `/api/auth/login`, `/api/auth/accounts` (a parent adding a student's login) and `/api/auth/session` (GET / DELETE) set and clear the signed HttpOnly `edu_session` cookie (7 days). The cookie is signed with `SESSION_SECRET`, or with a random key created once in `data/session-secret`. `AUTH_DATA_DIR` moves the data folder. No third-party sign-in, no password reset by email.
- **Data layer:** **mock, in-browser** localStorage DB (`src/lib/api.js`), seeded on first load. No real database, no ORM, no migrations.
- **AI provider:** Google Gemini (AI Studio) via its native `generateContent` API (chat, reads PDFs/images inline) and OpenAI-compatible endpoint (JSON generation). Keys held server-side in `.env` (no `VITE_` prefix). When a request with the main key (or the review key) ends in an error, `GEMINI_BACKUP_API_KEY` answers it, and `GEMINI_BACKUP_API_KEY_2` answers when that one errors too; on the last key the server also waits out overloads and falls back to the lighter `GEMINI_TEXT_MODEL` when the main model is busy or out of quota.
- **Games:** three self-contained Three.js HTML games in `public/games/*`, embedded via iframe, grade-locked with `?grade=N`, questions injected from `/api/game-questions`.

## 2. Module boundaries
```
src/
  main.jsx, App.jsx        # bootstrap + routes
  pages/                   # route screens (Home, SignIn, parent/, student/)
  components/              # UI + layouts + modals (Quiz/Flashcard/Chat history)
  lib/
    api.js                 # mock DB (localStorage) + plans/resources
    store.js               # auth + theme (zustand, persisted)
    chatStore.js           # chat sessions/history (zustand, persisted)
    usage.js               # daily per-student caps
    quiz.js / flashcards.js / games.jsx
server/api.js              # API: sign-in sessions + AI endpoints (shared by dev and production)
server/index.js            # production server: dist/ + API in one Node process (`npm start`)
vite.config.js             # dev server; mounts server/api.js
render.yaml                # Render Blueprint for deploying the production server
public/games/*             # Three.js games (static)
.env                       # server-side secrets (gitignored)
```

## 3. Key decisions / constraints
- **One small Node server.** The API lives in `server/api.js`. `npm run dev` mounts it inside Vite; `npm run build && npm start` runs `server/index.js`, which serves `dist/` and the same API with no extra dependencies. `render.yaml` deploys it on Render (HTTPS at Render's proxy; `TRUST_PROXY` is on automatically there, so rate limits use the visitor's address and the session cookie is `Secure`). Rate limits are in memory, so run a single instance.
- **Secrets:** server-only env var, `.gitignore` covers `.env`, `.env.*`, `*.env`, `*.env.txt`. Hardcoded key fallbacks were removed from `Edu.py` and `pdf_study_buddy.py`. The AI key must be **rotated** (it previously lived in source) — see verification report.
- **No automated tests / lint / typecheck / CI / git** exist. Verification this session is manual + browser-driven.

## 4. TRACEN 20-topic system-design decision record
A topic is **not** complete because it is mentioned. Applicability is judged for
*this* product (a single-service React prototype with a dev-middleware AI proxy,
no real DB, no multi-service backend).

| Topic | Applicable | Existing Support | Required Changes | Verification | Status |
|-------|-----------|------------------|------------------|--------------|--------|
| 1. Rate limiting | Yes (AI endpoints are expensive/public) | Per-call 60–90s timeouts only | In-memory per-IP limiter + 429 on `/api/*` | Flood test returns 429 | **implemented** (this audit) |
| 2. Caching | Partial | Games cache questions client-side at startup; HTTP static caching by Vite | No server cache needed at this scale | n/a | satisfied / deferred |
| 3. Load balancing | No | Single dev instance | None until a real server exists | — | n/a (prototype) |
| 4. Reverse proxy / HTTPS | Yes | Platform TLS (Render) | Trust the proxy's X-Forwarded-For/-Proto only when `TRUST_PROXY`/`RENDER` is set; HSTS over HTTPS | Local `npm start` test | **implemented** |
| 5. API gateway | No | Single service | None (one service) | — | n/a |
| 6. CI/CD | Yes | None | Add build + (future) test workflow | Build passes locally | partial (build only; no CI config) |
| 7. Docker | Optional | None | Only meaningful after server extraction | — | deferred |
| 8–9. K8s / service discovery | No | None | Prompt itself says don't add K8s to a small app | — | n/a |
| 10–11. Circuit breakers / timeouts | Yes (timeouts) | `fetchTimeout` 60–90s on every Gemini call | Timeouts present; breaker unwarranted at 1 dependency | Observed aborts on overload | **satisfied** (timeouts) |
| 12–13. Retries / backoff | Yes | `geminiChat` retries 503/429 w/ backoff; `callNvidiaJson` retries; frontend retries empty gen | Bounded + jittered acceptable | Retry on 503 observed | **implemented** |
| 14. Idempotency | Low | Reads are idempotent; no payments/orders | No critical duplicate-sensitive op exists | — | n/a |
| 15. Message queues / DLQ | No | Synchronous AI calls are the correct design here | Don't add a queue to every request | — | n/a |
| 16. Pub/Sub | No | No multi-consumer events | — | — | n/a |
| 17. Event-driven | No | — | — | — | n/a |
| 18. Distributed transactions | No | Single localStorage/browser store; no cross-db writes | — | — | n/a |
| 19. Saga | No | No multi-service workflow | — | — | n/a |
| 20. Cron / scheduled tasks | No | Daily caps computed on read (date compare), not a job | No scheduler needed | — | n/a |

**Summary:** of 20 topics, the genuinely applicable ones for this prototype are
rate limiting (now added), timeouts (already satisfied), retries/backoff (already
implemented), and CI (build only). The rest are **not applicable** to a
single-service client-side prototype or are **deferred to a future production
server extraction** — consistent with the directive's instruction to apply each
pattern only where appropriate.

## Deploying (Render)
1. Push the repository to GitHub.
2. In Render: **New → Blueprint**, pick the repository. `render.yaml` creates the `educalvator` web service.
3. Fill in `GEMINI_API_KEY`, `REVIEW_GEMINI_API_KEY`, `GEMINI_BACKUP_API_KEY` and `GEMINI_BACKUP_API_KEY_2` when asked (`SESSION_SECRET` is generated).
4. Sign-in accounts live in `data/accounts.json` on the service's disk. Render's free plan has no persistent disk, so accounts are lost on every redeploy or restart. To keep them, use a paid plan with a disk and set `AUTH_DATA_DIR` to its mount path.
5. Study PDFs under `public/resources/` are served from the build. Only the ones committed to git reach Render.

Local production check: `npm run build && npm start` (port 3000, or `PORT`).
