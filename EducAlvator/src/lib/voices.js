// Spoken replies: the four Study Buddy voices a student can pick in Settings, and
// the speech queue Voice Mode and "Read aloud" use. Speech comes from the
// browser's own voices, so each choice picks the closest one this device has and
// shapes it with its own pitch and speed.

export const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

export const PREVIEW_TEXT = "Welcome to EducAlvator, I hope you enjoy our work";

export const VOICES = [
  { id: "asha", name: "Asha", desc: "Warm and friendly", accent: "Indian English", lang: "en-IN", gender: "female", pitch: 1.05, rate: 1 },
  { id: "arjun", name: "Arjun", desc: "Calm and clear", accent: "Indian English", lang: "en-IN", gender: "male", pitch: 1, rate: 0.98 },
  { id: "maya", name: "Maya", desc: "Bright and upbeat", accent: "American English", lang: "en-US", gender: "female", pitch: 1.15, rate: 1.08 },
  { id: "leo", name: "Leo", desc: "Deep storyteller", accent: "British English", lang: "en-GB", gender: "male", pitch: 0.85, rate: 0.92 },
];

const KEY = "educalvator.voice";

export function getVoiceId() {
  try {
    const id = localStorage.getItem(KEY);
    if (VOICES.some((v) => v.id === id)) return id;
  } catch {
    /* storage unavailable */
  }
  return VOICES[0].id;
}

export function setVoiceId(id) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* storage unavailable */
  }
}

// Browser voices rarely state a gender, so it's read from well-known voice names.
const FEMALE = /female|woman|samantha|victoria|karen|moira|tessa|fiona|veena|zira|aria|jenny|neerja|heera|sonia|libby|natasha|kalpana|swara|catherine|hazel|susan|emma|ava|allison|serena|google us english/i;
const MALE = /\bmale\b|\bman\b|daniel|alex|fred|rishi|david|mark|guy|ryan|prabhat|ravi|hemant|george|thomas|aaron|arthur|gordon|reed|james|oliver|brian|eric|christopher|google uk english male/i;
const genderOf = (name) => (MALE.test(name) && !/female/i.test(name) ? "male" : FEMALE.test(name) ? "female" : "");

// The device voice closest to a choice: same accent and gender first, then
// gender, then accent, preferring the more natural online voices.
export function deviceVoiceFor(choice) {
  if (!ttsSupported) return null;
  const voices = window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  let best = null;
  let bestScore = -1;
  for (const v of voices) {
    const lang = v.lang.replace("_", "-");
    let score = 0;
    if (lang === choice.lang) score += 4;
    else if (lang.startsWith("en-")) score += 1;
    const g = genderOf(v.name);
    if (g === choice.gender) score += 5;
    else if (g) score -= 2;
    if (/google|natural|online|neural/i.test(v.name)) score += 1;
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best;
}

const choiceFor = (id) => VOICES.find((v) => v.id === id) || VOICES[0];

// Voices load asynchronously in Chrome; resolves once the list is available.
export function voicesReady() {
  if (!ttsSupported) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  if (synth.getVoices().length) return Promise.resolve(synth.getVoices());
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", done);
    setTimeout(done, 1500);
  });
}

