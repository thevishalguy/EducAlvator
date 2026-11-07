// Local sign-in through EducAlvator's own server (server/accounts.js). The server
// checks passwords against its stored hashes and keeps the session in an HttpOnly
// cookie, so the browser never stores a password or a token.

async function call(method, path, body) {
  let r;
  try {
    r = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Can't reach the EducAlvator server. Check that it is running.");
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data.error || "Something went wrong. Please try again.");
    err.status = r.status;
    throw err;
  }
  return data;
}

export const authLogin = (email, password) => call("POST", "/api/auth/login", { email, password });

// Creates the account and signs in with it.
export const authRegister = (email, password) => call("POST", "/api/auth/register", { email, password });

// Creates a login for someone else (a parent adding a student); who is signed in doesn't change.
export const authCreateLogin = (email, password) => call("POST", "/api/auth/accounts", { email, password });

// The signed-in account ({ email }), or null.
export const authCurrent = () => call("GET", "/api/auth/session").catch(() => null);

export const authLogout = () => call("DELETE", "/api/auth/session").catch(() => {});

export const friendlyAuthError = (err) => err?.message || "Something went wrong. Please try again.";
