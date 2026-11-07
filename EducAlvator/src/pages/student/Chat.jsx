import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiGetStudent, planHasUploads } from "../../lib/api";
import { useAuth } from "../../lib/store";
import { useChat, GREETING } from "../../lib/chatStore";
import { logActivity } from "../../lib/reports";
import { getUsage, record, limitFor } from "../../lib/usage";
import { ttsSupported, plainForSpeech, sentenceSplitter, createSpeaker, speakText } from "../../lib/voices";

// Quick actions shown in the popup next to the mic button.
const QUICK_ACTIONS = ["Explain it another way", "Summarize this", "Give me problems"];

// Web Speech API feature detection (mic speech-to-text + voice mode).
const SpeechRec = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const speechSupported = !!SpeechRec;

// Read a picked file for upload: images/PDFs become base64 data URLs (the vision
// model reads them directly); text documents are read as plain text. Anything we
// can't parse in the browser (e.g. .docx) is sent as a short note instead.
const readAs = (file, how) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    how === "text" ? r.readAsText(file) : r.readAsDataURL(file);
  });

async function readForUpload(att) {
  const f = att.file;
  if (!f) return { name: att.name, kind: att.kind };
  const name = f.name;
  const type = f.type || "";
  const isImage = type.startsWith("image/") || att.kind === "image";
  const isPdf = type === "application/pdf" || /\.pdf$/i.test(name);
  const isText = type.startsWith("text/") || /\.(txt|md|csv|json|rtf)$/i.test(name);
  try {
    if (isImage || isPdf) return { name, kind: att.kind, dataUrl: await readAs(f, "dataUrl") };
    if (isText) return { name, kind: att.kind, text: String(await readAs(f, "text")).slice(0, 20000) };
    return {
      name,
      kind: att.kind,
      text: `(The student attached "${name}", but this file type can't be read here. Ask them to upload a PDF, photo, or plain-text file, or paste the text.)`,
    };
  } catch {
    return { name, kind: att.kind };
  }
}

function botReply(text, files) {
  if (files && files.length) {
    return "Thanks for the upload — I can see your file. Want me to explain it, build a quiz from it, or turn it into flashcards?";
  }
  const t = text.toLowerCase();
  if (t.includes("quiz")) return "Great pick. Here's a quick 5-question quiz on fractions. Question 1 of 5: Which fraction equals one half — 2/4 or 2/5?";
  if (t.includes("flashcard")) return "I've made a 3-card deck for you. Card 1: photosynthesis — tap to reveal the meaning.";
  if (t.includes("fraction") || t.includes("math")) return "Let's turn it into a flight challenge. Solve each step to keep your plane soaring. Want me to launch EduRunner?";
  if (t.includes("science")) return "Tell me a topic — photosynthesis, forces, or space — and I'll explain it simply.";
  if (t.includes("english") || t.includes("word")) return "Let's race through some new words. I'll give a word and you guess the meaning — ready?";
  if (t.includes("explain")) return "Sure — I'll explain it another way, step by step, with a small everyday example. What topic should I break down?";
  return "I'm here to help. I can turn a lesson into a quiz, build flashcards, or explain a tricky topic another way. What are we exploring today?";
}

function FileTag({ name, kind, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-xs font-semibold text-ink">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {kind === "image" ? (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </>
        ) : (
          <>
            <path d="M6 2h8l4 4v16H6z" />
            <path d="M14 2v4h4" />
          </>
        )}
      </svg>
      <span className="max-w-[140px] truncate">{name}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-muted hover:text-accent" aria-label="Remove">×</button>
      )}
    </span>
  );
}

// Copies text to the clipboard, falling back to a hidden textarea where the
// Clipboard API isn't available.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      onClick={async () => {
        if (!(await copyText(text))) return;
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={copied ? "Copied" : label || "Copy message"}
      title={copied ? "Copied" : label || "Copy"}
      className={`${label ? "flex h-7 items-center gap-1.5 px-2 text-xs font-bold" : "grid h-7 w-7 place-items-center"} rounded-lg text-faint transition-colors hover:bg-bg-soft hover:text-ink`}
    >
      {copied ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5 10 17.5 19 7" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="11" height="11" rx="2.5" />
          <path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" />
        </svg>
      )}
      {label && <span>{copied ? "Copied" : label}</span>}
    </button>
  );
}

