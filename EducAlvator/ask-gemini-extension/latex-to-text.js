// Turns any LaTeX in a Gemini answer into readable Unicode text. The system prompt already
// asks for no LaTeX, but models do not always comply, so answers pass through this as well.

const SYMBOLS = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ',
  vartheta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
  tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ',
  Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  times: ' × ', div: ' ÷ ', cdot: ' · ', pm: ' ± ', mp: ' ∓ ', ast: ' ∗ ', leq: ' ≤ ', le: ' ≤ ', geq: ' ≥ ', ge: ' ≥ ',
  neq: ' ≠ ', ne: ' ≠ ', approx: ' ≈ ', equiv: ' ≡ ', sim: ' ∼ ', simeq: ' ≃ ', cong: ' ≅ ', propto: ' ∝ ', ll: ' ≪ ',
  gg: ' ≫ ', to: ' → ', rightarrow: ' → ', longrightarrow: ' → ', leftarrow: ' ← ', longleftarrow: ' ← ',
  leftrightarrow: ' ↔ ', Rightarrow: ' ⇒ ', Longrightarrow: ' ⇒ ', implies: ' ⇒ ', Leftarrow: ' ⇐ ', Leftrightarrow: ' ⇔ ',
  iff: ' ⇔ ', rightleftharpoons: ' ⇌ ', uparrow: '↑', downarrow: '↓', mapsto: ' ↦ ',
  in: ' ∈ ', notin: ' ∉ ', ni: ' ∋ ', subset: ' ⊂ ', subseteq: ' ⊆ ', supset: ' ⊃ ', supseteq: ' ⊇ ', cup: ' ∪ ', cap: ' ∩ ',
  setminus: ' ∖ ', land: ' ∧ ', wedge: ' ∧ ', lor: ' ∨ ', vee: ' ∨ ', perp: ' ⊥ ', parallel: ' ∥ ', mid: ' ∣ ', nmid: ' ∤ ',
  oplus: ' ⊕ ', otimes: ' ⊗ ',
  infty: '∞', emptyset: '∅', varnothing: '∅', forall: '∀', exists: '∃', neg: '¬', lnot: '¬', sum: '∑', prod: '∏', int: '∫',
  oint: '∮', partial: '∂', nabla: '∇', angle: '∠', triangle: '△', square: '□', degree: '°', circ: '∘', prime: '′',
  therefore: '∴ ', because: '∵ ', ldots: '…', dots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱', hbar: 'ħ', ell: 'ℓ', Re: 'ℜ',
  Im: 'ℑ', aleph: 'ℵ', langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', lbrace: '{', rbrace: '}',
  backslash: '\\', vert: '∣', Vert: '∥', quad: '  ', qquad: '   ', space: ' ',
};

