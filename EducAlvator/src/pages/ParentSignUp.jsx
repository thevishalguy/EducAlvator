import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AuthLayout, { Field, inputClass } from "../components/AuthLayout";
import { Button } from "../components/ui";
import { useAuth, registerParent } from "../lib/store";
import { friendlyAuthError } from "../lib/auth";

const schema = z
  .object({
    name: z.string().min(2, "Please enter your full name"),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/\d/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Please type your password again"),
    confirm: z.literal(true, { error: "Please confirm you are the parent/guardian" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
    // Checked as soon as both passwords are filled in, even while other fields still have errors.
    when: ({ issues }) => !issues.some((i) => ["password", "confirmPassword"].includes(i.path?.[0])),
  });

export default function ParentSignUp() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  // Once the new parent is signed in and the profile resolves, go home.
  useEffect(() => {
    if (user) navigate(user.role === "parent" ? "/parent" : "/app", { replace: true });
  }, [user, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", confirm: false },
  });

  const pwd = watch("password") || "";
  const strength = Math.min(3, (pwd.length >= 8 ? 1 : 0) + (/\d/.test(pwd) ? 1 : 0) + (/[A-Z]/.test(pwd) ? 1 : 0));

  const onSubmit = async (data) => {
    setServerError("");
    setLoading(true);
    try {
      await registerParent(data);
      // registerParent sets the signed-in user → the effect above navigates.
    } catch (e) {
      setServerError(friendlyAuthError(e));
    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthLayout
      eyebrow="Parent / Guardian"
      title="Create your parent account"
      subtitle="A secure home base for your family's learning journey."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/sign-in" className="font-bold text-accent hover:underline">Sign in</Link>
        </>
      }
    >
      {serverError && (
        <div className="mb-4 rounded-2xl border border-accent/40 bg-accent-tint px-4 py-2.5 text-sm font-semibold text-accent-deep">
          {serverError}
        </div>
      )}


      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Parent's full name" error={errors.name?.message}>
          <input placeholder="Your full name" className={inputClass} {...register("name")} />
        </Field>
        <Field label="Parent's email address" error={errors.email?.message}>
          <input type="email" placeholder="you@example.com" className={inputClass} {...register("email")} />
        </Field>
        <Field label="Create secure password" error={errors.password?.message}>
          <input type="password" autoComplete="new-password" placeholder="Use at least 8 characters" className={inputClass} {...register("password")} />
          <div className="mt-2 flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1 flex-1 rounded-full" style={{ background: i < strength ? "var(--accent)" : "var(--line-strong)" }} />
            ))}
          </div>
          <p className="mt-1 text-right text-xs text-muted">Use 8+ characters and a number</p>
        </Field>
        <Field label="Confirm password" error={errors.confirmPassword?.message}>
          <input type="password" autoComplete="new-password" placeholder="Type your password again" className={inputClass} {...register("confirmPassword")} />
        </Field>

        <label className="flex items-start gap-2.5 text-sm font-medium text-muted">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" {...register("confirm")} />
          <span>
            I confirm I am the parent/guardian and agree to EducAlvator's{" "}
            <Link to="/privacy" className="font-bold text-accent hover:underline">COPPA-compliant privacy policy</Link>{" "}
            and terms.
          </span>
        </label>
        {errors.confirm && <p className="-mt-2 text-xs font-medium text-accent">{errors.confirm.message}</p>}

        <Button type="submit" disabled={loading} className="w-full py-2.5">
          {loading ? "Creating…" : "Create secure family account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