// Turns a reply into text that speech engines read word for word: Markdown,
// code, symbols, units, abbreviations and app names become plain spoken words.
// Browser voices otherwise skip symbols (×, ≤, √), spell units letter by letter
// or read "3/4" as a date.
const SYMBOLS = [
  [/≠/g, " is not equal to "],
  [/≤|⩽/g, " is less than or equal to "],
  [/≥|⩾/g, " is greater than or equal to "],
  [/≈/g, " is approximately "],
  [/±/g, " plus or minus "],
  [/×|✕/g, " times "],
  [/÷/g, " divided by "],
  [/√\s*\(?/g, " the square root of "],
  [/∛/g, " the cube root of "],
  [/∞/g, " infinity "],
  [/⇌/g, " is in equilibrium with "],
  [/⇒|⟹/g, " which means "],
  [/→|⟶|➝/g, " gives "],
  [/←/g, " from "],
  [/↑/g, " goes up "],
  [/↓/g, " goes down "],
  [/∴/g, " therefore "],
  [/∵/g, " because "],
  [/∠/g, " angle "],
  [/△/g, " triangle "],
  [/∥/g, " is parallel to "],
  [/⊥/g, " is perpendicular to "],
  [/≅/g, " is congruent to "],
  [/∼/g, " is similar to "],
  [/∈/g, " belongs to "],
  [/∑/g, " the sum of "],
  [/½/g, " one half "],
  [/⅓/g, " one third "],
  [/⅔/g, " two thirds "],
  [/¼/g, " one quarter "],
  [/¾/g, " three quarters "],
  [/°\s?C\b/g, " degrees Celsius "],
  [/°\s?F\b/g, " degrees Fahrenheit "],
  [/°/g, " degrees "],
  [/π/g, " pi "],
  [/θ/g, " theta "],
  [/α/g, " alpha "],
  [/β/g, " beta "],
  [/γ/g, " gamma "],
  [/λ/g, " lambda "],
  [/μ/g, " micro "],
  [/Δ/g, " delta "],
  [/Ω/g, " ohms "],
  [/&/g, " and "],
];

const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+", ⁿ: "n" };
const SUB = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };

const UNITS = {
  km: "kilometres", cm: "centimetres", mm: "millimetres", m: "metres", kg: "kilograms", mg: "milligrams", g: "grams",
  ml: "millilitres", mL: "millilitres", L: "litres", s: "seconds", min: "minutes", h: "hours", hr: "hours",
  W: "watts", kW: "kilowatts", V: "volts", J: "joules", kJ: "kilojoules", N: "newtons", Hz: "hertz", Pa: "pascals",
};

const ABBREVIATIONS = [
  [/\be\.g\.,?/gi, "for example,"],
  [/\bi\.e\.,?/gi, "that is,"],
  [/\betc\./gi, "et cetera."],
  [/\bvs\.?(?=\s)/gi, "versus"],
  [/\bapprox\./gi, "approximately"],
  [/\bFig\.\s?/g, "Figure "],
  [/\bEq\.\s?/g, "Equation "],
  [/\bCh\.\s?(?=\d)/g, "Chapter "],
  [/\bNo\.\s?(?=\d)/g, "Number "],
];

// The app's own names, said as words rather than spelled out or slurred.
const NAMES = [
  [/EducAlvator/gi, "Edu Calvator"],
  [/\bEdu(?=[A-Z][a-z])/g, "Edu "],
];

const power = (exp) => (exp === "2" ? " squared" : exp === "3" ? " cubed" : ` to the power of ${exp}`);

const CODE_NOTE = "\n(The code is shown on screen.)\n";

