// EducAlvator's server API: local sign-in (accounts.js) and the AI endpoints
// (Study Buddy chat, quiz/flashcard generation, game questions, report review).
// Used by the Vite dev server (vite.config.js) and by the production server
// (server/index.js), so both behave the same. Holds the AI keys; never sent to
// the browser.
import { createHmac, timingSafeEqual } from "node:crypto";
import { accountStore, normalEmail, sessionKey } from "./accounts.js";

const SESSION_COOKIE = "edu_session";
const SESSION_DAYS = 7;

// Sent on every page and game. 'unsafe-inline' is needed for scripts because the
// games are single HTML files with inline code (and for Vite's dev preamble).
function securityHeaders(dev) {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob:",
    "connect-src 'self'" + (dev ? " ws://localhost:* ws://127.0.0.1:*" : ""),
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
  return {
    "Content-Security-Policy": csp,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)",
    "Cross-Origin-Opener-Policy": "same-origin",
  };
}

// A CSP on the PDF response itself can stop the browser's built-in PDF viewer from
// loading, so study PDFs get every header except that one.
export function securityHeadersMiddleware(dev) {
  const headers = securityHeaders(dev);
  return (req, res, next) => {
    const isPdf = /\.pdf(\?|$)/i.test(req.url || "");
    for (const [name, value] of Object.entries(headers)) {
      if (!(isPdf && name === "Content-Security-Policy")) res.setHeader(name, value);
    }
    if (!dev && isHttps(req)) res.setHeader("Strict-Transport-Security", "max-age=31536000");
    next();
  };
}

// Read a request body as JSON, rejecting oversized payloads (returns
// { __tooLarge: true } so handlers can answer 413). Default cap ~30 MB — enough
// for one base64 PDF upload, but bounded so a request can't exhaust memory.
function readJson(req, maxBytes = 30 * 1024 * 1024) {
  return new Promise((resolve) => {
    let chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on("data", (c) => {
      if (tooLarge) return;
      size += c.length;
      if (size > maxBytes) {
        tooLarge = true;
        chunks = [];
        return;
      }
      chunks.push(c);
    });
    req.on("error", () => resolve({}));
    req.on("end", () => {
      if (tooLarge) return resolve({ __tooLarge: true });
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        resolve(parsed && typeof parsed === "object" ? parsed : {});
      } catch {
        resolve({});
      }
    });
  });
}

// Set by createApi: true when the server runs behind a hosting proxy (Render,
// etc.) that terminates HTTPS and passes the visitor's address along.
let trustProxy = false;

