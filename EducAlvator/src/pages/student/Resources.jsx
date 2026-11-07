import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGetStudent, apiGetResources } from "../../lib/api";
import { useAuth } from "../../lib/store";
import { logActivity } from "../../lib/reports";
import { Button, Badge, Spinner, UsagePill } from "../../components/ui";
import { Icons } from "../../components/icons";
import { getUsage, record, limitFor } from "../../lib/usage";
import { matchesQuery } from "../../lib/search";

const SUBJECT_BG = { maths: "bg-pastel-orange", english: "bg-pastel-purple", science: "bg-pastel-teal" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "maths", label: "Maths" },
  { key: "english", label: "English" },
  { key: "science", label: "Science" },
];

export default function Resources() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [used, setUsed] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [params, setParams] = useSearchParams();
  const query = (params.get("q") || "").trim();

  const { data: student } = useQuery({ queryKey: ["student", user.id], queryFn: () => apiGetStudent(user.id) });
  const grade = student?.grade;
  const plan = student?.plan || "free";
  const demo = student?.demo || false;
  const limit = limitFor(plan, "resources", demo);

  useEffect(() => {
    if (student) setUsed(getUsage(student.id).resources || 0);
  }, [student]);

  const { data: resources, isLoading } = useQuery({
    queryKey: ["resources", grade],
    queryFn: () => apiGetResources(grade),
    enabled: !!grade,
  });

  const shown = useMemo(
    () =>
      (resources || []).filter(
        (r) =>
          (filter === "all" || r.subjectKey === filter) &&
          matchesQuery(`${r.title} ${r.subject} ${r.desc}`, query)
      ),
    [resources, filter, query]
  );

  const openPdf = (r) => {
    if (used >= limit) {
      setBlocked(true);
      return;
    }
    const u = record(student.id, "resources");
    setUsed(u.resources);
    if (u.resources >= limit) setBlocked(true);
    logActivity(student, "resources", `Opened ${r.subject}: ${r.title}`);
    window.open(r.url, "_blank", "noopener");
  };

  // Open a fresh Study Buddy chat with this PDF imported, ready to ask about.
  const askAbout = (r) => {
    navigate("/app/chat", { state: { resource: { url: r.url || null, title: r.title } } });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title mb-2">
            Study resources for Grade {grade || "…"}
          </h1>
          <p className="max-w-2xl text-lg font-medium text-muted">
            Hand-picked PDFs matched to your grade. Tap any card to open the worksheet.
          </p>
          {student && (
            <div className="mt-3">
              <UsagePill label="Study PDFs today" used={used} limit={limit} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
                filter === f.key ? "bg-accent text-white shadow-md" : "bg-surface border border-line text-ink shadow-sm hover:bg-bg-soft"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {query && (
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-muted">
          <span>{shown.length} {shown.length === 1 ? "result" : "results"} for "{query}"</span>
          <button onClick={() => setParams({})} className="font-bold text-accent hover:underline">Clear search</button>
        </div>
      )}

      {blocked && used >= limit && (
        <div className="rounded-2xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-accent-deep">
          You've opened your {limit} study {limit === 1 ? "PDF" : "PDFs"} for today on the{" "}
          <span className="font-semibold capitalize">{plan}</span> plan. Come back tomorrow, or ask a parent to upgrade for more.
        </div>
      )}

      {isLoading || !grade ? (
        <Spinner label="Gathering your resources…" />
      ) : !resources?.length ? (
        <div className="card flex flex-col items-start gap-4 p-8">
          <div>
            <h2 className="text-xl text-ink">No study PDFs yet</h2>
            <p className="mt-1 text-sm font-medium text-muted">
              The resource library is empty for now. You can still upload your own PDF or ask the Study Buddy about any topic.
            </p>
          </div>
          <Button onClick={() => navigate("/app/chat")}>Open Study Buddy</Button>
        </div>
      ) : query && shown.length === 0 ? (
        <div className="card flex flex-col items-start gap-4 p-8">
          <div>
            <h2 className="text-xl text-ink">No study PDFs match "{query}"</h2>
            <p className="mt-1 text-sm font-medium text-muted">
              PDFs are named by chapter, so try a chapter or subject name, or ask the Study Buddy about this topic.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/app/chat", { state: { ask: query } })}>Ask Study Buddy about "{query}"</Button>
            <Button variant="outline" onClick={() => setParams({})}>Show all PDFs</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8 xl:grid-cols-3">
          {shown.map((r) => {
            const atLimit = used >= limit;
            return (
              <div key={r.id} className={`${SUBJECT_BG[r.subjectKey] || "bg-surface"} flex flex-col rounded-3xl border border-black/5 p-6 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.05)] transition-transform duration-300 hover:-translate-y-1 dark:border-white/5`}>
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface text-ink shadow-sm">
                    <Icons.Document className="h-6 w-6" />
                  </span>
                  <Badge>{r.subject}</Badge>
                </div>
                <h3 className="mt-5 text-xl leading-tight text-ink">{r.title}</h3>
                <p className="mt-2 flex-1 text-sm font-medium text-muted">{r.desc}</p>
                <div className="mt-4 space-y-2">
                  <span className="block text-xs font-bold text-muted">
                    {`PDF · ${r.sizeKB} KB`}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => openPdf(r)}
                      disabled={atLimit}
                      className="flex-1 whitespace-nowrap py-2"
                    >
                      {atLimit ? "Daily limit" : "Open PDF ↗"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => askAbout(r)}
                      className="flex-1 whitespace-nowrap py-2"
                    >
                      Ask EducAlvator
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