export function speakable(text) {
  let s = String(text);
  // Code can't be read sensibly; point at the screen instead.
  s = s.replace(/```[\s\S]*?(```|$)/g, CODE_NOTE).replace(/`([^`]+)`/g, "$1");
  // Markdown: links keep their text, images and tables become readable, markers go.
  s = s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "a link")
    .replace(/^[ \t]*\|?[ \t]*:?-{2,}:?[ \t]*(\|[ \t]*:?-{2,}:?[ \t]*)*\|?[ \t]*$/gm, "") // table rule
    .replace(/^[ \t]*\|(.*)\|[ \t]*$/gm, (_, row) => row.split("|").map((c) => c.trim()).filter(Boolean).join(", ") + ".")
    .replace(/^[ \t]{0,3}#{1,6}[ \t]*(.+?)[ \t]*#*[ \t]*$/gm, "$1.") // headings get a pause
    .replace(/^[ \t]*[-*+•][ \t]+/gm, "")
    .replace(/^[ \t]*>[ \t]?/gm, "")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[^\w*])[*_]([^*_\n]+)[*_](?=[^\w*]|$)/g, "$1$2")
    .replace(/~~(.+?)~~/g, "$1");
  // Leftover LaTeX, in case a reply uses it anyway.
  s = s
    .replace(/\$+/g, "")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, " $1 over $2 ")
    .replace(/\\sqrt\{([^{}]+)\}/g, " the square root of $1 ")
    .replace(/\\(times|cdot)/g, " times ")
    .replace(/\\div/g, " divided by ")
    .replace(/\\pm/g, " plus or minus ")
    .replace(/\\(le|leq)\b/g, " is less than or equal to ")
    .replace(/\\(ge|geq)\b/g, " is greater than or equal to ")
    .replace(/\\(neq|ne)\b/g, " is not equal to ")
    .replace(/\\(pi|theta|alpha|beta|gamma|lambda|mu|Delta|delta)\b/g, " $1 ")
    .replace(/\\(left|right|text|mathrm|mathbf|textbf)\b/g, "")
    .replace(/\^\{([^{}]+)\}/g, (_, e) => power(e))
    .replace(/_\{([^{}]+)\}/g, "$1")
    .replace(/[{}\\]/g, " ");
  for (const [re, word] of NAMES) s = s.replace(re, word);
  for (const [re, word] of ABBREVIATIONS) s = s.replace(re, word);
  // Powers: x², 10³, a^2.
  s = s.replace(/([\p{L}\p{N})])([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ]+)/gu, (_, base, sup) => base + power([...sup].map((c) => SUP[c]).join("")));
  s = s.replace(/([\p{L}\p{N})])\^(-?\w+)/gu, (_, base, e) => base + power(e));
  s = s.replace(/[₀-₉]/g, (c) => SUB[c]); // H₂O → H2O, which voices read well
  // Units after a number: 5 km/h, 9.8 m/s², 20 cm.
  s = s
    .replace(/(\d)\s*km\/h\b/g, "$1 kilometres per hour")
    .replace(/(\d)\s*m\/s squared/g, "$1 metres per second squared")
    .replace(/(\d)\s*m\/s\b/g, "$1 metres per second")
    .replace(/(\d)\s*(km|cm|mm|m|kg|mg|g|mL|ml|L|min|hr|h|s|kW|W|V|kJ|J|N|Hz|Pa)\b(?!\.\w)/g, (_, n, u) => `${n} ${UNITS[u]}`)
    // Area and volume units, with or without a number: cm² → square centimetres.
    .replace(/\b(km|cm|mm|m|kilometres|centimetres|millimetres|metres) (squared|cubed)\b/g, (_, u, pw) =>
      `${pw === "squared" ? "square" : "cubic"} ${UNITS[u] || u}`);
  for (const [re, word] of SYMBOLS) s = s.replace(re, word);
  // Maths between numbers or single letters: 3/4, 5 - 2, x = 7, a + b, 4 < 9.
  const operand = "(\\d+(?:\\.\\d+)?|\\b[a-zA-Z]\\b|\\))";
  s = s
    .replace(new RegExp(`${operand}\\s*\\/\\s*(\\d+(?:\\.\\d+)?|\\b[a-zA-Z]\\b)`, "g"), "$1 over $2")
    .replace(new RegExp(`${operand}\\s*=\\s*`, "g"), "$1 equals ")
    .replace(new RegExp(`${operand}\\s*\\+\\s*`, "g"), "$1 plus ")
    .replace(new RegExp(`${operand}\\s+[-−]\\s+`, "g"), "$1 minus ")
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1 to $2") // ranges: 1–10
    .replace(new RegExp(`${operand}\\s*<\\s*`, "g"), "$1 is less than ")
    .replace(new RegExp(`${operand}\\s*>\\s*`, "g"), "$1 is greater than ")
    .replace(/(\d)\s*%/g, "$1 percent")
    .replace(/−(?=\d)/g, "minus ")
    .replace(/\s=\s/g, " equals ")
    .replace(/\s\+\s/g, " plus ");
  return s
    .replace(/\p{Extended_Pictographic}|️|‍/gu, "") // emoji aren't read as words
    .replace(/[#*_`>|~^]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ +([.,;:!?])/g, "$1")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// Markdown stripped for showing a reply as plain text (Voice Mode captions).
