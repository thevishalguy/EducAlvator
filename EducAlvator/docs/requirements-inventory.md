# EducAlvator — Requirements Inventory

> Reverse-engineered from the actual repository (there is no separate formal spec
> in the workspace; the pasted "Welcome file" is an engineering directive, not a
> functional spec). Source of truth = the running app + source code.
> Last updated by audit: see `verification-report.md` for command evidence.

**Product (discovered):** EducAlvator is a **client-side React prototype** of a
gamified K‑10 learning app. It has a mock in-browser data layer (localStorage,
`src/lib/api.js`), a Vite dev-server middleware "backend" (`vite.config.js`) that
proxies an AI provider (Google Gemini), three Three.js learning games, an AI
Study Buddy chat, and AI quiz/flashcard generators. The footer states plainly:
"Demo data only — nothing real is tracked." It is **not** a PDF-generation SaaS.

Status legend: `implemented` (code exists & runs), `verified` (observed working
this session), `partial`, `blocked`, `n/a`. "Verified" here means **manual/browser
verification** — there is no automated test suite in the repo.

| ID | Source | Requirement | Priority | Location | Deps | Acceptance | Status | Evidence |
|----|--------|-------------|----------|----------|------|------------|--------|----------|
| AUTH-1 | code | Parent sign-up (name/email/password, mock) | high | `pages/ParentSignUp.jsx`, `lib/api.js` | — | New parent persisted in localStorage DB | implemented | code review |
| AUTH-2 | code | Sign-in for parent & student; wrong-password error | high | `pages/SignIn.jsx`, `lib/api.js` | AUTH-1 | Valid creds → session; bad creds → error | verified | signed in as aarav@demo.com this session |
| AUTH-3 | code | Route protection + redirect to /sign-in | high | `components/ProtectedRoute.jsx`, `App.jsx` | AUTH-2 | Unauthed `/app/*` → `/sign-in` | verified | `/app/chat` redirected when signed out |
| AUTH-4 | code | Sign-out clears session | medium | `components/layouts.jsx`, `lib/store.js` | AUTH-2 | Log out → `/` and session cleared | implemented | code review |
| PLAN-1 | code/`api.js` | Plans Free/Pro/Max with feature lists & prices | high | `lib/api.js` (`PLANS`) | — | Plans shown on pricing/parent | implemented | code review |
| PLAN-2 | code/`usage.js` | Daily caps per plan (questions/games/uploads/resources) reset per day | high | `lib/usage.js` | PLAN-1 | Counts enforced & reset at date change | implemented | code review |
| PLAN-3 | code | Upload feature gated to Pro/Max | medium | `lib/api.js` (`planHasUploads`), `Chat.jsx` | PLAN-2 | Free plan blocked from uploads | implemented | code review |
| CHAT-1 | code | Study Buddy chat calls AI backend, falls back offline | critical | `pages/student/Chat.jsx`, `/api/chat` | AI-1 | User message → AI reply rendered | verified | "What is gravity?"/"water cycle" replies this session |
| CHAT-2 | code | Replies render as Markdown (headers/lists/bold/code) | high | `Chat.jsx` (react-markdown), `index.css` (`.md-body`) | CHAT-1 | `##`/lists/```code``` render as HTML | verified | DOM showed h2/ul/li/pre |
| CHAT-3 | code | Personalized greeting, real-life example, no-LaTeX Unicode symbols | medium | `vite.config.js` (`systemPrompt`) | CHAT-1 | "Hi <name>!", Δ not `$\Delta$` | verified | "Hi Neha!/Aarav!"; ΔG rendered |
| CHAT-4 | code | Upload study files (image/PDF) read by AI | critical | `Chat.jsx`, `/api/chat` (`geminiChat` inline_data) | AI-1 | PDF content answered, not filename | verified | identified "Dust of Snow"/Robert Frost from PDF |
| CHAT-5 | code | Mic speech-to-text + hands-free Voice Mode | medium | `Chat.jsx` (Web Speech API, `VoiceMode`) | — | Mic transcribes; voice mode listens/speaks | partial | UI verified; mic blocked in sandboxed pane |
| CHAT-6 | code | "Thinking for X.Xs" timer instead of dots | low | `Chat.jsx` | CHAT-1 | Counter while awaiting reply | verified | screenshot "Thinking for 1.0s…" |
| CHAT-7 | code | Chat history: new chat, resume, rename, delete (right-click) | medium | `lib/chatStore.js`, `components/layouts.jsx` | CHAT-1 | Sessions persist; rename/delete via menu | verified | renamed & deleted items this session |
| CHAT-8 | code | Study Buddy usage % meter above account card | low | `components/layouts.jsx` | PLAN-2 | Shows % of daily question cap | verified | meter rose 1%→3% after asking |
| GEN-1 | code | AI quiz generator (topic→grade-adapted MCQs) | high | `components/QuizModal.jsx`, `/api/generate` | AI-1 | N questions w/ correct answer | verified | 6 items for Photosynthesis |
| GEN-2 | code | AI flashcard generator | high | `components/FlashcardModal.jsx`, `/api/generate` | AI-1 | N cards front/back | implemented | code review |
| GAME-1 | code | 3 Three.js games, grade-locked via `?grade=N` | high | `public/games/{maths,english,science}` , `PlayGame.jsx` | — | Game loads at student grade | implemented | code review |
| GAME-2 | code | Games use AI-generated questions, fresh on "Play Again" | high | games' loader IIFE, `/api/game-questions` | AI-1 | Replay refetches unique questions | verified | 0/10 overlap across replays earlier |
| GAME-3 | code | Game-over posts score/XP back to app | medium | games' `endGame()`, `PlayGame.jsx`, `api.js` (`apiRecordGameScore`) | GAME-1 | Score updates student stats | verified | `postMessage` bridge added; simulated GAME_COMPLETE moved EduRunner XP 1840→2340 (+500), badge shown; wrong-type ignored |
| PERF-1 | audit | Route-based code splitting to shrink initial bundle | medium | `src/App.jsx` (`React.lazy`+`Suspense`) | — | Smaller initial chunk; per-route chunks | verified | main bundle 640 kB→302 kB (gzip 187→90 kB); Chat is a lazy 174 kB chunk |
| RES-1 | code | Grade-specific resource (PDF) browser | medium | `pages/student/Resources.jsx`, `lib/api.js` | — | Lists PDFs for the grade | implemented | code review |
| PAR-1 | code | Parent dashboard, add/delete students, set plan | high | `pages/parent/*`, `lib/api.js` | AUTH-1 | Student CRUD within plan limit | implemented | code review |
| AI-1 | code | Server-side AI proxy (chat/generate/game) on Gemini | critical | `vite.config.js` | — | 200 + content from Gemini | verified | all three endpoints returned content |
| SEC-1 | directive/code | API key server-side only (no `VITE_`), gitignored, no hardcoded keys | critical | `.env`, `.gitignore`, `vite.config.js` | — | Key never in client bundle/source | verified | removed hardcoded keys; `*.env*` gitignored; build bundle has no key |
| SEC-2 | directive | `.env.example` with placeholders only | medium | `.env.example` | SEC-1 | Example present, no real secret | implemented | file added this audit |
