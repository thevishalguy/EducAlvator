# EducAlvator — Prototype

A full, interlinked learning-app prototype that keeps the reference design language
(cream + terracotta palette, rounded cards, sparkle logo) and wires every page together.

## Tech stack
Vite · React Router v7 · TanStack Query · Zustand · Tailwind CSS v4 · React Hook Form + Zod

## Run it
```bash
npm install
npm run dev
```
Then open http://localhost:5173

## Demo logins
| Role    | Email              | Password     |
| ------- | ------------------ | ------------ |
| Student | aarav@demo.com     | student123   |
| Student | diya@demo.com      | student123   |
| Parent  | parent@demo.com    | parent123    |

(The sign-in page has one-tap autofill buttons for both.)

## What's inside
- **Home** — hero, motive, features, pricing (Free / Pro — 1 student / Max — 2 students), about.
  Student & Parent sign-in buttons sit together.
- **Auth** — sign in (student or parent) and parent sign-up, validated with Zod.
- **Student dashboard** — AI study-buddy banner, **Play & Learn** and **Resources** buttons,
  a pictorial report box (subject progress, attendance ring, game-score bars) and a
  same-grade **leaderboard**.
- **Game Center** — three playable games embedded from the standalone exports:
  Maths → **EduRunner**, English → **EduJumper**, Science → **EduSurfer**.
- **Resources** — grade-specific PDFs (generated on the fly so "Open PDF" works offline).
- **Study Buddy** — interactive chatbot with quick actions.
- **Parent dashboard** — pricing/plan switcher, create-student (with per-plan limits and
  separate login credentials), and one report box per student with scores & game reports.
- **Settings** — student (theme + log out); parent (theme + delete student account + log out).
- **Privacy Policy** — parent/student data handling and the operational cookies used.

## Notes
- Data is mocked and persisted in the browser's localStorage (seeded on first load). Nothing
  real is tracked. Clearing site data resets the demo.
- The three games are served directly from `public/games/` and embedded in the Game Center (original backups archived in `archive/legacy-games/`).
- Python CLI tools for testing Gemini multimodal endpoints are in `tools/`.
