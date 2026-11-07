import { useQuery } from "@tanstack/react-query";
import { apiGetStudent } from "../../lib/api";
import { useAuth } from "../../lib/store";
import { Spinner } from "../../components/ui";
import Leaderboard from "../../components/Leaderboard";

export default function Rankings() {
  const user = useAuth((s) => s.user);
  const { data: student, isLoading } = useQuery({
    queryKey: ["student", user.id],
    queryFn: () => apiGetStudent(user.id),
  });
  if (isLoading) return <Spinner />;

  return (
    <div>
      <section className="mb-10">
        <h1 className="page-title mb-2">Leaderboard</h1>
        <p className="text-lg font-medium text-muted">See where you stand in Grade {student.grade}.</p>
      </section>
      <div className="max-w-3xl">
        <Leaderboard grade={student.grade} selfId={student.id} />
      </div>
    </div>
  );
}
