import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiGetParent,
  apiSetPlan,
  apiCreateStudent,
  PLANS,
  PLAN_LIMITS,
  CUSTOM_PLAN,
  CONTACT,
} from "../../lib/api";
import { useAuth } from "../../lib/store";
import { watchReport } from "../../lib/reports";
import { Button, Badge, Spinner, Avatar } from "../../components/ui";
import StudentReport from "../../components/StudentReport";
import AddStudentForm from "./AddStudentForm";

const PLAN_BG = ["bg-pastel-teal", "bg-pastel-orange", "bg-pastel-purple"];

export default function ParentDashboard() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const { data: parent, isLoading } = useQuery({
    queryKey: ["parent", user.id],
    queryFn: () => apiGetParent(user.id),
  });

  const planMut = useMutation({
    mutationFn: (plan) => apiSetPlan(user.id, plan),
    onSuccess: (data) => qc.setQueryData(["parent", user.id], data),
  });

  const createMut = useMutation({
    mutationFn: (payload) => apiCreateStudent(user.id, payload),
    onSuccess: (data) => {
      qc.setQueryData(["parent", user.id], data);
      setAdding(false);
      setAddError("");
    },
    onError: (e) => setAddError(e.message),
  });

  if (isLoading) return <Spinner label="Opening your family space…" />;

  const limit = PLAN_LIMITS[parent.plan] ?? 1;
  const canAdd = parent.students.length < limit;
  const currentPlan = PLANS.find((p) => p.id === parent.plan);

  const waLink = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(
    "Hi EducAlvator, I'd like to discuss a custom plan for more students."
  )}`;
  const mailLink = `mailto:${CONTACT.email}?subject=${encodeURIComponent("Custom plan enquiry")}`;

  return (
    <div className="space-y-10">
      {/* Greeting */}
      <div>
        <h1 className="page-title mb-2">
          Salut, {parent.name.split(" ")[0]}!
        </h1>
        <p className="text-lg font-medium text-muted">
          A calmer picture of progress for your family. You're on the{" "}
          <span className="font-bold text-accent">{currentPlan?.name}</span> plan.
        </p>
      </div>

      {/* Pricing / plan options */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl text-ink">Your plan</h2>
          <Badge tone="muted">
            {parent.students.length} / {limit} student{limit > 1 ? "s" : ""} used
          </Badge>
        </div>
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:gap-8 xl:grid-cols-3">
          {PLANS.map((plan, n) => {
            const active = plan.id === parent.plan;
            return (
              <div
                key={plan.id}
                className={`${PLAN_BG[n % PLAN_BG.length]} flex flex-col rounded-3xl border p-6 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.05)] transition-transform duration-300 hover:-translate-y-1 ${
                  active ? "border-accent" : "border-black/5 dark:border-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl text-ink">{plan.name}</h3>
                  {active && <Badge>Current</Badge>}
                </div>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-3xl font-extrabold tracking-tight text-ink">₹{plan.price.toLocaleString("en-IN")}</span>
                  <span className="mb-1 text-xs font-bold text-muted">/ {plan.cadence}</span>
                </div>
                <p className="mt-1 text-xs font-bold text-muted">
                  {plan.students} student{plan.students > 1 ? "s" : ""}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm font-medium text-ink">
                  {plan.features.slice(0, 3).map((f) => (
                    <li key={f} className="flex gap-2"><span className="text-accent">—</span>{f}</li>
                  ))}
                </ul>
                <Button
                  variant={active ? "outline" : "primary"}
                  disabled={active || planMut.isPending}
                  onClick={() => planMut.mutate(plan.id)}
                  className="mt-6 w-full"
                >
                  {active ? "Selected" : planMut.isPending ? "Switching…" : `Switch to ${plan.name.split(" ")[0]}`}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Custom plan contact */}
        <div className="card mt-6 flex flex-col items-start justify-between gap-4 p-8 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl text-ink">{CUSTOM_PLAN.name}</h3>
              <Badge tone="outline">Custom pricing</Badge>
            </div>
            <p className="mt-1 text-sm font-medium text-muted">
              Need 3+ learners or a classroom? {CUSTOM_PLAN.tagline} Reach us at {CONTACT.whatsappDisplay}.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button as="a" href={mailLink}>Email us</Button>
            <Button as="a" href={waLink} target="_blank" rel="noopener" variant="outline">WhatsApp</Button>
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-muted">
          Switching to a smaller plan removes extra student profiles over the limit.
        </p>
      </section>

      {/* Students */}
      <section>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl text-ink">Your students</h2>
          {!adding && (
            <Button onClick={() => canAdd && setAdding(true)} disabled={!canAdd}>
              + Create student
            </Button>
          )}
        </div>

        {!canAdd && !adding && (
          <div className="mb-6 rounded-2xl border border-line bg-surface px-5 py-4 text-sm font-medium text-muted shadow-sm">
            You've used all {limit} student profile{limit > 1 ? "s" : ""} on the {currentPlan?.name} plan.
            Upgrade above, or contact us for a custom plan to add more.
          </div>
        )}

        {adding && (
          <div className="card mb-6 p-8">
            <h3 className="mb-4 text-xl text-ink">Create a student login</h3>
            <AddStudentForm
              onSubmit={(d) => createMut.mutate(d)}
              onCancel={() => {
                setAdding(false);
                setAddError("");
              }}
              submitting={createMut.isPending}
              error={addError}
            />
          </div>
        )}

        {parent.students.length === 0 && !adding ? (
          <div className="card p-10 text-center">
            <h3 className="text-xl text-ink">No students yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              Create a student login to give your child their own learning space with games,
              resources and progress tracking.
            </p>
            <Button onClick={() => setAdding(true)} className="mt-4" disabled={!canAdd}>
              + Create your first student
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:gap-8">
            {parent.students.map((s) => (
              <StudentBox key={s.id} student={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* One box per student: the student's report, read LOCALLY from this browser's
   stored data. Updates across tabs in the same browser (storage events), no
   cloud. Falls back to the profile already loaded if there's no local report. */
function StudentBox({ student }) {
  const [live, setLive] = useState(null);

  useEffect(() => {
    if (!student?.email) return;
    const unsub = watchReport(student.email, (r) => setLive(r));
    return () => unsub && unsub();
  }, [student?.email]);

  // Prefer the freshly-read local report; otherwise use the loaded profile.
  const merged = live
    ? {
        ...student,
        name: live.studentName || student.name,
        grade: live.grade ?? student.grade,
        stats: { ...student.stats, ...live.stats },
        activity: live.activity ?? student.activity,
        recent: live.recent ?? student.recent ?? [],
      }
    : student;

  const { stats = {} } = merged;

  return (
    <div className="card p-8">
      {/* Student identity header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={merged.name} size={48} />
          <div>
            <h3 className="text-xl text-ink">{merged.name}</h3>
            <p className="text-xs font-medium text-muted">Grade {merged.grade} · {student.email}</p>
          </div>
        </div>
        <Badge tone="muted">🔥 {stats.streak || 0}-day streak</Badge>
      </div>

      {/* Complete Pictorial Student Report */}
      <div className="mt-5">
        <StudentReport student={merged} compact />
      </div>
    </div>
  );
}
