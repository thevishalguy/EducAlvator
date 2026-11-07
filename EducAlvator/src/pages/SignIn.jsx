import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AuthLayout, { Field, inputClass } from "../components/AuthLayout";
import { Button } from "../components/ui";
import { useAuth, loginWithEmail } from "../lib/store";
import { friendlyAuthError } from "../lib/auth";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function SignIn() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  // Once signed in and the profile resolves, route to the role's home.
  useEffect(() => {
    if (user) navigate(user.role === "parent" ? "/parent" : "/app", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (data) => {
    setServerError("");
    setLoading(true);
    try {
      await loginWithEmail(data.email, data.password);
      // The profile is now in the auth store → the effect above navigates.
    } catch (e) {
      setServerError(friendlyAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email, password) => {
    setValue("email", email);
    setValue("password", password);
  };

  return (
    <AuthLayout
      eyebrow="Welcome to EducAlvator"
      title="Welcome back"
      subtitle="Sign in to your family's learning space."
      footer={
        <>
          New to EducAlvator?{" "}
          <Link to="/parent-sign-up" className="font-bold text-accent hover:underline">
            Create a parent account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="rounded-2xl border border-accent/40 bg-accent-tint px-4 py-2.5 text-sm font-semibold text-accent-deep">
            {serverError}
          </div>
        )}
        <Field label="Email address" error={errors.email?.message}>
          <input type="email" placeholder="you@example.com" className={inputClass} {...register("email")} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input type="password" placeholder="Your password" className={inputClass} {...register("password")} />
        </Field>
        <Button type="submit" disabled={loading} className="w-full py-3">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4 text-xs font-medium text-muted">
        <p className="mb-2 font-bold text-ink">Try a demo account</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fillDemo("vishal2@gmail.com", "vishal2010")}
            className="rounded-full bg-accent px-3 py-1 font-bold text-white shadow-sm hover:bg-accent-deep"
          >
            Student
          </button>
          <button
            onClick={() => fillDemo("sudhanv@gmail.com", "vishal2010")}
            className="rounded-full bg-accent px-3 py-1 font-bold text-white shadow-sm hover:bg-accent-deep"
          >
            Parent
          </button>
          <span className="self-center">tap to autofill, then Sign in</span>
        </div>
      </div>
    </AuthLayout>
  );
}
