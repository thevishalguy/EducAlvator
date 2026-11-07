import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layouts";
import ProtectedRoute from "./components/ProtectedRoute";
import CookieConsent from "./components/CookieConsent";
import { Spinner } from "./components/ui";

// Route-based code splitting: each page is its own chunk, loaded on demand, so
// the initial bundle stays small (the heavy Chat/charts/game screens no longer
// ship on first paint).
const Home = lazy(() => import("./pages/Home"));
const SignIn = lazy(() => import("./pages/SignIn"));
const ParentSignUp = lazy(() => import("./pages/ParentSignUp"));
const Privacy = lazy(() => import("./pages/Privacy"));

const Dashboard = lazy(() => import("./pages/student/Dashboard"));
const GameCenter = lazy(() => import("./pages/student/GameCenter"));
const PlayGame = lazy(() => import("./pages/student/PlayGame"));
const Resources = lazy(() => import("./pages/student/Resources"));
const Chat = lazy(() => import("./pages/student/Chat"));
const Rankings = lazy(() => import("./pages/student/Rankings"));
const StudentSettings = lazy(() => import("./pages/student/Settings"));

const ParentDashboard = lazy(() => import("./pages/parent/ParentDashboard"));
const ParentSettings = lazy(() => import("./pages/parent/ParentSettings"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="grid min-h-screen place-items-center bg-bg"><Spinner label="Loading…" /></div>}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/parent-sign-up" element={<ParentSignUp />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Student app */}
        <Route
          element={
            <ProtectedRoute role="student">
              <AppShell role="student" />
            </ProtectedRoute>
          }
        >
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/games" element={<GameCenter />} />
          <Route path="/app/games/:slug" element={<PlayGame />} />
          <Route path="/app/resources" element={<Resources />} />
          <Route path="/app/chat" element={<Chat />} />
          <Route path="/app/leaderboard" element={<Rankings />} />
          <Route path="/app/settings" element={<StudentSettings />} />
        </Route>

        {/* Parent app */}
        <Route
          element={
            <ProtectedRoute role="parent">
              <AppShell role="parent" />
            </ProtectedRoute>
          }
        >
          <Route path="/parent" element={<ParentDashboard />} />
          <Route path="/parent/settings" element={<ParentSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      <CookieConsent />
    </BrowserRouter>
  );
}
