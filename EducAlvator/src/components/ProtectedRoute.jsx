import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/store";
import { Spinner } from "./ui";

// Guards app routes by role. Waits for the server to report whether a session
// is still signed in, then redirects to sign-in, or to the correct home if a parent lands
// on a student route (or vice-versa).
export default function ProtectedRoute({ role, children }) {
  const user = useAuth((s) => s.user);
  const authReady = useAuth((s) => s.authReady);
  const location = useLocation();

  // Don't decide until the saved session has been checked.
  if (!authReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg">
        <Spinner label="Loading…" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={user.role === "parent" ? "/parent" : "/app"} replace />;
  }
  return children;
}
