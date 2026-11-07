import { useEffect, useState } from "react";
import { canUse, record } from "../lib/usage";
import { logActivity } from "../lib/reports";
import { Button, Badge } from "./ui";

const CARD_COUNT = 3;

// A single flip card: tap to turn it over (3D rotateY flip).
function FlipCard({ index, front, back }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button type="button" onClick={() => setFlipped((f) => !f)} className="w-full text-left" style={{ perspective: "1000px" }} aria-label={`Flashcard ${index + 1}, tap to flip`}>
      <div className="relative w-full" style={{ height: 150, transformStyle: "preserve-3d", transition: "transform 0.5s", transform: flipped ? "rotateY(180deg)" : "none" }}>
        <div className="absolute inset-0 flex flex-col justify-between rounded-3xl border border-black/5 bg-pastel-orange p-5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.05)] dark:border-white/5" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
          <div className="flex items-center justify-between">
            <Badge tone="outline">Card {index + 1}</Badge>
            <span className="text-xs text-muted">Tap to flip</span>
          </div>
          <p className="text-base font-extrabold text-ink">{front}</p>
          <span className="text-xs text-muted">Question</span>
        </div>
        <div className="absolute inset-0 flex flex-col justify-between rounded-3xl border border-black/5 bg-pastel-teal p-5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.05)] dark:border-white/5" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <div className="flex items-center justify-between">
            <Badge>Card {index + 1}</Badge>
            <span className="text-xs font-bold text-muted">Tap to flip back</span>
          </div>
          <p className="text-sm font-medium text-ink">{back}</p>
          <span className="text-xs font-bold text-muted">Answer</span>
        </div>
      </div>
    </button>
  );
}

// Flashcards generated live by the AI from the topic the student types.
export default function FlashcardModal({ onClose, grade, studentId, plan, demo, student }) {
  const [topic, setTopic] = useState("");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const generate = async (t) => {
    const chosen = (t ?? topic).trim();
    if (!chosen) {
      setError("Please enter a topic to make flashcards about.");
      return;
    }
    if (studentId && !canUse(plan, studentId, "flashcards", 1, demo)) {
      setError("You've used your flashcard deck for this demo account.");
      return;
    }
    setTopic(chosen);
    setError("");
    setLoading(true);
    setCards([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "flashcards", topic: chosen, grade, count: CARD_COUNT }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.cards?.length) {
        setError(data.error || "Couldn't generate those flashcards. Try another topic.");
      } else {
        if (studentId) record(studentId, "flashcards"); // count this generation
        if (student) logActivity(student, "flashcards", `Flashcards: ${chosen}`); // report to parent
        setCards(data.cards);
      }
    } catch {
      setError("Couldn't reach the flashcard generator. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] bg-surface sm:rounded-[2rem]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2">
            <Badge>Flashcards</Badge>
            <h2 className="text-lg text-ink">{cards.length ? topic : "AI flashcards"}</h2>
          </div>
          <button onClick={onClose} aria-label="Close flashcards" className="grid h-9 w-9 place-items-center rounded-full text-faint transition-colors hover:bg-bg-soft hover:text-ink">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Type any topic and the AI will make {CARD_COUNT} flashcards. Tap a card to flip between the
              question and the answer.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); generate(); }} className="flex gap-2">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Photosynthesis, fractions, verbs…"
                autoFocus
                disabled={loading}
                className="min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-semibold text-ink shadow-sm outline-none transition-shadow placeholder:text-faint focus:border-accent/30 focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              />
              <Button onClick={() => generate()} disabled={loading} className="shrink-0 px-4">
                {loading ? "…" : "Make"}
              </Button>
            </form>

            {error && <p className="text-sm font-medium text-accent">{error}</p>}
          </div>

          {loading ? (
            <div className="mt-5 rounded-3xl border border-dashed border-line-strong p-8 text-center text-sm text-muted">
              The AI is writing your flashcards — a few seconds…
            </div>
          ) : cards.length ? (
            <div className="mt-5 space-y-3">
              {cards.map((c, i) => (
                <FlipCard key={`${topic}-${i}`} index={i} front={c.front} back={c.back} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-line-strong p-8 text-center text-sm text-muted">
              Your flashcards will appear here once you enter a topic.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          {cards.length > 0 && <Button variant="soft" onClick={() => setCards([])}>New topic</Button>}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