// The visitor's address. Behind a trusted proxy the socket is the proxy itself,
// so use the address the proxy appended last to X-Forwarded-For (earlier entries
// can be faked by the client). Otherwise the header is ignored as spoofable.
function clientIp(req) {
  if (trustProxy) {
    const hops = String(req.headers["x-forwarded-for"] || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return req.socket?.remoteAddress || "unknown";
}

// HTTPS either directly or at the trusted proxy in front.
function isHttps(req) {
  return Boolean(req.socket?.encrypted) || (trustProxy && req.headers["x-forwarded-proto"] === "https");
}

// Minimal in-memory fixed-window rate limiter, keyed on the visitor's address per
// endpoint, so chat traffic can't use up the games' allowance. Suitable for a
// single-instance server; use shared storage (e.g. Redis) if scaled out.
const rlBuckets = new Map();
function rateLimited(req, limit, windowMs) {
  const ip = clientIp(req);
  const key = `${ip}|${String(req.originalUrl || req.url).split("?")[0]}`;
  const now = Date.now();
  if (rlBuckets.size > 5000) {
    for (const [k, v] of rlBuckets) if (now > v.reset) rlBuckets.delete(k);
  }
  const b = rlBuckets.get(key);
  if (!b || now > b.reset) {
    rlBuckets.set(key, { count: 1, reset: now + windowMs });
    return 0;
  }
  b.count += 1;
  return b.count > limit ? Math.ceil((b.reset - now) / 1000) : 0; // retry-after seconds, or 0
}

// Reject cross-site requests, so another website can't spend the AI key through a
// visitor's browser. Browsers always send Origin on these POST/DELETE requests.
function isSameOrigin(req) {
  if (req.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

// Signing key for the session cookie: SESSION_SECRET, or a random key the server
// keeps in its data folder (see accounts.js).
function sessionSecret(env) {
  return createHmac("sha256", "educalvator-session").update(sessionKey(env)).digest();
}

function signSession(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

// Returns the signed-in account id from the session cookie, or null.
function readSession(req, secret) {
  const cookie = String(req.headers.cookie || "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return null;
  const [uid, exp, sig] = cookie.slice(SESSION_COOKIE.length + 1).split(".");
  if (!uid || !exp || !sig || Number(exp) * 1000 < Date.now()) return null;
  const expected = Buffer.from(signSession(`${uid}.${exp}`, secret));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? uid : null;
}

function sessionCookieHeader(req, value, maxAge) {
  const secure = isHttps(req) ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

// Guard applied to every AI endpoint: POST only, same-origin JSON only, a valid
// signed-in session, and the rate limit. Returns true if it already answered the
// response (handler should stop).
function aiGuard(req, res, json, limit, secret, windowMs = 60_000) {
  if (req.method !== "POST") {
    json(405, { error: "Method not allowed" });
    return true;
  }
  if (!isSameOrigin(req) || !String(req.headers["content-type"] || "").includes("application/json")) {
    json(403, { error: "Forbidden" });
    return true;
  }
  if (!readSession(req, secret)) {
    json(401, { error: "Please sign in." });
    return true;
  }
  const retry = rateLimited(req, limit, windowMs);
  if (retry) {
    res.setHeader("Retry-After", String(retry));
    json(429, { error: "Too many requests. Please slow down.", retryAfter: retry });
    return true;
  }
  return false;
}

// Client values that end up inside a prompt: drop control characters (so they
// can't fake new prompt lines) and bound the length.
function cleanText(value, max) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);
}
function cleanGrade(value) {
  const g = Math.trunc(Number(value));
  return g >= 1 && g <= 12 ? g : null;
}

function systemPrompt(rawCtx = {}, voice = false) {
  const ctx = { name: cleanText(rawCtx?.name, 40), grade: cleanGrade(rawCtx?.grade) };
  const who = ctx.name ? ` The student's name is ${ctx.name}.` : "";
  const grade = ctx.grade ? ` They are in Grade ${ctx.grade}, so match that level.` : "";
  // Voice Mode reads the reply aloud, so it has to be short, plain speech.
  if (voice) {
    return (
      "You are EducAlvator's friendly AI study buddy for a school student, talking out loud in a voice chat." +
      who +
      grade +
      " Answer in two to four short, warm, spoken sentences, with one small everyday example when it helps." +
      " Use plain sentences only: no Markdown, lists, headings, emojis, code or URLs." +
      " Say symbols and formulas the way a teacher would read them aloud, for example 'H two O' or 'x squared'." +
      " Don't greet the student at the start of every answer. Keep it age-appropriate and safe; if asked for something off-topic or unsafe, gently steer back to learning."
    );
  }
  return (
    "detailed thinking off. " +
    "You are EducAlvator's friendly AI study buddy for a school student." +
    who +
    grade +
    " Explain things simply, warmly and encouragingly, using short answers and small everyday examples." +
    " Keep it age-appropriate and safe. For maths, show the steps briefly. If asked for something off-topic or unsafe, gently steer back to learning." +
    " When the student shares a document (PDF, image, or text), read it directly and answer strictly from its actual content with high fidelity — never invent facts, numbers, or details that are not present. If something is not in the document, say so plainly instead of guessing. When you use the document, point to the relevant section, heading, or page you relied on." +
    // The reply is rendered as Markdown in the chat UI, so ask for clean,
    // structured Markdown — plus the greeting, example, and code-box rules.
    (ctx.name
      ? ` GREETING: Begin every reply by greeting the student by name, e.g. "Hi ${ctx.name}!", then answer.`
      : ' GREETING: Begin every reply with a short friendly greeting, e.g. "Hi there!", then answer.') +
    " STRUCTURE: Reply in clean Markdown, never one big block of text. Use short Markdown headers (## Heading) for the main points, '-' bullet lists or numbered lists for steps and items (each item on its own line), and **bold** for key terms. Keep sentences short and the language simple, everyday, and jargon-free; explain any technical word in a few plain words." +
    " EXAMPLE: Always include at least one clear, relevant real-life example so the idea feels concrete." +
    " CODE: If you write any code, put it inside a fenced Markdown code block using triple backticks (```), with a language tag when you know it — never as inline or plain text." +
    " SYMBOLS: Write every maths, science, and chemistry symbol as a real, readable Unicode character — for example ΔG, α, β, λ, μ, θ, π, ×, ÷, →, ⇌, ≈, ≤, ≥, °, ², ³, ½, H₂O, CO₂. NEVER use LaTeX or math-mode syntax such as $\\Delta G$, $$...$$, \\Delta, \\alpha, \\textbf{}, ^{2}, or _{2}; never wrap anything in $ or \\( \\) delimiters. Use only plain text and basic Markdown." +
    " Remind the student to double-check important answers when it matters."
  );
}

// System prompt that (a) adapts the topic to the learner's grade and (b) makes
// the model return a clean JSON quiz/flashcard set.
function genSystemPrompt(kind, count, grade) {
  const g = Number(grade) || null;
  const audience = g ? `a Grade ${g} student (about ${g + 5} years old)` : "a school student at an appropriate level";

  // The core instruction that forces grade-appropriate language and difficulty.
  const adapt =
    `Your audience is ${audience}. ` +
    "Strictly match the vocabulary, sentence length, concepts, examples, and difficulty to this exact level. " +
    "Use simple, everyday words and short sentences the learner already knows. Avoid jargon, technical terms, abbreviations, or symbols/notation beyond their grade; if you must use a key term, explain it in plain words. " +
    "If the requested topic is normally taught above this grade, DO NOT present it in its advanced form. Instead, teach and test only its intuitive, conceptual foundations using familiar real-life examples and analogies a learner this age understands. " +
    "Example: for a young learner, 'calculus' should become ideas like change, speed, growth, and curved-versus-straight lines using everyday pictures (a car speeding up, a plant growing) — never limits, derivatives, integrals, or math symbols. " +
    "Scale this same judgement to any topic and any grade: simpler and more concrete for lower grades, more precise and detailed for higher grades. " +
    "Keep the tone warm, friendly, and encouraging, and make sure every question is answerable by this learner from the ideas you present. " +
    "Write any maths, science, or chemistry symbols as real Unicode characters (e.g. ΔG, α, β, λ, μ, π, ×, ÷, →, ≈, °, ², ½, H₂O, CO₂). NEVER use LaTeX such as $\\Delta$, \\alpha, ^{2}, or $ delimiters. ";

  if (kind === "flashcards") {
    return (
      "You are a study-flashcard generator. " +
      adapt +
      `Create exactly ${count} flashcards about the user's topic. Each flashcard has a short, clear 'front' (a question or term) and a correct, simple 'back' (the answer/definition in grade-appropriate language). ` +
      "Output ONLY minified JSON, no markdown, no commentary, in exactly this schema: " +
      '{"cards":[{"front":"...","back":"..."}]}'
    );
  }
  return (
    "You are a multiple-choice quiz generator. " +
    adapt +
    `Create exactly ${count} questions about the user's topic. Each question must have exactly 4 options and exactly one correct option. The wrong options must be plausible to this learner but clearly incorrect, and the correct answer must be factually right. ` +
    "Think carefully about which option is actually correct before writing it. " +
    "Output ONLY minified JSON, no markdown, no commentary, in exactly this schema: " +
    '{"items":[{"q":"...","options":["...","...","...","..."],"correct":"<exact text of the correct option>"}]} ' +
    "The 'correct' value MUST be copied verbatim from one of the four options and MUST be the factually right answer."
  );
}

// System prompt for generating ALL of a game's topics in ONE call (avoids
// per-topic requests that hit the free-tier rate limit).
function gameBatchSystemPrompt(count, grade) {
  const g = Number(grade) || null;
  const audience = g ? `a Grade ${g} student (about ${g + 5} years old)` : "a school student at an appropriate level";
  return (
    "You are a quiz-question generator for an educational game. " +
    `Your audience is ${audience}. Strictly match the vocabulary, concepts, and difficulty to this level; use simple everyday words and avoid notation or jargon beyond their grade. If a topic is normally taught above this grade, test only its intuitive, conceptual foundations with familiar examples. ` +
    `You will be given several topics, each as "key: name". For EVERY topic, create exactly ${count} general-standard multiple-choice questions — all at one general level, no difficulty variation. ` +
    "CRITICAL: produce a DIFFERENT, freshly randomized set every time. Draw widely from the whole topic — vary the subtopics, the numbers, names, scenarios, and wording, and vary which option is correct. Do NOT fall back to the most common textbook or 'baseline' questions, and do not repeat the questions you would normally produce first; deliberately pick less-obvious angles so no two sessions look alike. " +
    "Each question has exactly 3 SHORT options (they appear on small game gates) with exactly one correct. " +
    "Output ONLY minified JSON, no markdown, no commentary: an object whose keys are the given topic KEYS verbatim, and whose values are arrays of " +
    '{"question":"...","options":["...","...","..."],"correct":"<exact text of the correct option>"}. ' +
    "Each 'correct' value MUST be copied verbatim from that question's three options and be factually right. Include every topic key. " +
    "Write any symbols as real Unicode characters (ΔG, α, β, ×, →, °, ², H₂O), never LaTeX like $\\Delta$ or \\alpha."
  );
}

// fetch() with an abort timeout so an upstream stall can't hang the request.
async function fetchTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Builds the Gemini generateContent request body shared by geminiChat and
// geminiStream.
function geminiPayload(systemText, history, files = [], opts = {}) {

  // Chat history → Gemini "contents" (roles: user / model).
  const contents = history
    .filter((m) => typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content.slice(0, 8000) }] }));

  // Attach uploaded files to the latest user turn: PDFs & images as inline_data
  // (read natively), text files appended inline.
  if (files.length) {
    let last = contents[contents.length - 1];
    if (!last || last.role !== "user") {
      last = { role: "user", parts: [{ text: "Please help me with the file I uploaded." }] };
      contents.push(last);
    }
    for (const f of files) {
      const url = typeof f?.dataUrl === "string" ? f.dataUrl : "";
      const mime = (url.match(/^data:([^;]+);base64,/i) || [])[1];
      if (mime && (mime === "application/pdf" || mime.startsWith("image/"))) {
        const data = url.slice(url.indexOf(",") + 1);
        if (data.length <= 20_000_000) last.parts.push({ inline_data: { mime_type: mime, data } });
      } else if (typeof f?.text === "string" && f.text.trim()) {
        last.parts.push({ text: `\n\n--- Study file: ${f?.name || "file"} ---\n${f.text.slice(0, 200000)}` });
      }
    }
  }

  return {
    systemInstruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.6,
      topP: opts.topP ?? 0.9,
      maxOutputTokens: opts.maxOutputTokens ?? 1024,
      // Disable "thinking" so reasoning tokens don't consume the answer budget
      // (keeps replies fast and complete for a kids' study buddy).
      thinkingConfig: { thinkingBudget: 0 },
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
}

// The keys to try, in order: the main key, then GEMINI_BACKUP_API_KEY, then
// GEMINI_BACKUP_API_KEY_2. Each one answers when a request with the key before
// it ends in an error.
function geminiKeys(env, mainKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY) {
  return [...new Set([mainKey, env.GEMINI_BACKUP_API_KEY, env.GEMINI_BACKUP_API_KEY_2].filter(Boolean))];
}

// How a key is named in the server log (never the key itself).
const keyName = (i) => (i === 0 ? "main key" : i === 1 ? "backup key" : `backup key ${i}`);

// Runs `call(key, lastKey)` with each key until one answers. An error with one
// key moves straight on to the next; only the last key waits out overloads and
// rate limits with retries.
async function withBackupKey(keys, call) {
  if (!keys.length) throw new Error("GEMINI_API_KEY is not set in .env");
  let lastErr;
  for (let i = 0; i < keys.length; i++) {
    const lastKey = i === keys.length - 1;
    try {
      return await call(keys[i], lastKey);
    } catch (e) {
      lastErr = e;
      if (!lastKey) console.warn(`[ai] ${keyName(i)} failed, answering with the ${keyName(i + 1)}:`, e?.message || e);
    }
  }
  throw lastErr;
}

// Sends one native Gemini request with `key` and returns the OK response. An
// error with any key but the last gives up at once so the next key can answer. The
// last key waits out overload / per-minute rate limits, and when the main model
// still can't answer (busy, or its daily quota is used up) it asks the lighter
// text model instead, so a reply still comes back.
async function geminiRequest(env, method, body, key, lastKey, timeout) {
  const main = env.GEMINI_MODEL || "gemini-3-flash-preview";
  const models = lastKey ? [...new Set([main, env.GEMINI_TEXT_MODEL || "gemini-3.1-flash-lite"])] : [main];
  const tries = lastKey ? 3 : 1;
  let lastErr;
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`;
    for (let attempt = 0; attempt < tries; attempt++) {
      const r = await fetchTimeout(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body }, timeout);
      if (r.ok) return r;
      const detail = await r.text();
      lastErr = new Error(`Gemini ${model} ${r.status}: ${detail.slice(0, 300)}`);
      const busy = r.status === 503 || (r.status === 429 && !detail.includes("PerDay"));
      if (!busy) break;
      if (attempt < tries - 1) await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// Native Google Gemini chat (generateContent). Gemini reads text, images AND
// PDFs directly via inline_data, with a ~1M-token context, so uploaded PDFs no
// longer need rasterizing/Markdown conversion — they're sent as-is and the model
// reads them.
async function geminiChat(env, systemText, history, files = [], opts = {}) {
  const body = JSON.stringify(geminiPayload(systemText, history, files, opts));
  return withBackupKey(geminiKeys(env, opts.key), async (key, lastKey) => {
    const r = await geminiRequest(env, "generateContent", body, key, lastKey, 90000);
    const data = await r.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.map((p) => p.text || "").join("").trim();
  });
}

// Streaming Gemini chat (streamGenerateContent, server-sent events): calls
// onText with each piece of the reply as it is generated, so Voice Mode can start
// speaking the first sentence while the rest is still being written. Switches to
// a backup key, and retries overload / rate-limit, only before any text has
// been produced.
async function geminiStream(env, systemText, history, files, opts, onText) {
  const body = JSON.stringify(geminiPayload(systemText, history, files, opts));
  const r = await withBackupKey(geminiKeys(env), (key, lastKey) =>
    geminiRequest(env, "streamGenerateContent?alt=sse", body, key, lastKey, 60000)
  );

  const decoder = new TextDecoder();
  let buf = "";
  for await (const chunk of r.body) {
    buf += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      try {
        const parts = JSON.parse(line.slice(5))?.candidates?.[0]?.content?.parts || [];
        const text = parts.map((p) => p.text || "").join("");
        if (text) onText(text);
      } catch {
        /* skip a malformed event */
      }
    }
  }
}

// Report review: the prompt asks for JSON with what the student is behind on,
// how to improve, and whether results are rising or falling across attempts.
function reviewSystemPrompt(grade) {
  const g = cleanGrade(grade);
  return (
    "You are an encouraging learning coach reviewing a school student's progress report" +
    (g ? ` for a Grade ${g} student.` : ".") +
    " You receive their real activity data as JSON. Base every point only on that data: never invent topics, scores or events that are not in it." +
    " Write for both the student and their parent: warm, specific and simple, with short sentences." +
    ' Return only JSON with exactly this shape: {"lags": [string], "improve": [string], "trend": {"direction": "improving" | "declining" | "steady" | "mixed" | "not enough data", "summary": string}}.' +
    " lags: 1 to 3 specific areas where the student is behind (name the subject, topic or game and the number that shows it)." +
    " improve: 2 to 4 practical next steps that use EducAlvator features (quizzes, flashcards, the game worlds, Study Buddy, study PDFs)." +
    " trend: compare earlier attempts with recent ones (quiz percentages in date order, game accuracy per round) and say whether they are improving or falling, quoting the numbers; use 'mixed' when some subjects or games are rising while others are falling, and name both; use 'not enough data' when there are fewer than 2 attempts of anything." +
    " Write symbols as plain Unicode, never LaTeX."
  );
}

// Keeps only the report fields the review needs, bounded in size, so a client
// can't push arbitrary text into the prompt.
function cleanReviewData(raw = {}) {
  const num = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0);
  const subjects = {};
  for (const k of ["maths", "english", "science"]) subjects[k] = num(raw?.subjects?.[k]);
  const quizzes = (Array.isArray(raw?.quizzes) ? raw.quizzes : []).slice(0, 25).map((q) => ({
    topic: cleanText(q?.topic, 80),
    subject: cleanText(q?.subject, 20),
    percentage: num(q?.percentage),
    date: cleanText(q?.date, 30),
  }));
  const games = {};
  for (const name of ["EduRunner", "EduJumper", "EduSurfer"]) {
    const g = raw?.games?.[name] || {};
    games[name] = {
      rounds: num(g.rounds),
      averageAccuracy: num(g.averageAccuracy),
      highScore: num(g.highScore),
      accuracyByRound: (Array.isArray(g.accuracyByRound) ? g.accuracyByRound : []).slice(-20).map(num),
    };
  }
  const activity = {};
  for (const k of ["questions", "games", "quizzes", "flashcards", "resources"]) activity[k] = num(raw?.activity?.[k]);
  return {
    subjects,
    quizzes,
    games,
    activity,
    attendance: { present: num(raw?.attendance?.present), total: num(raw?.attendance?.total) },
    streakDays: num(raw?.streakDays),
    studyMinutes: num(raw?.studyMinutes),
  };
}

const TREND_DIRECTIONS = ["improving", "declining", "steady", "mixed", "not enough data"];
function cleanReview(out) {
  const list = (v, max) =>
    (Array.isArray(v) ? v : []).map((s) => cleanText(s, 300)).filter(Boolean).slice(0, max);
  const lags = list(out?.lags, 3);
  const improve = list(out?.improve, 4);
  const direction = TREND_DIRECTIONS.includes(out?.trend?.direction) ? out.trend.direction : "not enough data";
  const summary = cleanText(out?.trend?.summary, 400);
  if (!lags.length && !improve.length && !summary) return null;
  return { lags, improve, trend: { direction, summary } };
}

// Helper to resolve AI endpoint (supports both Google AI Studio / Gemini and NVIDIA NIM)
function resolveAiEndpoint(env, overrideKey) {
  const key = overrideKey || env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.NVIDIA_CHAT_API_KEY || env.NVIDIA_API_KEY;
  const isNvidia = Boolean(key && key.startsWith("nvapi-"));
  if (isNvidia) {
    return {
      key,
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      chatModel: env.NVIDIA_MODEL || "nvidia/nemotron-3.5-super-vl-120b-a12b",
      textModel: env.NVIDIA_TEXT_MODEL || env.NVIDIA_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b",
      isNvidia: true,
    };
  }
  return {
    key,
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    chatModel: env.GEMINI_MODEL || "gemini-3.6-flash",
    textModel: env.GEMINI_TEXT_MODEL || env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    isNvidia: false,
  };
}

// One AI call (reasoning off) returning parsed JSON. On timeout/failure/unparseable
// output it moves on to the next model, because one Gemini model is often overloaded
// (503s and stalls) while another answers normally. Only the last try waits long.
// When a request with one key errors, the next key (backup, then second backup) answers it.
async function callNvidiaJson(env, systemContent, userContent, maxTokens = 2048, opts = {}) {
  let lastErr;
  const endpoints = geminiKeys(env, resolveAiEndpoint(env).key).map((key) => resolveAiEndpoint(env, key));
  const attempts = Number.isInteger(opts.attempts) ? opts.attempts : 2;
  for (let attempt = 0; attempt < attempts; attempt++) {
    for (const [i, endpoint] of endpoints.entries()) {
      const models = opts.model ? [opts.model] : [...new Set([endpoint.textModel, endpoint.chatModel])];
      const model = models[attempt % models.length];
      try {
        // A stalled key gets a short wait so the next key (or a later try) gets its turn.
        const timeout = attempt < attempts - 1 && i < endpoints.length - 1 ? 15000 : 60000;
        return await aiJsonRequest(endpoint, model, systemContent, userContent, maxTokens, opts, timeout);
      } catch (e) {
        lastErr = e;
        console.warn(`[ai] ${model} attempt failed (${keyName(i)}):`, e?.message || e);
        // The key answered but the reply was unusable: another key won't help, so try the next model.
        if (e?.message === "unparseable") break;
      }
    }
  }
  throw lastErr || new Error("generation failed");
}

// One chat-completions request whose reply must parse as JSON.
async function aiJsonRequest(endpoint, model, systemContent, userContent, maxTokens, opts, timeout) {
  const payload = {
    model,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
    ],
    temperature: opts.temperature ?? 0.4,
    top_p: opts.top_p ?? 0.9,
    max_tokens: maxTokens,
    // `seed` is an OpenAI param NVIDIA accepts but Gemini's compat endpoint
    // rejects (400); for Gemini, variation comes from temperature + the nonce.
    ...(endpoint.isNvidia && Number.isInteger(opts.seed) ? { seed: opts.seed } : {}),
    // Gemini's thinking slows these bulk calls and can spoil the JSON output.
    ...(endpoint.isNvidia ? {} : { reasoning_effort: "none" }),
    stream: false,
  };
  if (endpoint.isNvidia) {
    payload.chat_template_kwargs = { thinking: false };
  }
  const r = await fetchTimeout(
    endpoint.url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${endpoint.key}` },
      body: JSON.stringify(payload),
    },
    timeout
  );
  if (!r.ok) throw new Error((endpoint.isNvidia ? "NVIDIA " : "Gemini ") + r.status);
  const data = await r.json();
  const m = data?.choices?.[0]?.message || {};
  const parsed = extractJson(m.content || m.reasoning_content || "");
  if (parsed) return parsed;
  throw new Error("unparseable");
}

