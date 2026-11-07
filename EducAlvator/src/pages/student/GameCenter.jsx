import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GAMES } from "../../lib/games";
import { apiGetStudent, apiGetLeaderboard, gradeHasGames } from "../../lib/api";
import { useAuth } from "../../lib/store";
import { Button, Badge, Spinner } from "../../components/ui";
import ModuleCard, { useBookmarks, savedFirst } from "../../components/ModuleCard";
import QuizModal from "../../components/QuizModal";
import FlashcardModal from "../../components/FlashcardModal";

export default function GameCenter() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  // Bookmarked game worlds are listed first.
  const [saved, toggleSaved] = useBookmarks(user.id);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const { data: student, isLoading } = useQuery({
    queryKey: ["student", user.id],
    queryFn: () => apiGetStudent(user.id),
  });
  const { data: board } = useQuery({
    queryKey: ["leaderboard", student?.grade],
    queryFn: () => apiGetLeaderboard(student.grade, student.id),
    enabled: !!student,
  });

  if (isLoading) return <Spinner />;
  const hasGames = gradeHasGames(student.grade);

  return (
    <div>
      <section className="mb-10">
        <h1 className="page-title mb-2">Choose a game world</h1>
        <p className="text-lg font-medium text-muted">
          A fresh perspective in maths, English, or science. Your grade (Grade {student.grade}) is
          set for you — just pick a topic.
        </p>
      </section>

      {!hasGames && (
        <div className="card mb-10 p-8">
          <h2 className="text-2xl text-ink">Games aren't available for Grade {student.grade}</h2>
          <p className="mt-2 text-sm font-medium text-muted">
            Game worlds run for Grades 1–10. For Grade {student.grade}, use Resources for study
            material and the Study Buddy for help.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => navigate("/app/resources")}>Go to Resources</Button>
            <Button variant="outline" onClick={() => navigate("/app/chat")}>Open Study Buddy</Button>
          </div>
        </div>
      )}

      <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8 xl:grid-cols-3">
        {savedFirst(GAMES, saved).map((g) => (
          <ModuleCard
            key={g.slug}
            game={g}
            student={student}
            classmates={board || []}
            hasGames={hasGames}
            saved={saved.includes(g.slug)}
            onToggleSave={toggleSaved}
          />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
        <button onClick={() => setShowQuiz(true)} className="card p-8 text-left transition-transform duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <Badge>Quiz</Badge>
            <span className="text-accent">→</span>
          </div>
          <h3 className="mt-4 text-xl text-ink">Quick quiz, all subjects</h3>
          <p className="mt-2 text-sm font-medium text-muted">
            Pick a subject and topic, then answer 10 questions — +10 for each correct answer, with fair
            guessing-corrected marking for wrong ones.
          </p>
        </button>
        <button onClick={() => setShowFlashcards(true)} className="card p-8 text-left transition-transform duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <Badge>Flashcards</Badge>
            <span className="text-accent">→</span>
          </div>
          <h3 className="mt-4 text-xl text-ink">Flashcards, all subjects</h3>
          <p className="mt-2 text-sm font-medium text-muted">
            Pick a subject and topic to flip through 3 quick-review cards.
          </p>
        </button>
      </section>

      {showQuiz && (
        <QuizModal student={student} grade={student.grade} studentId={student.id} plan={student.plan} demo={student.demo} onClose={() => setShowQuiz(false)} />
      )}
      {showFlashcards && (
        <FlashcardModal student={student} grade={student.grade} studentId={student.id} plan={student.plan} demo={student.demo} onClose={() => setShowFlashcards(false)} />
      )}
    </div>
  );
}
