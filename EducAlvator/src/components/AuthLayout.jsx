import { Link } from "react-router-dom";
import { Logo } from "./ui";

export default function AuthLayout({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 lg:px-10">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-5 py-6">
        <div className="w-full max-w-md">
          <div className="text-center">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-2 text-4xl tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-2 text-base font-medium text-muted">{subtitle}</p>}
          </div>
          <div className="card mt-7 p-8">{children}</div>
          {footer && <div className="mt-5 text-center text-sm font-medium text-muted">{footer}</div>}
          <div className="mt-4 text-center">
            <Link to="/" className="text-sm font-bold text-faint hover:text-accent">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-bold text-accent">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-semibold text-ink shadow-sm outline-none transition-shadow placeholder:text-faint focus:border-accent/30 focus:ring-2 focus:ring-accent/20";