// Plain text of a Markdown syntax-tree node (the code inside a code block).
const nodeText = (n) => (n?.type === "text" ? n.value : (n?.children || []).map(nodeText).join(""));

// Code blocks in replies get their own "Copy code" button underneath, which
// copies only the code.
function CodeBlock({ node, children, ...props }) {
  const code = nodeText(node).replace(/\n$/, "");
  return (
    <div className="md-code">
      <pre {...props}>{children}</pre>
      <CopyButton text={code} label="Copy code" />
    </div>
  );
}

const MD_COMPONENTS = { pre: CodeBlock };

// Reads a reply out loud in the voice chosen in Settings; tap again to stop.
function ReadAloudButton({ active, onClick }) {
  if (!ttsSupported) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "Stop reading" : "Read aloud"}
      aria-pressed={active}
      title={active ? "Stop reading" : "Read aloud"}
      className={`grid h-7 w-7 place-items-center rounded-lg transition-colors hover:bg-bg-soft ${
        active ? "text-accent" : "text-faint hover:text-ink"
      }`}
    >
      {active ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2.5" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
        </svg>
      )}
    </button>
  );
}

const VOICE_ERRORS = {
  "not-allowed": "Microphone access is blocked. Allow the microphone for this site in your browser, then try again.",
  "service-not-allowed": "Microphone access is blocked. Allow the microphone for this site in your browser, then try again.",
  "audio-capture": "No microphone was found. Plug one in or check your sound settings, then try again.",
  network: "Voice recognition needs an internet connection. Check your connection, then try again.",
  "language-not-supported": "Voice recognition doesn't support your browser's language. Try Chrome in English.",
};

