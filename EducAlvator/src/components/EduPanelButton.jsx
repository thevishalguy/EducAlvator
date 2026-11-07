import { useEffect, useState } from "react";
import { LogoMark } from "./ui";

// "Get EduPanel" under the account pill: asks first, then downloads the EduPanel
// extension and shows how to add it. Chrome doesn't let a website install an
// extension by itself, so the last steps happen on chrome://extensions.

const ZIP_URL = "/downloads/EduPanel.zip";

const isChromium = () =>
  typeof navigator !== "undefined" &&
  (navigator.userAgentData?.brands?.some((b) => /chromium|chrome|edge/i.test(b.brand)) || /Chrome\/|Edg\//.test(navigator.userAgent));
const isMobile = () => typeof navigator !== "undefined" && (navigator.userAgentData?.mobile || /Android|iPhone|iPad/i.test(navigator.userAgent));

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function EduPanelButton() {
  const [step, setStep] = useState(null); // null | "ask" | "steps"
  const [copied, setCopied] = useState(false);
  const close = () => {
    setStep(null);
    setCopied(false);
  };

  useEffect(() => {
    if (!step) return;
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const download = () => {
    const a = document.createElement("a");
    a.href = ZIP_URL;
    a.download = "EduPanel.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStep("steps");
  };

  const supported = isChromium() && !isMobile();

  return (
    <>
      <button
        type="button"
        onClick={() => setStep("ask")}
        className="flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink shadow-sm transition-shadow hover:shadow-md"
      >
        <LogoMark className="h-4 w-4" />
        Get EduPanel
      </button>

      {step && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edupanel-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 text-left shadow-xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <LogoMark className="h-10 w-10" />
              <div>
                <p className="eyebrow">Chrome extension</p>
                <h2 id="edupanel-title" className="text-lg font-extrabold text-ink">
                  {step === "ask" ? "Should I download EduPanel?" : "EduPanel is downloading"}
                </h2>
              </div>
            </div>

            {step === "ask" ? (
              <>
                <p className="text-sm font-medium text-muted">
                  EduPanel opens a side panel in Chrome where you can ask questions about the PDF or web page you're reading.
                  It downloads as a small zip file (about 2 MB).
                </p>
                {!supported && (
                  <p className="mt-3 rounded-2xl bg-accent-tint px-3 py-2 text-xs font-semibold text-accent-deep dark:text-accent">
                    EduPanel works in Chrome or Edge on a computer. You can still download it here and add it there.
                  </p>
                )}
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={close} className="rounded-full border border-line-strong px-4 py-2 text-sm font-bold text-ink hover:bg-bg-soft">
                    Not now
                  </button>
                  <button onClick={download} autoFocus className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-accent-deep">
                    Download
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-muted">
                  Chrome doesn't let websites add extensions on their own, so finish with a few clicks:
                </p>
                <ol className="mt-3 space-y-2 text-sm font-medium text-ink">
                  <li className="flex gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-tint text-[10px] font-extrabold text-accent-deep dark:text-accent">1</span>
                    <span>Unzip <b>EduPanel.zip</b> (right-click it, then Extract All).</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-tint text-[10px] font-extrabold text-accent-deep dark:text-accent">2</span>
                    <span>
                      In a new tab, open{" "}
                      <button
                        type="button"
                        onClick={async () => setCopied(await copy("chrome://extensions"))}
                        className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-bold text-ink hover:bg-bg-soft"
                        title="Copy"
                      >
                        chrome://extensions
                      </button>{" "}
                      {copied && <span className="text-xs font-bold text-accent">Copied</span>}
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-tint text-[10px] font-extrabold text-accent-deep dark:text-accent">3</span>
                    <span>Turn on <b>Developer mode</b> (top right).</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-tint text-[10px] font-extrabold text-accent-deep dark:text-accent">4</span>
                    <span>Click <b>Load unpacked</b> and choose the <b>EduPanel</b> folder.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-tint text-[10px] font-extrabold text-accent-deep dark:text-accent">5</span>
                    <span>Pin EduPanel from the puzzle-piece menu, then click it on any PDF or page.</span>
                  </li>
                </ol>
                <p className="mt-3 text-xs font-medium text-muted">
                  EduPanel needs a Gemini API key: paste it into <b>sidepannel.env.txt</b> inside the EduPanel folder. Backup keys in <b>sidepannel-backup.env.txt</b> and <b>sidepannel-backup-2.env.txt</b> answer, in that order, when the one before fails.
                </p>
                <div className="mt-5 flex items-center justify-between gap-2">
                  <a href={ZIP_URL} download="EduPanel.zip" className="text-xs font-bold text-accent hover:underline">
                    Download didn't start?
                  </a>
                  <button onClick={close} className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-accent-deep">
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
