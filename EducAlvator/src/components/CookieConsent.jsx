import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui";

const COOKIE = "educalvator_cookie_consent";

function hasChoice() {
  try {
    return document.cookie.split(";").some((c) => c.trim().startsWith(`${COOKIE}=`));
  } catch {
    return false;
  }
}

function saveChoice(value) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${value}; Path=/; Max-Age=${365 * 86400}; SameSite=Lax${secure}`;
}

// First-visit cookie notice, shown on every page until the visitor chooses. The
// app only uses essential storage today, so both choices just record the decision
// (see the cookie table on the Privacy page).
export default function CookieConsent() {
  const [open, setOpen] = useState(() => !hasChoice());
  if (!open) return null;

  const choose = (value) => {
    saveChoice(value);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-4 bottom-4 z-[60] rounded-3xl border border-line bg-surface p-6 shadow-xl sm:left-auto sm:max-w-md"
    >
      <h2 className="text-xl text-ink">We use cookies</h2>
      <p className="mt-1 text-sm font-medium text-muted">
        Cookies and browser storage keep you signed in, remember your theme and save progress on this
        device. We don't use advertising or tracking cookies.{" "}
        <Link to="/privacy#cookies" className="font-bold text-accent hover:underline">
          Learn more
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => choose("all")} className="flex-1 whitespace-nowrap">
          Accept all
        </Button>
        <Button variant="outline" onClick={() => choose("essential")} className="flex-1 whitespace-nowrap">
          Essential only
        </Button>
      </div>
    </div>
  );
}