const FRACTIONS = new Set(['frac', 'dfrac', 'tfrac', 'cfrac']);
const WRAPPERS = new Set([
  'text', 'textbf', 'textit', 'textrm', 'textsf', 'texttt', 'mathrm', 'mathbf', 'mathit', 'mathsf', 'mathtt', 'mathcal',
  'mathscr', 'mathfrak', 'operatorname', 'boxed', 'underline', 'emph', 'bm', 'boldsymbol', 'pmb', 'mbox', 'hbox', 'ensuremath',
]);
const ACCENTS = {
  overline: '\u0305', bar: '\u0304', widebar: '\u0304', hat: '\u0302', widehat: '\u0302', tilde: '\u0303', widetilde: '\u0303',
  dot: '\u0307', ddot: '\u0308', vec: '\u20D7', overrightarrow: '\u20D7',
};
// Layout-only commands that produce no text.
const DROPPED = new Set([
  'left', 'right', 'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr', 'Bigl', 'Bigr', 'biggl', 'biggr', 'Biggl', 'Biggr', 'displaystyle',
  'textstyle', 'scriptstyle', 'limits', 'nolimits', 'nonumber', 'notag', 'hline', 'centering', 'noindent', 'end',
]);
const STRUCTURAL = new Set(['sqrt', 'binom', 'mathbb', 'ce', 'xrightarrow', 'begin', 'label', 'tag', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'lim', 'max', 'min', 'exp', 'gcd']);
const BLACKBOARD = { R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ' };

const SUPERSCRIPTS = {
  0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ',
  t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ',
};
const SUBSCRIPTS = {
  0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
};

// Finds the "}" matching the "{" at `open`. An unclosed group, as in a streaming answer, runs to the end.
function closingBrace(tex, open) {
  let depth = 0;
  for (let i = open; i < tex.length; i++) {
    if (tex[i] === '\\') i++;
    else if (tex[i] === '{') depth++;
    else if (tex[i] === '}' && --depth === 0) return i;
  }
  return tex.length;
}

// Reads one TeX argument: a {group}, a \command or a single character.
function readArgument(tex, start) {
  let i = start;
  while (tex[i] === ' ') i++;
  if (tex[i] === '{') {
    const close = closingBrace(tex, i);
    return [tex.slice(i + 1, close), close + 1];
  }
  if (tex[i] === '\\') {
    const name = /^\\([a-zA-Z]+|[\s\S]?)/.exec(tex.slice(i))[0];
    return [name, i + name.length];
  }
  return [tex[i] ?? '', i + 1];
}

function readOptional(tex, start) {
  if (tex[start] !== '[') return [null, start];
  const close = tex.indexOf(']', start);
  return close < 0 ? [null, start] : [tex.slice(start + 1, close), close + 1];
}

function isSimple(text) {
  return /^[\p{L}\p{N}\p{M}.′°]+$/u.test(text);
}

function wrapIfComplex(text) {
  return !text || isSimple(text) ? text : `(${text})`;
}

function toScript(content, table, marker) {
  const text = content.replaceAll(' ', '');
  if (text === '∘') return '°';
  if (text === '′' || text === '∗') return text;
  const mapped = [...text].map((char) => table[char]);
  if (mapped.every(Boolean)) return mapped.join('');
  return `${marker}${wrapIfComplex(text)}`;
}

function withAccent(text, mark) {
  return [...text].map((char) => (char === ' ' ? char : char + mark)).join('');
}

function convertEnvironment(name, body) {
  const matrix = /matrix$/.test(name);
  const inner = matrix ? body.replace(/\s*\\\\\s*/g, '; ').replace(/\s*&\s*/g, ', ') : body;
  const text = convertTex(inner).trim();
  if (name === 'bmatrix') return `[${text}]`;
  if (name === 'pmatrix') return `(${text})`;
  if (name === 'vmatrix') return `∣${text}∣`;
  return text;
}

// Converts the command at tex[start] === "\\". Returns [text, index after the command].
function readCommand(tex, start) {
  const token = /^\\([a-zA-Z]+\*?|[\s\S]?)/.exec(tex.slice(start));
  const name = token[1].replace(/\*$/, '');
  let next = start + token[0].length;

  if (FRACTIONS.has(name)) {
    const [top, afterTop] = readArgument(tex, next);
    const [bottom, afterBottom] = readArgument(tex, afterTop);
    return [`${wrapIfComplex(convertTex(top).trim())}/${wrapIfComplex(convertTex(bottom).trim())}`, afterBottom];
  }
  if (name === 'binom') {
    const [n, afterN] = readArgument(tex, next);
    const [k, afterK] = readArgument(tex, afterN);
    return [`C(${convertTex(n).trim()}, ${convertTex(k).trim()})`, afterK];
  }
  if (name === 'sqrt') {
    const [degree, afterDegree] = readOptional(tex, next);
    const [radicand, afterRadicand] = readArgument(tex, afterDegree);
    const root = { null: '√', 2: '√', 3: '∛', 4: '∜' }[degree] ?? `${toScript(convertTex(degree), SUPERSCRIPTS, '^')}√`;
    return [root + wrapIfComplex(convertTex(radicand).trim()), afterRadicand];
  }
  if (WRAPPERS.has(name)) {
    const [inner, after] = readArgument(tex, next);
    return [convertTex(inner), after];
  }
  if (name in ACCENTS) {
    const [inner, after] = readArgument(tex, next);
    return [withAccent(convertTex(inner).trim(), ACCENTS[name]), after];
  }
  if (name === 'mathbb') {
    const [inner, after] = readArgument(tex, next);
    return [BLACKBOARD[inner] ?? convertTex(inner), after];
  }
  if (name === 'ce') {
    const [inner, after] = readArgument(tex, next);
    const formula = inner.replace(/([A-Za-z)\]])(\d+)/g, (_, atom, count) => atom + toScript(count, SUBSCRIPTS, '_'));
    return [convertTex(formula.replaceAll('->', '\\rightarrow ')), after];
  }
  if (name === 'xrightarrow') {
    const [, afterOptional] = readOptional(tex, next);
    const [label, after] = readArgument(tex, afterOptional);
    return [` —${convertTex(label).trim()}→ `, after];
  }
  if (name === 'label') return ['', readArgument(tex, next)[1]];
  if (name === 'tag') {
    const [inner, after] = readArgument(tex, next);
    return [` (${convertTex(inner).trim()})`, after];
  }
  if (name === 'begin') {
    const [environment, afterName] = readArgument(tex, next);
    const pattern = new RegExp(`\\\\(begin|end)\\{${environment.replace('*', '\\*')}\\}`, 'g');
    pattern.lastIndex = afterName;
    let depth = 1;
    for (let match = pattern.exec(tex); match; match = pattern.exec(tex)) {
      depth += match[1] === 'begin' ? 1 : -1;
      if (depth === 0) return [convertEnvironment(environment.replace('*', ''), tex.slice(afterName, match.index)), match.index + match[0].length];
    }
    return [convertEnvironment(environment.replace('*', ''), tex.slice(afterName)), tex.length];
  }
  if (DROPPED.has(name)) {
    if (name === 'left' || name === 'right') {
      while (tex[next] === ' ') next++;
      if (tex[next] === '.') next++;
    }
    if (name === 'end') next = readArgument(tex, next)[1];
    return ['', next];
  }
  if (name in SYMBOLS) return [SYMBOLS[name], next];

  if (/^[,;:! ]$/.test(name)) return [name === '!' ? '' : ' ', next];
  if (name === '\\') return ['\n\n', next];
  if (name === '|') return ['∥', next];
  return [name, next]; // \%, \$ and \{ keep their character; an unknown \word keeps its name.
}