/* ----------------------------------------------------------------------------
   Voice Mode — hands-free conversation. Listens, sends what was heard to the
   Study Buddy, speaks the reply sentence by sentence as it streams in, then
   listens again until the student ends the chat. Tapping the orb while it is
   thinking or speaking interrupts it and listens straight away.
---------------------------------------------------------------------------- */
function VoiceMode({ onExit, ask }) {
  const [status, setStatus] = useState("listening"); // listening | thinking | speaking | error
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  // `ask` is a new function on every Chat render; read it through a ref so the
  // conversation loop below starts once and is never torn down by a re-render.
  const askRef = useRef(ask);
  askRef.current = ask;
  const controls = useRef({});

  useEffect(() => {
    let alive = true;
    let rec = null;
    let turn = null; // AbortController for the request in flight
    let restart = null;
    const navLang = navigator.language || "en-US";
    const lang = navLang.startsWith("en") ? navLang : "en-US";
    const speaker = createSpeaker({ onStart: () => alive && setStatus("speaking") });

    const stopListening = () => {
      clearTimeout(restart);
      const r = rec;
      rec = null;
      try {
        r?.abort();
      } catch {
        /* already stopped */
      }
    };

    const listen = () => {
      if (!alive) return;
      stopListening();
      if (!speechSupported) {
        setStatus("error");
        setError("Your browser doesn't support voice input. Try Chrome or Edge on a computer.");
        return;
      }
      const r = new SpeechRec();
      r.lang = lang;
      r.interimResults = true;
      r.continuous = false;
      r.maxAlternatives = 1;
      let finalText = "";
      let interimText = "";
      let failed = false;
      r.onresult = (e) => {
        interimText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
          else interimText += e.results[i][0].transcript;
        }
        setHeard(`${finalText} ${interimText}`.trim());
      };
      r.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return; // onend listens again
        failed = true;
        setStatus("error");
        setError(VOICE_ERRORS[e.error] || "Something went wrong with the microphone. Try again.");
      };
      r.onend = () => {
        if (!alive || rec !== r || failed) return;
        rec = null;
        const text = (finalText || interimText).trim();
        if (text) respond(text);
        else restart = setTimeout(listen, 150); // silence: keep listening
      };
      rec = r;
      setStatus("listening");
      setHeard("");
      setError("");
      try {
        r.start();
      } catch {
        restart = setTimeout(listen, 300);
      }
    };

    const respond = async (text) => {
      setHeard(text);
      setReply("");
      setStatus("thinking");
      const ctrl = new AbortController();
      turn = ctrl;
      let shown = "";
      const splitter = sentenceSplitter((s) => speaker.say(s));
      const result = await askRef.current(text, [], {
        voice: true,
        signal: ctrl.signal,
        onText: (t) => {
          if (turn !== ctrl) return;
          shown += t;
          setReply(shown);
          splitter.push(t);
        },
      });
      if (!alive || turn !== ctrl) return;
      // Nothing streamed (daily limit reached, or the offline fallback): speak the reply text.
      if (!shown && result) {
        setReply(result);
        splitter.push(result);
      }
      splitter.flush();
      if (!ttsSupported) await new Promise((r) => setTimeout(r, 1500));
      await speaker.idle();
      if (!alive || turn !== ctrl) return;
      turn = null;
      listen();
    };

    // Stop whatever is happening and listen straight away.
    const interrupt = () => {
      turn?.abort();
      turn = null;
      speaker.stop();
      listen();
    };

    controls.current = { interrupt, retry: listen };
    listen();

    return () => {
      alive = false;
      stopListening();
      turn?.abort();
      speaker.stop();
    };
  }, []);

  const exit = () => onExit();

  const label =
    status === "listening" ? "Listening…" : status === "thinking" ? "Thinking…" : status === "speaking" ? "Speaking…" : "Voice paused";
  const hint =
    status === "listening"
      ? "Ask any question out loud."
      : status === "error"
      ? ""
      : "Tap the circle to interrupt and ask something else.";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-bg/95 px-6 backdrop-blur">
      <button onClick={exit} className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-ink hover:bg-bg-soft" aria-label="Exit voice mode">✕</button>
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">Voice Mode</p>

      {/* Animated orb reflecting the current state; tap to interrupt. */}
      <button
        type="button"
        onClick={() => (status === "error" ? controls.current.retry?.() : status !== "listening" && controls.current.interrupt?.())}
        aria-label={status === "listening" ? "Listening" : status === "error" ? "Try again" : "Interrupt and ask something else"}
        className="relative grid place-items-center rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
      >
        <span className={`absolute h-40 w-40 rounded-full bg-accent/20 ${status === "listening" ? "animate-ping" : ""}`} />
        <span
          className={`relative grid h-28 w-28 place-items-center rounded-full text-white shadow-[0_8px_30px_rgba(224,93,67,0.35)] ${
            status === "error" ? "bg-faint" : "bg-accent"
          } ${status === "speaking" || status === "thinking" ? "animate-pulse" : ""}`}
        >
          {status === "speaking" ? (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
            </svg>
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          )}
        </span>
      </button>

      <div className="text-center" aria-live="polite">
        <p className="text-lg font-extrabold text-ink">{label}</p>
        {hint && <p className="mt-1 text-xs font-medium text-muted">{hint}</p>}
      </div>

      <div className="min-h-[4rem] w-full max-w-lg text-center">
        {error ? (
          <>
            <p className="text-sm font-semibold text-accent-deep dark:text-accent">{error}</p>
            <button onClick={() => controls.current.retry?.()} className="mt-3 rounded-full bg-accent px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-accent-deep">
              Try again
            </button>
          </>
        ) : (
          <>
            {heard && <p className="text-sm font-medium text-muted">“{heard}”</p>}
            {reply && status !== "listening" && (
              <p className="mt-3 max-h-40 overflow-y-auto text-sm font-medium leading-relaxed text-ink">{plainForSpeech(reply)}</p>
            )}
          </>
        )}
      </div>

      <button onClick={exit} className="rounded-full border border-line-strong bg-surface px-5 py-2 text-sm font-bold text-ink hover:bg-bg-soft">
        End voice chat
      </button>
    </div>
  );
}

