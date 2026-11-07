import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGetParent, apiDeleteStudent } from "../../lib/api";
import { useAuth } from "../../lib/store";
import { Button, Spinner, Avatar } from "../../components/ui";
import ThemeChooser from "../../components/ThemeChooser";

export default function ParentSettings() {
  const user = useAuth((s) => s.user);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmId, setConfirmId] = useState(null);

  const { data: parent, isLoading } = useQuery({
    queryKey: ["parent", user.id],
    queryFn: () => apiGetParent(user.id),
  });

  const deleteMut = useMutation({
    mutationFn: (sid) => apiDeleteStudent(user.id, sid),
    onSuccess: (data) => {
      qc.setQueryData(["parent", user.id], data);
      setConfirmId(null);
    },
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="mb-10">
        <h1 className="page-title mb-2">Account &amp; preferences</h1>
        <p className="text-lg font-medium text-muted">Signed in as {parent.name} · {parent.email}</p>
      </div>

      {/* Theme */}
      <section className="card p-8">
        <h2 className="text-xl text-ink">Theme</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Switch between white and black mode.</p>
        <ThemeChooser />
      </section>

      {/* Account deletion — student accounts only */}
      <section className="card p-8">
        <h2 className="text-xl text-ink">Delete a student account</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Permanently remove a student's login and their data. This can't be undone. Only student
          accounts can be deleted here.
        </p>
        {parent.students.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
            No student accounts to manage.
          </p>
        ) : (
          <ul className="space-y-3">
            {parent.students.map((s) => (
              <li key={s.id} className="rounded-3xl border border-line bg-surface-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} size={40} />
                    <div>
                      <p className="font-bold text-ink">{s.name}</p>
                      <p className="text-xs text-muted">Grade {s.grade} · {s.email}</p>
                    </div>
                  </div>
                  {confirmId !== s.id && (
                    <Button variant="danger" onClick={() => setConfirmId(s.id)} className="py-2">
                      Delete
                    </Button>
                  )}
                </div>
                {confirmId === s.id && (
                  <div className="mt-3 rounded-2xl border border-accent/40 bg-accent-tint p-3">
                    <p className="text-sm text-ink">
                      Delete <span className="font-semibold">{s.name}</span>'s account and all its data?
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="danger"
                        disabled={deleteMut.isPending}
                        onClick={() => deleteMut.mutate(s.id)}
                        className="py-2"
                      >
                        {deleteMut.isPending ? "Deleting…" : "Yes, delete"}
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmId(null)} className="py-2">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Log out */}
      <section className="card flex flex-wrap items-center justify-between gap-4 p-8">
        <div>
          <h2 className="text-xl text-ink">Log out</h2>
          <p className="mt-1 text-sm text-muted">Sign out of your parent space on this device.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            signOut();
            navigate("/");
          }}
        >
          Log out
        </Button>
      </section>
    </div>
  );
}
