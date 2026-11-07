// Local sign-in accounts: each account's email and a scrypt hash of its password,
// kept in data/accounts.json on the server. Passwords are never stored, logged or
// sent anywhere in plain text, and the data folder is never served to the browser.
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const COST = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

// data/ at the project root, unless AUTH_DATA_DIR points somewhere else (for
// example a persistent disk on the host).
export function dataDir(env) {
  return env.AUTH_DATA_DIR || join(dirname(fileURLToPath(import.meta.url)), "..", "data");
}

// Writes through a temporary file, so a crash mid-write can't leave a half file.
function writePrivate(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, text, { mode: 0o600 });
  renameSync(tmp, file);
}

// The key that signs session cookies. Without SESSION_SECRET, a random one is made
// once and kept in the data folder, so sign-ins survive a restart and nobody can
// forge one by guessing the key.
export function sessionKey(env) {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  const file = join(dataDir(env), "session-secret");
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  const secret = randomBytes(32).toString("base64url");
  writePrivate(file, secret);
  return secret;
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, COST);
  return `scrypt$${COST.N}$${COST.r}$${COST.p}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

async function passwordMatches(password, stored) {
  const [kind, N, r, p, salt, hash] = String(stored).split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const given = await scryptAsync(password, Buffer.from(salt, "base64url"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: COST.maxmem,
  });
  return timingSafeEqual(given, expected);
}

export const normalEmail = (email) => String(email ?? "").trim().toLowerCase();

export function accountStore(env) {
  const file = join(dataDir(env), "accounts.json");
  let accounts = null;
  const all = () => {
    if (!accounts) {
      try {
        accounts = JSON.parse(readFileSync(file, "utf8")).accounts || [];
      } catch {
        accounts = [];
      }
    }
    return accounts;
  };
  const save = () => writePrivate(file, JSON.stringify({ accounts: all() }, null, 1));
  const byEmail = (email) => all().find((a) => a.email === normalEmail(email));
  // Hashed against when no account matches, so a wrong email takes as long as a
  // wrong password and timing doesn't reveal which emails have accounts.
  const decoy = hashPassword(randomBytes(16).toString("hex"));

  return {
    byId: (id) => all().find((a) => a.id === id) || null,

    // Returns the new account, or null if that email already has one.
    async create(email, password) {
      if (byEmail(email)) return null;
      const passwordHash = await hashPassword(password);
      if (byEmail(email)) return null; // created by another request while hashing
      const account = { id: randomUUID(), email: normalEmail(email), passwordHash, createdAt: new Date().toISOString() };
      all().push(account);
      save();
      return account;
    },

    // Returns the account when the email and password match, otherwise null.
    async verify(email, password) {
      const account = byEmail(email);
      const ok = await passwordMatches(password, account ? account.passwordHash : await decoy);
      return account && ok ? account : null;
    },
  };
}
