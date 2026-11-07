import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field, inputClass } from "../../components/AuthLayout";
import { Button } from "../../components/ui";

const schema = z
  .object({
    name: z.string().min(2, "Enter the student's name"),
    grade: z.coerce.number().min(1, "Pick a grade").max(12),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(6, "Use at least 6 characters"),
    confirmPassword: z.string().min(1, "Type the password again"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
    // Checked as soon as both passwords are filled in, even while other fields still have errors.
    when: ({ issues }) => !issues.some((i) => ["password", "confirmPassword"].includes(i.path?.[0])),
  });

export default function AddStudentForm({ onSubmit, onCancel, submitting, error }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", grade: 5, email: "", password: "", confirmPassword: "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm font-medium text-muted">
        Each student gets their own login — a separate email and password they'll use to sign in.
      </p>
      {error && (
        <div className="rounded-2xl border border-accent/40 bg-accent-tint px-4 py-2.5 text-sm font-semibold text-accent-deep">{error}</div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Student's name" error={errors.name?.message}>
          <input placeholder="e.g. Aarav" className={inputClass} {...register("name")} />
        </Field>
        <Field label="Grade" error={errors.grade?.message}>
          <select className={inputClass} {...register("grade")}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>Grade {g}{g > 10 ? " (no games)" : ""}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Student's login email" error={errors.email?.message}>
        <input type="email" placeholder="student@example.com" className={inputClass} {...register("email")} />
      </Field>
      <Field label="Student's password" error={errors.password?.message}>
        <input type="password" autoComplete="new-password" placeholder="Create a password" className={inputClass} {...register("password")} />
      </Field>
      <Field label="Confirm student's password" error={errors.confirmPassword?.message}>
        <input type="password" autoComplete="new-password" placeholder="Type the password again" className={inputClass} {...register("confirmPassword")} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting} className="flex-1 py-3">
          {submitting ? "Creating…" : "Create student login"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="px-5">
          Cancel
        </Button>
      </div>
    </form>
  );
}
