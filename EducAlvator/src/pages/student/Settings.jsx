import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui";
import ThemeChooser from "../../components/ThemeChooser";
import VoiceChooser from "../../components/VoiceChooser";
import { useAuth } from "../../lib/store";
import { apiGetStudent } from "../../lib/api";

export default function StudentSettings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: student } = useQuery({
    queryKey: ["student", user?.id],
    queryFn: () => apiGetStudent(user.id),
    enabled: !!user?.id,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="mb-10">
        <h1 className="page-title mb-2">Make it yours</h1>
        <p className="text-lg font-medium text-muted">Signed in as {user?.name} · {user?.email}</p>
      </div>

      <section className="card p-8">
        <h2 className="text-xl text-ink">Theme</h2>
        <p className="mb-4 mt-1 text-sm font-medium text-muted">Choose how EducAlvator looks for you.</p>
        <ThemeChooser />
      </section>

      <section className="card p-8">
        <h2 className="text-xl text-ink">Study Buddy voice</h2>
        <p className="mb-4 mt-1 text-sm font-medium text-muted">
          Pick how the Study Buddy sounds in Voice Mode and when it reads a reply aloud. Tap a voice to hear it.
        </p>
        <VoiceChooser />
      </section>

      <section className="card p-8">
        <h2 className="text-xl text-ink">Your plan</h2>
        <p className="mt-1 text-sm font-medium text-muted">
          You're on the <span className="font-bold capitalize text-accent">{student?.plan || "free"}</span> plan.
          A parent can change it from their family dashboard.
        </p>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-4 p-8">
        <div>
          <h2 className="text-xl text-ink">Log out</h2>
          <p className="mt-1 text-sm font-medium text-muted">Sign out of your learning space on this device.</p>
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