export const plainForSpeech = (s) =>
  String(s)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*`_>|~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// A full stop after one of these doesn't end the sentence, and neither does the
// number of a numbered list item ("2. Mix the…").
const NOT_AN_END = /(?:\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Mt|vs|etc|approx|Fig|Eq|Ch|No|e\.g|i\.e|a\.m|p\.m)|\b[A-Z])\.$|(?:^|\n)\s*\d+\.$/;

// Splits streamed text into sentences as they complete, so speech can start on
// the first sentence while the rest is still arriving. Each sentence is cleaned
// with speakable() before it is spoken.
export function sentenceSplitter(onSentence) {
  let pending = "";
  const emit = (s) => {
    const clean = speakable(s).replace(/\s+/g, " ").trim();
    if (/[\p{L}\p{N}]/u.test(clean)) onSentence(clean);
  };
  return {
    push(text) {
      pending += text;
      // A finished code block becomes one spoken note; text after an unfinished
      // one waits until it closes.
      pending = pending.replace(/```[\s\S]*?```/g, CODE_NOTE);
      const open = pending.indexOf("```");
      const scanTo = open < 0 ? pending.length : open;
      const end = /[.!?…]+["'”’)]*(?=\s)|\n/g;
      let start = 0;
      let m;
      while ((m = end.exec(pending))) {
        const stop = m.index + m[0].length;
        if (stop > scanTo) break;
        const piece = pending.slice(start, stop);
        if (m[0] !== "\n" && NOT_AN_END.test(piece.trimEnd().replace(/["'”’)]+$/, ""))) continue;
        emit(piece);
        start = stop;
      }
      pending = pending.slice(start);
      // A very long stretch without punctuation: speak it up to the last comma or space.
      if (open < 0 && pending.length > 220) {
        const cut = Math.max(pending.lastIndexOf(", ", 220), pending.lastIndexOf(" ", 220));
        if (cut > 40) {
          emit(pending.slice(0, cut + 1));
          pending = pending.slice(cut + 1);
        }
      }
    },
    flush() {
      emit(pending);
      pending = "";
    },
  };
}

// Queue of sentences spoken one after another in the chosen voice. Short
// utterances also avoid Chrome cutting off long ones partway through.
export function createSpeaker({ voiceId, onStart } = {}) {
  const synth = ttsSupported ? window.speechSynthesis : null;
  let queue = [];
  let speaking = false;
  let waiters = [];
  let current = null; // kept so Chrome doesn't garbage-collect the utterance mid-sentence
  let guard = null;

  const settle = () => {
    speaking = false;
    waiters.splice(0).forEach((resolve) => resolve());
  };

  const next = () => {
    clearTimeout(guard);
    const text = queue.shift();
    if (!text) return settle();
    speaking = true;
    const choice = choiceFor(voiceId || getVoiceId());
    const u = new SpeechSynthesisUtterance(text);
    const voice = deviceVoiceFor(choice);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || choice.lang;
    u.pitch = choice.pitch;
    u.rate = choice.rate;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      next();
    };
    u.onstart = () => onStart?.();
    u.onend = finish;
    u.onerror = finish;
    // Chrome occasionally never fires onend; move on once the sentence must be over.
    guard = setTimeout(finish, 4000 + (text.length * 110) / choice.rate);
    current = u;
    synth.resume(); // Chrome can be left paused, which would silently queue forever
    synth.speak(u);
  };

  return {
    say(text) {
      if (!synth) return;
      queue.push(text);
      if (!speaking) next();
    },
    // Resolves once everything queued so far has been spoken.
    idle() {
      return speaking || queue.length ? new Promise((resolve) => waiters.push(resolve)) : Promise.resolve();
    },
    stop() {
      queue = [];
      clearTimeout(guard);
      current = null;
      synth?.cancel();
      settle();
    },
    get current() {
      return current;
    },
  };
}

// Speaks a whole text (Markdown allowed) sentence by sentence. Returns the
// speaker so the caller can stop it; `onDone` runs when it finishes or stops.
export function speakText(text, { voiceId, onStart, onDone } = {}) {
  const speaker = createSpeaker({ voiceId, onStart });
  if (!ttsSupported) {
    onDone?.();
    return speaker;
  }
  window.speechSynthesis.cancel(); // only one thing speaks at a time
  voicesReady().then(() => {
    const split = sentenceSplitter((s) => speaker.say(s));
    split.push(String(text));
    split.flush();
    speaker.idle().then(() => onDone?.());
  });
  return speaker;
}
