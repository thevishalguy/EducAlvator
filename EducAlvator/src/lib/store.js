import { useLayoutEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authCurrent, authLogin, authLogout, authRegister } from "./auth";
import { apiGetProfileByEmail, apiRegisterParent, isDemoLogin } from "./api";

// Auth store. The app's server owns the SESSION (see auth.js); this store holds
// the resolved app profile { role, id, name, email } and an `authReady` flag
// (false until the saved session has been checked on load).
export const useAuth = create(() => ({
  user: null,
  authReady: false,
  signOut: async () => {
    await authLogout();
    useAuth.setState({ user: null });
  },
}));

// Resolves a signed-in email to its app profile on this device and exposes it as
// `user`. An account with no profile here is signed back out.
async function openProfile(email) {
  let profile = null;
  try {
    profile = await apiGetProfileByEmail(email);
  } catch {
    /* ignore lookup failure */
  }
  if (!profile) await authLogout();
  useAuth.setState({ user: profile, authReady: true });
  return profile;
}

// On load: pick up the session the server still holds, if any.
authCurrent().then((session) =>
  session?.email ? openProfile(session.email) : useAuth.setState({ user: null, authReady: true })
);

// Sign in with email/password. The demo logins work on any device: the first
// time one is used here, its account is created on the server.
export async function loginWithEmail(email, password) {
  const e = String(email).trim();
  try {
    await authLogin(e, password);
  } catch (err) {
    if (err.status !== 401 || !isDemoLogin(e, password)) throw err;
    await authRegister(e, password).catch(() => {
      throw err;
    });
  }
  if (!(await openProfile(e))) throw new Error("This account has no EducAlvator profile on this device.");
}

// Register a parent: refuse an email that already belongs to a student, create
// the login (which also signs in), then the parent profile.
export async function registerParent({ name, email, password }) {
  const e = String(email).trim();
  const existing = await apiGetProfileByEmail(e);
  if (existing?.role === "student") throw new Error("That email is already a student's login.");
  await authRegister(e, password);
  await apiRegisterParent({ name, email: e });
  await openProfile(e);
}

// Theme store — 'light' | 'dark', persisted and changed only in Settings. The
// chosen theme applies inside the signed-in app (see useAppTheme); the home,
// sign-in and sign-up pages are always light.
function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

const IN_APP = /^\/(app|parent)(\/|$)/;

export const useTheme = create(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "educalvator.theme.v1",
      // Opening the app straight on a signed-in page: apply the theme before the
      // first paint so it doesn't flash light.
      onRehydrateStorage: () => (state) => {
        applyTheme(IN_APP.test(window.location.pathname) ? state?.theme : "light");
      },
    }
  )
);

// Applies the chosen theme while the signed-in layout is shown, and goes back to
// light when it closes (signing out, opening a public page).
export function useAppTheme() {
  const theme = useTheme((s) => s.theme);
  useLayoutEffect(() => {
    applyTheme(theme);
    return () => applyTheme("light");
  }, [theme]);
}