function convertTex(tex) {
  let out = '';
  let i = 0;
  while (i < tex.length) {
    const char = tex[i];
    if (char === '\\') {
      const [text, next] = readCommand(tex, i);
      out += text;
      i = next;
    } else if (char === '^' || char === '_') {
      const [argument, next] = readArgument(tex, i + 1);
      out += toScript(convertTex(argument), char === '^' ? SUPERSCRIPTS : SUBSCRIPTS, char);
      i = next;
    } else if (char === '{') {
      const close = closingBrace(tex, i);
      out += convertTex(tex.slice(i + 1, close));
      i = close + 1;
    } else {
      // These would otherwise start markdown emphasis or split a table cell in the renderer.
      out += { '}': '', '&': ' ', '~': ' ', '*': '∗', '|': '∣' }[char] ?? char;
      i++;
    }
  }
  return out;
}

const MATH_PATTERN = /\$\$([\s\S]*?)(?:\$\$|$)|\\\[([\s\S]*?)(?:\\\]|$)|\\\(([\s\S]*?)(?:\\\)|$)|(\\begin\{[a-zA-Z]+\*?\}[\s\S]*?(?:\\end\{[a-zA-Z]+\*?\}(?![\s\S]*\\end\{)|$))|(?<![\\$\w])\$(?![\s$])((?:\\.|[^$\n\\])+?)(?<!\s)\$(?!\d)/g;
const BARE_PATTERN = /[A-Za-z]:\\\S*|(?<![\\/])\\(?:[a-zA-Z]+|[$%&#_{}])/g;

function isKnownCommand(name) {
  return FRACTIONS.has(name) || WRAPPERS.has(name) || DROPPED.has(name) || STRUCTURAL.has(name) || name in ACCENTS || name in SYMBOLS;
}

// Commands written without math delimiters. Anything unknown, like a file path, stays untouched.
function convertBareCommands(text) {
  let out = '';
  let cursor = 0;
  while (cursor < text.length) {
    BARE_PATTERN.lastIndex = cursor;
    const match = BARE_PATTERN.exec(text);
    if (!match) break;
    out += text.slice(cursor, match.index);
    const name = match[0].slice(1);
    if (match[0][0] === '\\' && (isKnownCommand(name) || name.length === 1)) {
      const [converted, next] = readCommand(text, match.index);
      out += converted;
      cursor = next;
    } else {
      out += match[0];
      cursor = match.index + match[0].length;
    }
  }
  out += text.slice(cursor);
  return out.replace(/([\w)\]])([\^_])\{([^{}]*)\}/g, (_, base, marker, script) => (
    base + toScript(convertTex(script), marker === '^' ? SUPERSCRIPTS : SUBSCRIPTS, marker)
  ));
}

function convertProse(text) {
  let out = '';
  let cursor = 0;
  for (const match of text.matchAll(MATH_PATTERN)) {
    out += convertBareCommands(text.slice(cursor, match.index));
    out += convertTex(match.slice(1).find((group) => group !== undefined) ?? '').trim();
    cursor = match.index + match[0].length;
  }
  return (out + convertBareCommands(text.slice(cursor))).replace(/(?<=\S) {2,}(?=\S)/g, ' ');
}

const CODE_PATTERN = /(```[^\n]*(?:\n[\s\S]*?(?:```|$)|$)|`[^`\n]+`)/;
const LATEX_IN_CODE = /\\(?:d?frac|sqrt|begin|sum|int|times|cdot|div|pm|leq|geq|neq|alpha|beta|theta|pi|left|right|mathbb|mathrm|text)\b/;

// Code samples stay as written unless the "code" is really a formula.
function convertCode(block) {
  const fence = /^```([^\n]*)\n?([\s\S]*?)(?:```)?$/.exec(block);
  if (fence) {
    const isTex = /^(la)?tex$|^math$/i.test(fence[1].trim());
    return isTex || LATEX_IN_CODE.test(fence[2]) ? convertProse(/\$/.test(fence[2]) ? fence[2] : `$$${fence[2]}$$`) : block;
  }
  const inner = block.slice(1, -1);
  return LATEX_IN_CODE.test(inner) || /^\$.+\$$/.test(inner) ? convertProse(/\$/.test(inner) ? inner : `$$${inner}$$`) : block;
}

export function latexToPlainText(source) {
  return source
    .split(CODE_PATTERN)
    .map((part, index) => (index % 2 ? convertCode(part) : convertProse(part)))
    .join('');
}
