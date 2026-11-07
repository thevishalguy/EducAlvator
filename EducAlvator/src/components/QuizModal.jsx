import { useEffect, useState, useRef } from "react";
import { QUIZ_LENGTH, QUIZ_CORRECT, penaltyFor } from "../lib/quiz";
import { canUse, record } from "../lib/usage";
import { logActivity } from "../lib/reports";
import { apiRecordQuizScore } from "../lib/api";
import { Button, Badge } from "./ui";

// Same-page quiz. Questions are generated live by the AI from the topic the
// student types — nothing is hardcoded.
export default function QuizModal({ onClose, grade, studentId, plan, demo, student }) {
  const [step, setStep] = useState("setup"); // setup | quiz | result
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [picked, setPicked] = useState(null);
  const recordedResult = useRef(false);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const question = questions[qIndex];
  const answered = picked !== null;
  const isLast = qIndex === questions.length - 1;
  const penalty = question ? penaltyFor(question.options.length) : 0;
  const maxScore = questions.length * QUIZ_CORRECT;

  const generate = async (t) => {
    const chosen = (t ?? topic).trim();
    if (!chosen) {
      setError("Please enter a topic to make a quiz about.");
      return;
    }
    if (studentId && !canUse(plan, studentId, "quizzes", 1, demo)) {
      setError("You've used your quiz for this demo account.");
      return;
    }
    setTopic(chosen);
    setError("");
    setLoading(true);
    recordedResult.current = false;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "quiz", topic: chosen, grade, count: QUIZ_LENGTH }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.items?.length) {
        setError(data.error || "Couldn't generate that quiz. Try another topic.");
        setLoading(false);
        return;
      }
      if (studentId) record(studentId, "quizzes"); // count this generation
      if (student) logActivity(student, "quizzes", `Started Quiz: ${chosen}`); // report to parent
      setQuestions(data.items);
      setQIndex(0);
      setScore(0);
      setCorrectCount(0);
      setPicked(null);
      setStep("quiz");
    } catch {
      setError("Couldn't reach the quiz generator. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const advance = async () => {
    if (qIndex >= questions.length - 1) {
      setStep("result");
      const sid = studentId || student?.id;
      if (sid && !recordedResult.current) {
        recordedResult.current = true;
        const total = questions.length;
        const finalMax = total * QUIZ_CORRECT;
        const finalScore = Math.max(0, score);
        const pct = Math.round((correctCount / total) * 100);
        try {
          const updated = await apiRecordQuizScore(sid, {
            topic,
            score: finalScore,
            maxScore: finalMax,
            correctCount,
            totalQuestions: total,
          });
          if (student) {
            logActivity(
              updated || student,
              "quizzes",
              `Completed Quiz: ${topic} · Scored ${finalScore} pts (${correctCount}/${total} correct · ${pct}%)`
            );
          }
        } catch {
          /* ignore */
        }
      }
    } else {
      setQIndex((i) => i + 1);
      setPicked(null);
    }
  };

  const pick = (i) => {
    if (answered) return;
    setPicked(i);
    if (i === question.answer) {
      setScore((s) => s + QUIZ_CORRECT);
      setCorrectCount((c) => c + 1);
    } else {
      setScore((s) => s - penaltyFor(question.options.length));
    }
  };

  // Auto-advance 1s after an answer; the "Next" button also works immediately.
  useEffect(() => {
    if (step !== "quiz" || picked === null) return;
    const t = setTimeout(() => advance(), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, qIndex, step, questions.length]);

  const newTopic = () => {
    setStep("setup");
    setPicked(null);
    setError("");
  };

  const optionClass = (i) => {
    const base = "flex items-center justify-between gap-2 w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-left transition-colors";
    if (!answered) return `${base} border-line-strong bg-surface hover:border-accent`;
    if (i === question.answer) return `${base} border-accent bg-accent-tint text-accent-deep font-semibold`;
    if (i === picked) return `${base} border-line bg-bg-soft text-muted line-through`;
    return `${base} border-line bg-surface text-muted`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] bg-surface sm:rounded-[2rem]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2">
            <Badge>Quiz</Badge>
            <h2 className="text-lg text-ink">
              {step === "setup" ? "AI quiz" : topic}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close quiz" className="grid h-9 w-9 place-items-center rounded-full text-faint transition-colors hover:bg-bg-soft hover:text-ink">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* SETUP: choose a topic */}
          {step === "setup" && (
            <div className="space-y-5">
              <p className="text-sm text-muted">
                Type any topic and the AI will build a {QUIZ_LENGTH}-question quiz for you. Correct answers earn
                <span className="font-semibold text-ink"> +{QUIZ_CORRECT}</span>; wrong answers use fair,
                guessing-corrected marking.
              </p>

              <form onSubmit={(e) => { e.preventDefault(); generate(); }}>
                <label className="mb-1.5 block text-sm font-bold text-ink">Quiz topic</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Fractions, the water cycle, verbs…"
                  autoFocus
                  disabled={loading}
                  className="w-full rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-semibold text-ink shadow-sm outline-none transition-shadow placeholder:text-faint focus:border-accent/30 focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                />
              </form>

              {error && <p className="text-sm font-medium text-accent">{error}</p>}

              <Button onClick={() => generate()} disabled={loading} className="w-full py-2.5">
                {loading ? "Generating your quiz…" : "Generate quiz"}
              </Button>
              {loading && <p className="text-center text-xs text-muted">The AI is writing your questions — this takes a few seconds.</p>}
            </div>
          )}

          {/* QUIZ */}
          {step === "quiz" && question && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Question {qIndex + 1} of {questions.length}</span>
                <Badge>Score: {score}</Badge>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-soft">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((qIndex + (answered ? 1 : 0)) / questions.length) * 100}%` }} />
              </div>

              <h3 className="text-lg text-ink">{question.q}</h3>

              <div className="space-y-2">
                {question.options.map((opt, i) => (
                  <button key={i} onClick={() => pick(i)} disabled={answered} className={optionClass(i)}>
                    <span>{opt}</span>
                    {answered && i === question.answer && <span className="text-accent">✓</span>}
                    {answered && i === picked && i !== question.answer && <span className="text-muted">✗</span>}
                  </button>
                ))}
              </div>

              {answered && (
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${picked === question.answer ? "text-accent-deep" : "text-muted"}`}>
                    {picked === question.answer ? `Correct! +${QUIZ_CORRECT}` : `Not quite · −${penalty}`}
                  </span>
                  <Button onClick={advance} className="py-2">{isLast ? "See results" : "Next question →"}</Button>
                </div>
              )}
            </div>
          )}

          {/* RESULT */}
          {step === "result" && (
            <div className="space-y-5 text-center">
              <div>
                <p className="eyebrow">Quiz complete</p>
                <p className="mt-2 text-5xl font-extrabold tracking-tight text-accent">{score}</p>
                <p className="mt-1 text-sm text-muted">points · {correctCount} of {questions.length} correct · max possible {maxScore}</p>
              </div>
              <p className="text-sm text-ink">
                {correctCount === questions.length ? "Perfect score — brilliant work! 🎉"
                  : correctCount >= questions.length / 2 ? "Nice going — keep practising to ace it."
                  : "Good try — review the topic and give it another go."}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button onClick={() => generate(topic)}>Retry this topic</Button>
                <Button variant="soft" onClick={newTopic}>New topic</Button>
                <Button variant="ghost" onClick={onClose}>Close</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
