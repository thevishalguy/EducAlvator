import { Link } from "react-router-dom";

/* ---------------- Brand logo ---------------- */
// The EducAlvator mark (same artwork as public/logo.svg), drawn inline so it
// needs no request.
export function LogoMark({ className = "h-10 w-10" }) {
  return (
    <svg viewBox="357 357 2830 2830" className={`shrink-0 ${className}`} role="img" aria-label="EducAlvator logo">
      <path
        d="M2436.076,576.608l-1482.95,-200.166l-552.212,879.495l158.669,1000.153l863.233,910.775l1719.578,-942.175l-10.02,-824.172l-1440.954,709.537l1126.824,-1177.408"
        fill="#e05d43"
        stroke="#000"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M1394.2,813.129l11.621,955.876l795.195,-965.685l-806.817,9.809Z" fill="#fff" stroke="#000" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

// The mark, then the wordmark. `inverse` is for dark backgrounds (the sidebar
// and footer).
export function Logo({ to = "/", withText = true, inverse = false }) {
  return (
    <Link to={to} className="flex items-center gap-3 shrink-0" aria-label="EducAlvator home">
      <LogoMark className="h-10 w-10 drop-shadow-[0_0_10px_rgba(224,93,67,0.35)]" />
      {withText && (
        <span className={`text-xl font-bold tracking-tight sm:text-2xl ${inverse ? "text-white" : "text-ink"}`}>
          EducAlvator<span className="text-accent">.</span>
        </span>
      )}
    </Link>
  );
}

/* ---------------- Avatar (initials, no emoji) ---------------- */
export function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

export function Avatar({ name, size = 40, muted = false, className = "" }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold shadow-sm ring-2 ring-bg ${
        muted ? "bg-stone-500 text-white" : "bg-accent text-white"
      } ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

/* ---------------- Button ---------------- */
const variants = {
  primary: "bg-accent text-white shadow-md hover:bg-accent-deep",
  outline: "bg-transparent text-ink border border-line-strong hover:bg-bg-soft",
  soft: "bg-accent-tint text-accent-deep hover:brightness-[0.98]",
  ghost: "bg-transparent text-ink hover:bg-bg-soft",
  danger: "bg-transparent text-accent border border-accent/40 hover:bg-accent-tint",
};

export function Button({ as = "button", variant = "primary", className = "", children, ...props }) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`;
  if (as === "link") {
    const { to, ...rest } = props;
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  if (as === "a") {
    return (
      <a className={cls} {...props}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}

/* ---------------- Eyebrow + Badge ---------------- */
export function Eyebrow({ children, className = "" }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

export function Badge({ children, tone = "accent", className = "" }) {
  const tones = {
    accent: "bg-surface text-ink border border-black/10 shadow-sm dark:border-white/10",
    muted: "bg-bg-soft text-muted",
    outline: "border border-line-strong text-muted",
  };
  // Legacy subject tones collapse to the single accent tone.
  const resolved = tones[tone] || tones.accent;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${resolved} ${className}`}>
      {children}
    </span>
  );
}

/* ---------------- Usage pill (daily limits) ---------------- */
export function UsagePill({ label, used, limit, className = "" }) {
  const unlimited = limit === Infinity;
  const reached = !unlimited && used >= limit;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
        reached ? "bg-accent text-white" : "bg-bg-soft text-muted"
      } ${className}`}
    >
      {label}: {unlimited ? "Unlimited" : `${used}/${limit}`}
    </span>
  );
}

/* ---------------- Loading spinner ---------------- */
export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}
    </div>
  );
}