export default function Chat() {
  const user = useAuth((s) => s.user);
  const uid = user.id;
  const { data: student } = useQuery({ queryKey: ["student", uid], queryFn: () => apiGetStudent(uid) });
  const plan = student?.plan || "free";
  const demo = student?.demo || false;
  // Uploads follow the plan (Pro/Max). Demo accounts are unrestricted, so they
  // are allowed too as long as their plan supports uploads.
  const uploadsAllowed = planHasUploads(plan);
  const qLimit = limitFor(plan, "questions", demo);
  const upLimit = limitFor(plan, "uploads", demo);

  // Chat sessions live in a shared store so the sidebar history can drive them.
  const bucket = useChat((s) => s.byUser[uid]);
  const ensure = useChat((s) => s.ensure);
  const setStoreMessages = useChat((s) => s.setMessages);
  const newChat = useChat((s) => s.newChat);
  useEffect(() => { ensure(uid); }, [uid, ensure]);

  const messages = bucket?.sessions.find((s) => s.id === bucket.activeId)?.messages || [GREETING];
  // Always read the freshest messages (avoids stale closures across async sends).
  const currentMessages = () => {
    const b = useChat.getState().byUser[uid];
    return b?.sessions.find((s) => s.id === b.activeId)?.messages || [GREETING];
  };
  const pushMessages = (next) => setStoreMessages(uid, next);

  const [qUsed, setQUsed] = useState(0);
  const [upUsed, setUpUsed] = useState(0);
  useEffect(() => {
    if (student) {
      const u = getUsage(student.id);
      setQUsed(u.questions);
      setUpUsed(u.uploads);
    }
  }, [student]);

  const questionsLeft = Math.max(0, qLimit - qUsed);
  const uploadsLeft = upLimit === Infinity ? Infinity : Math.max(0, upLimit - upUsed);

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false); // quick-actions popup

  // "Read aloud" on a reply: which message is being read, and the speaker reading it.
  const [reading, setReading] = useState(null);
  const readerRef = useRef(null);
  const stopReading = () => {
    readerRef.current?.stop();
    readerRef.current = null;
    setReading(null);
  };
  const toggleRead = (i, text) => {
    const wasThis = reading === i;
    stopReading();
    if (wasThis) return;
    setReading(i);
    const speaker = speakText(text, {
      onDone: () => {
        if (readerRef.current !== speaker) return;
        readerRef.current = null;
        setReading(null);
      },
    });
    readerRef.current = speaker;
  };
  useEffect(() => () => readerRef.current?.stop(), []);

  // Close the quick-actions popup on any outside click.
  useEffect(() => {
    if (!quickOpen) return;
    const close = () => setQuickOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [quickOpen]);

  // "Ask EducAlvator" from a study resource: start a fresh chat and import that
  // PDF as an attachment, ready for the student to ask about.
  const location = useLocation();
  const importedRef = useRef(false);
  useEffect(() => {
    const res = location.state?.resource;
    if (!res || importedRef.current || !student) return;
    importedRef.current = true;
    newChat(uid); // open a fresh chat for this resource
    // Clear the navigation state so a refresh doesn't re-import.
    window.history.replaceState({}, document.title);
    (async () => {
      if (res.url) {
        try {
          const resp = await fetch(res.url);
          if (resp.ok) {
            const blob = await resp.blob();
            const name = `${String(res.title || "resource").replace(/[^\w.-]+/g, "_")}.pdf`;
            const file = new File([blob], name, { type: "application/pdf" });
            setAttachments([{ name: file.name, kind: "document", file }]);
          }
        } catch {
          /* ignore fetch failure — the student can still ask by topic */
        }
      }
      setInput(`Help me understand "${res.title}".`);
    })();
  }, [location.state, student, uid, newChat]);

  // Dynamic "Thinking for X.Xs" state (replaces typing dots).
  const [thinking, setThinking] = useState(false);
  const [thinkMs, setThinkMs] = useState(0);
  const thinkTimer = useRef(null);
  const startThinking = () => {
    setThinking(true);
    setThinkMs(0);
    const t0 = performance.now();
    clearInterval(thinkTimer.current);
    thinkTimer.current = setInterval(() => setThinkMs(performance.now() - t0), 100);
  };
  const stopThinking = () => {
    setThinking(false);
    clearInterval(thinkTimer.current);
  };
  useEffect(() => () => clearInterval(thinkTimer.current), []);

  const endRef = useRef(null);
  const fileRef = useRef(null);
  const micRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // ---- File uploads (the '+' button, images + PDFs) ----
  const onPlusClick = () => {
    if (!student) return;
    if (!uploadsAllowed) {
      pushMessages([...currentMessages(), { from: "bot", text: `File uploads (pictures & PDFs) are available on the Pro and Max plans. Ask a parent to upgrade from the parent dashboard.` }]);
      return;
    }
    if (uploadsLeft !== Infinity && uploadsLeft - attachments.length <= 0) {
      pushMessages([...currentMessages(), { from: "bot", text: `You've reached your daily upload limit of ${upLimit} files on the ${plan} plan.` }]);
      return;
    }
    fileRef.current?.click();
  };

  const onPickFiles = (e) => {
    const picked = Array.from(e.target.files || []).map((f) => ({
      name: f.name,
      kind: (f.type || "").startsWith("image/") ? "image" : "document",
      file: f,
    }));
    e.target.value = "";
    if (!picked.length || !student) return;
    const room = uploadsLeft === Infinity ? picked.length : uploadsLeft - attachments.length;
    const toAdd = uploadsLeft === Infinity ? picked : picked.slice(0, Math.max(0, room));
    if (toAdd.length) setAttachments((a) => [...a, ...toAdd]);
    if (toAdd.length < picked.length) {
      pushMessages([...currentMessages(), { from: "bot", text: `You can upload ${upLimit} files per day on the ${plan} plan. ${picked.length - toAdd.length} file(s) were not added.` }]);
    }
  };

  const removeAttachment = (i) => setAttachments((a) => a.filter((_, idx) => idx !== i));

  // ---- Microphone speech-to-text (into the text box) ----
  const toggleMic = () => {
    if (!speechSupported) {
      pushMessages([...currentMessages(), { from: "bot", text: "Voice input isn't supported in this browser — try Chrome or Edge on desktop." }]);
      return;
    }
    if (listening) {
      micRef.current?.stop();
      return;
    }
    const r = new SpeechRec();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    const base = input;
    r.onresult = (e) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setInput((base ? base + " " : "") + txt);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    micRef.current = r;
    setListening(true);
    try { r.start(); } catch { setListening(false); }
  };

  // ---- Core: ask the bot (shared by text send and voice mode) ----
  // Voice Mode passes { voice, onText, signal }: the reply is streamed so speech
  // can start on the first sentence, and the request can be cut off mid-reply.
  async function askBot(text, attached = [], { voice = false, onText, signal } = {}) {
    if (!student) return "";
    const value = (text || "").trim();
    if (!value && !attached.length) return "";

    // Daily question cap.
    if (qUsed >= qLimit) {
      const msg = `You've reached your daily limit of ${qLimit} questions on the ${plan} plan. Come back tomorrow, or ask a parent to upgrade for more.`;
      pushMessages([...currentMessages(), { from: "bot", text: msg }]);
      return msg;
    }

    const userMsg = { from: "me", text: value, files: attached };
    const convo = [...currentMessages(), userMsg];
    pushMessages(convo);

    if (attached.length) {
      const u = record(student.id, "uploads", attached.length);
      setUpUsed(u.uploads);
    }
    const uq = record(student.id, "questions");
    setQUsed(uq.questions);

    // Log the question to the parent's live report (truncate for the feed).
    logActivity(student, "questions", value ? `Asked: ${value.slice(0, 60)}` : "Asked about an upload");

    startThinking();

    let filePayload = [];
    if (attached.length) filePayload = (await Promise.all(attached.map(readForUpload))).filter(Boolean);

    const history = convo
      .filter((m) => m.text || m.files?.length)
      .map((m) => ({
        role: m.from === "me" ? "user" : "assistant",
        content: (m.text || "") + (m.files?.length ? ` [attached file(s): ${m.files.map((f) => f.name).join(", ")}]` : ""),
      }));

    let reply = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          messages: history,
          context: { name: student.name?.split(" ")[0], grade: student.grade },
          files: filePayload,
          ...(voice ? { mode: "voice", stream: true } : {}),
        }),
      });
      if (voice && res.ok && res.body && (res.headers.get("content-type") || "").startsWith("text/plain")) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          const piece = decoder.decode(chunk, { stream: true });
          if (!piece) continue;
          if (!reply) stopThinking();
          reply += piece;
          onText?.(piece);
        }
        reply += decoder.decode();
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.reply) reply = data.reply;
      }
    } catch {
      /* aborted, or offline: handled below */
    }
    stopThinking();
    // Interrupted in Voice Mode: keep whatever was said, but no fallback reply.
    if (signal?.aborted) {
      if (reply.trim()) pushMessages([...convo, { from: "bot", text: reply }]);
      return reply;
    }
    if (!reply.trim()) reply = botReply(value, attached);

    pushMessages([...convo, { from: "bot", text: reply }]);
    return reply;
  }

  const send = async (text) => {
    const value = (text ?? input).trim();
    const files = attachments;
    if (!value && !files.length) return;
    setInput("");
    setAttachments([]);
    await askBot(value, files);
  };

  // "Ask Study Buddy about …" from the header search or Resources page: send it straight away.
  const askedRef = useRef(false);
  useEffect(() => {
    const ask = location.state?.ask;
    if (!ask || askedRef.current || !student) return;
    askedRef.current = true;
    window.history.replaceState({}, document.title);
    send(`Explain ${ask}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, student]);

  const outOfQuestions = qUsed >= qLimit;

  return (
    <div className="space-y-6">
      {voiceMode && <VoiceMode onExit={() => setVoiceMode(false)} ask={askBot} />}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title mb-2">Ask me anything</h1>
        </div>
        {/* New chat — clears the view and starts a fresh session. */}
        <button
          onClick={() => { stopReading(); newChat(uid); setInput(""); setAttachments([]); }}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-accent-deep"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New chat
        </button>
      </div>

      {/* Chat window */}
      <div className="card flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line px-5 py-5 sm:px-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-pastel-orange text-sm font-extrabold text-accent shadow-sm">AI</span>
          <div>
            <p className="text-sm font-bold text-ink">EducAlvator AI</p>
            <p className="text-xs font-medium text-muted">Ready to help</p>
          </div>
        </div>

        <div className="flex h-[46vh] flex-col gap-3 overflow-y-auto px-5 py-6 sm:px-8">
          {messages.map((m, i) => (
            <div key={i} className={`group flex flex-col gap-1 ${m.from === "me" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                m.from === "me" ? "bg-accent text-white" : "bg-surface-2 text-ink"
              }`}
            >
              {m.from === "bot" ? (
                <div className="md-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{m.text}</ReactMarkdown>
                </div>
              ) : (
                <span className="whitespace-pre-line">{m.text}</span>
              )}
              {m.files && m.files.length > 0 && (
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {m.files.map((f, idx) => (
                    <FileTag key={idx} name={f.name} kind={f.kind} />
                  ))}
                </span>
              )}
            </div>
            {/* Copy, like Claude: always under replies, on hover under the student's own messages. */}
            {m.text && (
              <div
                className={
                  m.from === "me"
                    ? "opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                    : "flex items-center gap-0.5"
                }
              >
                <CopyButton text={m.text} />
                {m.from === "bot" && <ReadAloudButton active={reading === i} onClick={() => toggleRead(i, m.text)} />}
              </div>
            )}
            </div>
          ))}
          {/* Dynamic thinking timer instead of loading dots. */}
          {thinking && (
            <div className="max-w-[60%] rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                Thinking for {(thinkMs / 1000).toFixed(1)}s…
              </span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-line px-3 py-4 sm:px-6">
          {/* Pending attachments */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachments.map((f, i) => (
                <FileTag key={i} name={f.name} kind={f.kind} onRemove={() => removeAttachment(i)} />
              ))}
            </div>
          )}

          {outOfQuestions && (
            <div className="mb-2 rounded-2xl border border-accent/40 bg-accent-tint px-3 py-2 text-xs text-accent-deep">
              You've used your {qLimit} questions for today on the {plan} plan. Come back tomorrow, or ask a parent to upgrade.
            </div>
          )}

          {/* Input row: [+] [text] [mic] [voice] [send] */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-1 rounded-full border border-line bg-surface-2 px-1.5 py-1.5 shadow-sm sm:gap-2 sm:px-2"
          >
            {/* '+' upload (left) — pictures & PDFs */}
            <button
              type="button"
              onClick={onPlusClick}
              className="grid h-8 w-8 shrink-0 place-items-center sm:h-9 sm:w-9 rounded-full border border-line-strong text-ink transition-colors hover:bg-bg-soft"
              aria-label="Upload a picture or PDF"
              title={uploadsAllowed ? "Upload a picture or PDF" : "Uploads available on Pro & Max"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={outOfQuestions ? "Daily question limit reached" : listening ? "Listening…" : "Ask EducAlvator"}
              disabled={outOfQuestions}
              className="min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed"
            />

            {/* Quick actions popup (near the mic) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setQuickOpen((v) => !v); }}
                disabled={outOfQuestions}
                className={`grid h-8 w-8 place-items-center rounded-full border transition-colors sm:h-9 sm:w-9 disabled:opacity-40 ${
                  quickOpen ? "border-accent bg-accent text-white" : "border-line text-ink hover:bg-bg-soft"
                }`}
                aria-label="Quick actions"
                aria-haspopup="true"
                aria-expanded={quickOpen}
                title="Quick actions"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13z" />
                </svg>
              </button>
              {quickOpen && (
                <div className="absolute bottom-full right-0 z-20 mb-2 w-44 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
                  {QUICK_ACTIONS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => { setQuickOpen(false); send(a); }}
                      className="block w-full px-3 py-2 text-left text-xs font-medium text-ink hover:bg-bg-soft"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mic speech-to-text (right) */}
            <button
              type="button"
              onClick={toggleMic}
              disabled={outOfQuestions}
              className={`grid h-8 w-8 shrink-0 place-items-center sm:h-9 sm:w-9 rounded-full border transition-colors disabled:opacity-40 ${
                listening ? "border-accent bg-accent text-white" : "border-line text-ink hover:bg-bg-soft"
              }`}
              aria-label={listening ? "Stop listening" : "Speak your question"}
              title="Speak your question"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>

            {/* Voice Mode (hands-free) */}
            <button
              type="button"
              onClick={() => { stopReading(); setVoiceMode(true); }}
              disabled={outOfQuestions}
              className="grid h-8 w-8 shrink-0 place-items-center sm:h-9 sm:w-9 rounded-full border border-line-strong text-ink transition-colors hover:bg-bg-soft disabled:opacity-40"
              aria-label="Start voice mode"
              title="Voice Mode — hands-free conversation"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 18 0M3 12v3a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 0Zm18 0v3a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 0Z" />
              </svg>
            </button>

            {/* Send — turns into a square while the bot is responding */}
            <button
              type="submit"
              disabled={outOfQuestions || thinking}
              className="grid h-8 w-8 shrink-0 place-items-center sm:h-9 sm:w-9 rounded-full bg-accent text-white shadow-md hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-100"
              aria-label={thinking ? "Sending…" : "Send"}
            >
              {thinking ? <span className="block h-3 w-3 rounded-[2px] bg-white" /> : "↑"}
            </button>
          </form>

          {/* Hidden file input — pictures & PDFs only */}
          <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={onPickFiles} />

          <p className="mt-2 text-center text-xs text-muted">
            A little help, a lot of possibility. Always double-check important answers.
          </p>
        </div>
      </div>
    </div>
  );
}