// Best-effort JSON extraction from a model reply (handles code fences / stray
// text, and salvages a response truncated at the token limit).
function extractJson(text) {
  if (!text) return null;
  let t = String(text).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    /* ignore */
  }
  // Grab from the first "{" to the last "}" and try that.
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(t.slice(first, last + 1));
    } catch {
      /* ignore */
    }
  }
  // Truncated output: rebuild from the complete leading items of a
  // {"items":[...]} or {"cards":[...]} array, dropping the cut-off tail.
  const salvaged = salvageArray(t);
  if (salvaged) return salvaged;
  return null;
}

// Recover the whole, well-formed objects from a truncated items/cards array.
function salvageArray(t) {
  const key = /"items"\s*:/.test(t) ? "items" : /"cards"\s*:/.test(t) ? "cards" : null;
  if (!key) return null;
  const start = t.indexOf("[", t.indexOf(`"${key}"`));
  if (start < 0) return null;
  const objs = [];
  let depth = 0, inStr = false, esc = false, objStart = -1;
  for (let i = start + 1; i < t.length; i++) {
    const c = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") { if (depth === 0) objStart = i; depth++; }
    else if (c === "}") {
      depth--;
      if (depth === 0 && objStart >= 0) {
        try { objs.push(JSON.parse(t.slice(objStart, i + 1))); } catch { /* skip */ }
        objStart = -1;
      }
    } else if (c === "]" && depth === 0) break;
  }
  return objs.length ? { [key]: objs } : null;
}

// Returns a connect-style middleware (req, res, next) serving /api/*.
// trustProxy: set when running behind a hosting proxy that terminates HTTPS.
export function createApi(env, options = {}) {
  trustProxy = Boolean(options.trustProxy);
  const secret = sessionSecret(env);
  const accounts = accountStore(env);
  const routes = {};

  // Local sign-in. Accounts (email + password hash) live on this server, and
  // signing in sets the HttpOnly session cookie the AI endpoints below require;
  // the games' same-origin requests carry it automatically.
  const startSession = (req, res, account) => {
    const maxAge = SESSION_DAYS * 86400;
    const payload = `${account.id}.${Math.floor(Date.now() / 1000) + maxAge}`;
    res.setHeader("Set-Cookie", sessionCookieHeader(req, `${payload}.${signSession(payload, secret)}`, maxAge));
  };

  // Shared checks for the sign-in forms: same-origin JSON POST, a rate limit, and
  // a well-formed email and password. Returns { email, password }, or null after
  // answering the request.
  const readCredentials = async (req, json, limit) => {
    const fail = (code, error) => {
      json(code, { error });
      return null;
    };
    if (req.method !== "POST") return fail(405, "Method not allowed");
    if (!isSameOrigin(req) || !String(req.headers["content-type"] || "").includes("application/json"))
      return fail(403, "Forbidden");
    if (rateLimited(req, limit, 60_000)) return fail(429, "Too many attempts. Please wait a minute and try again.");
    const body = await readJson(req, 16 * 1024);
    const email = normalEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, "Enter a valid email address.");
    if (password.length < 6 || password.length > 200) return fail(400, "Use a password of at least 6 characters.");
    return { email, password };
  };

  const jsonFor = (res) => (code, obj) => {
    res.statusCode = code;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(obj));
  };

  // Sign in with an email and password.
  routes["/api/auth/login"] = async (req, res) => {
    const json = jsonFor(res);
    const creds = await readCredentials(req, json, 10);
    if (!creds) return;
    const account = await accounts.verify(creds.email, creds.password);
    if (!account) return json(401, { error: "Incorrect email or password." });
    startSession(req, res, account);
    return json(200, { email: account.email });
  };

  // Create an account and sign in with it (parent sign-up).
  routes["/api/auth/register"] = async (req, res) => {
    const json = jsonFor(res);
    const creds = await readCredentials(req, json, 10);
    if (!creds) return;
    const account = await accounts.create(creds.email, creds.password);
    if (!account) return json(409, { error: "An account with that email already exists." });
    startSession(req, res, account);
    return json(200, { email: account.email });
  };

  // Create a login for someone else without changing who is signed in (a parent
  // adding a student). Only a signed-in user may do this.
  routes["/api/auth/accounts"] = async (req, res) => {
    const json = jsonFor(res);
    if (!readSession(req, secret)) return json(401, { error: "Please sign in." });
    const creds = await readCredentials(req, json, 20);
    if (!creds) return;
    const account = await accounts.create(creds.email, creds.password);
    if (!account) return json(409, { error: "That email already has a login." });
    return json(200, { email: account.email });
  };

  // Who is signed in (GET), or sign out (DELETE).
  routes["/api/auth/session"] = async (req, res) => {
    const json = jsonFor(res);
    if (!isSameOrigin(req)) return json(403, { error: "Forbidden" });
    if (req.method === "DELETE") {
      res.setHeader("Set-Cookie", sessionCookieHeader(req, "", 0));
      return json(200, { ok: true });
    }
    if (req.method !== "GET") return json(405, { error: "Method not allowed" });
    res.setHeader("Cache-Control", "no-store");
    const id = readSession(req, secret);
    const account = id && accounts.byId(id);
    if (!account) return json(401, { error: "Not signed in." });
    return json(200, { email: account.email });
  };

  routes["/api/chat"] = async (req, res) => {
    const json = (code, obj) => {
      res.statusCode = code;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(obj));
    };
    if (aiGuard(req, res, json, 30, secret)) return; // POST only + session + rate limit (30/min/IP)
    if (!geminiKeys(env).length) return json(500, { error: "AI service is not configured." });

    try {
      const body = await readJson(req);
      if (body.__tooLarge) return json(413, { error: "Request too large." });
      const history = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
      // Uploaded study files (PDFs/images/text) for the latest turn — Gemini
      // reads PDFs and images natively, so no rasterizing/Markdown step.
      const files = Array.isArray(body.files) ? body.files.slice(0, 5) : [];
      const voice = body.mode === "voice";
      const system = systemPrompt(body.context, voice);
      const opts = { maxOutputTokens: voice ? 400 : 1024 };

      // Voice Mode streams plain text as it is generated.
      if (body.stream === true) {
        let started = false;
        try {
          await geminiStream(env, system, history, files, opts, (text) => {
            if (!started) {
              started = true;
              res.statusCode = 200;
              res.setHeader("Content-Type", "text/plain; charset=utf-8");
              res.setHeader("Cache-Control", "no-store");
              res.setHeader("X-Accel-Buffering", "no");
            }
            res.write(text);
          });
        } catch (e) {
          if (!started) throw e;
          console.error("[api/chat stream]", e?.message || e); // reply cut short; end what was sent
        }
        if (!started) return json(502, { error: "Chat failed" });
        return res.end();
      }

      const reply = await geminiChat(env, system, history, files, opts);
      return json(200, { reply });
    } catch (e) {
      console.error("[api/chat]", e?.message || e); // details stay in the server log
      return json(502, { error: "Chat failed" });
    }
  };

  // AI review of a student's report (what they're behind on, how to improve,
  // and whether their results are rising or falling).
  routes["/api/review"] = async (req, res) => {
    const json = (code, obj) => {
      res.statusCode = code;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(obj));
    };
    if (aiGuard(req, res, json, 10, secret)) return; // POST only + session + rate limit (10/min/IP)
    // The report review has its own key; without one it shares the Study Buddy key.
    // The backup keys answer when that key errors.
    const reviewKey = env.REVIEW_GEMINI_API_KEY || env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
    if (!geminiKeys(env, reviewKey).length) return json(500, { error: "AI service is not configured." });
    try {
      const body = await readJson(req, 64 * 1024);
      if (body.__tooLarge) return json(413, { error: "Request too large." });
      const data = cleanReviewData(body.report);
      const prompt = [{ role: "user", content: `Student report data:\n${JSON.stringify(data)}` }];
      for (let attempt = 0; attempt < 2; attempt++) {
        const text = await geminiChat(env, reviewSystemPrompt(body.grade), prompt, [], {
          maxOutputTokens: 900,
          temperature: 0.4,
          json: true,
          key: reviewKey,
        });
        const review = cleanReview(extractJson(text));
        if (review) return json(200, { review });
      }
      return json(502, { error: "Review failed" });
    } catch (e) {
      console.error("[api/review]", e?.message || e);
      return json(502, { error: "Review failed" });
    }
  };

  // Dynamic quiz / flashcard generation from a user topic.
  routes["/api/generate"] = async (req, res) => {
    const json = (code, obj) => {
      res.statusCode = code;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(obj));
    };
    if (aiGuard(req, res, json, 20, secret)) return; // POST only + session + rate limit (20/min/IP)
    if (!geminiKeys(env, resolveAiEndpoint(env).key).length) return json(500, { error: "AI service is not configured." });

    try {
      const body = await readJson(req, 64 * 1024);
      if (body.__tooLarge) return json(413, { error: "Request too large." });
      const kind = body.kind === "flashcards" ? "flashcards" : "quiz";
      const topic = cleanText(body.topic, 120);
      const grade = cleanGrade(body.grade);
      const count = Math.min(15, Math.max(1, Number(body.count) || (kind === "quiz" ? 10 : 3)));
      if (!topic) return json(400, { error: "Please enter a topic." });

      // Size the token budget to the output. A quiz is ~10 four-option MCQs
      // plus the correct-answer text, which easily blows past a flat 2048 and
      // gets truncated into unparseable JSON — hence "couldn't generate a quiz"
      // for richer topics while the much smaller flashcard set still fits.
      const maxTokens = kind === "quiz"
        ? Math.min(8000, 700 + count * 320)
        : Math.min(3000, 400 + count * 220);

      // Generate, retrying until we get a usable set. Each try may come back
      // short (a near-empty or truncated response), so we keep the richest
      // result and stop once it has enough entries. Nudging the temperature
      // up each round shakes the model out of a bad generation.
      const arrayKey = kind === "flashcards" ? "cards" : "items";
      const target = Math.max(kind === "flashcards" ? 2 : 3, Math.ceil(count * 0.7));
      let parsed = null, bestN = 0, lastErr = null;
      for (let i = 0; i < 3; i++) {
        let p;
        try {
          p = await callNvidiaJson(
            env,
            genSystemPrompt(kind, count, grade),
            `Topic: ${topic}`,
            maxTokens,
            { temperature: 0.4 + i * 0.15, top_p: 0.9 }
          );
        } catch (e) {
          lastErr = e;
          continue;
        }
        const n = Array.isArray(p?.[arrayKey]) ? p[arrayKey].length : 0;
        if (n > bestN) { parsed = p; bestN = n; }
        if (bestN >= target) break;
      }
      if (!parsed || !bestN) {
        console.error("[api/generate]", lastErr?.message || lastErr || "no usable questions");
        return json(502, {
          error: kind === "flashcards"
            ? "Could not generate flashcards. Try another topic."
            : "Could not generate a quiz. Try another topic.",
        });
      }

      if (kind === "flashcards") {
        const cards = (parsed?.cards || [])
          .filter((c) => c && c.front && c.back)
          .map((c) => ({ front: String(c.front), back: String(c.back) }))
          .slice(0, count);
        if (!cards.length) return json(502, { error: "Could not generate flashcards. Try another topic." });
        return json(200, { cards });
      }

      const norm = (s) => String(s).trim().toLowerCase();
      const items = (parsed?.items || [])
        .filter((q) => q && q.q && Array.isArray(q.options) && q.options.length >= 2)
        .map((q) => {
          const options = q.options.slice(0, 4).map(String);
          let answer = -1;
          // Prefer the correct-answer TEXT (models get this right far more often than an index).
          if (typeof q.correct === "string") {
            answer = options.findIndex((o) => norm(o) === norm(q.correct));
            if (answer < 0) answer = options.findIndex((o) => norm(o).includes(norm(q.correct)) || norm(q.correct).includes(norm(o)));
          }
          // Fall back to a numeric index if provided.
          if (answer < 0 && Number.isInteger(q.answer)) answer = q.answer;
          if (answer < 0 || answer >= options.length) answer = 0;
          return { q: String(q.q), options, answer };
        })
        .slice(0, count);
      if (!items.length) return json(502, { error: "Could not generate a quiz. Try another topic." });
      return json(200, { items });
    } catch (e) {
      console.error("[api/generate]", e?.message || e);
      return json(500, { error: "Could not generate that. Please try again." });
    }
  };

  // Batch question generation for the games — all topics at once, cached by
  // the game at startup. Returns { questions: { topicKey: [ {id, question,
  // options[3], correct_answer} ] } }.
  routes["/api/game-questions"] = async (req, res) => {
    const json = (code, obj) => {
      res.statusCode = code;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(obj));
    };
    if (aiGuard(req, res, json, 15, secret)) return; // POST only + session + rate limit (15/min/IP)
    if (!geminiKeys(env, resolveAiEndpoint(env).key).length) return json(500, { error: "AI service is not configured." });

    try {
      const body = await readJson(req, 64 * 1024);
      if (body.__tooLarge) return json(413, { error: "Request too large." });
      const grade = cleanGrade(body.grade);
      const count = Math.min(12, Math.max(1, Number(body.count) || 10));
      const topics = (Array.isArray(body.topics) ? body.topics : [])
        .map((t) => (typeof t === "string" ? { key: t, label: t } : { key: String(t?.key || t?.label || ""), label: String(t?.label || t?.key || "") }))
        .map((t) => ({ key: t.key, label: cleanText(t.label, 80) }))
        .filter((t) => /^[\w-]{1,60}$/.test(t.key)) // the games' topic keys; echoed into the prompt
        .slice(0, 12);
      if (!topics.length) return json(400, { error: "No topics provided." });

      const norm = (s) => String(s).trim().toLowerCase();
      // ONE call for all topics — avoids per-topic requests hitting the rate limit.
      const topicList = topics.map((t) => `- ${t.key}: ${t.label}`).join("\n");
      // Freshness factor: the client's per-session nonce + server randomness + time.
      const freshness =
        cleanText(body.nonce || body.sessionId, 64) +
        "-" + Math.random().toString(36).slice(2) +
        "-" + Date.now();
      const userContent =
        `Topics:\n${topicList}\n\n` +
        `Variation token (use ONLY to randomize which questions and wording you choose; never mention or output it): ${freshness}`;
      const maxTokens = Math.min(16000, 900 + topics.length * count * 90);
      const seed = Math.floor(Math.random() * 1e9);
      let parsed;
      try {
        parsed = await callNvidiaJson(env, gameBatchSystemPrompt(count, grade), userContent, maxTokens, { temperature: 0.9, top_p: 0.95, seed });
      } catch (e) {
        console.error("[api/game-questions]", e?.message || e);
        return json(502, { error: "Could not generate game questions." });
      }

      const questions = {};
      for (const t of topics) {
        const raw = parsed && parsed[t.key];
        if (!Array.isArray(raw)) continue;
        const qs = raw
          // The games have exactly 3 lanes/gates, so a question needs 3 options.
          .filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 3)
          .map((q, i) => {
            const options = q.options.slice(0, 3).map(String);
            const correct = norm(typeof q.correct === "string" ? q.correct : "");
            let idx = options.findIndex((o) => norm(o) === correct);
            if (idx < 0 && correct) idx = options.findIndex((o) => norm(o).includes(correct) || correct.includes(norm(o)));
            // No option matches the model's answer: drop it rather than mark a wrong option correct.
            return idx < 0 ? null : { id: i + 1, question: String(q.question), options, correct_answer: options[idx] };
          })
          .filter(Boolean)
          .slice(0, count);
        if (qs.length) questions[t.key] = qs;
      }
      if (!Object.keys(questions).length) return json(502, { error: "Could not generate game questions." });
      return json(200, { questions });
    } catch (e) {
      console.error("[api/game-questions]", e?.message || e);
      return json(500, { error: "Could not generate game questions." });
    }
  };

  return (req, res, next) => {
    const path = String(req.url || "").split("?")[0].replace(/\/+$/, "");
    const route = routes[path];
    if (!route) return next();
    Promise.resolve(route(req, res)).catch((e) => {
      console.error("[api]", e?.message || e);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Server error" }));
      } else res.end();
    });
  };
}
