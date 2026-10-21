"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { PasswordField } from "@/components/PasswordField";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (typeof err === "string" && err.trim()) return err;
  return "Something went wrong";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCheckEmailModal, setShowCheckEmailModal] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/auth/update-password");
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  if (!isSupabaseConfigured || !supabase) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-4 p-8">
        <BrandHeader />
        <p className="text-center text-neutral-600">
          Supabase is not configured. Copy <code>.env.example</code> to{" "}
          <code>.env.local</code> and add the project URL and anon key.
        </p>
      </main>
    );
  }

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (!supabase) return;
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email above, then tap Forgot password?");
      return;
    }
    setBusy(true);
    try {
      const origin = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
      });
      if (resetError) throw resetError;
      setShowCheckEmailModal(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-6 p-8">
      <BrandHeader />
      <form onSubmit={submitEmail} className="flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-lg border border-neutral-300 px-3 py-2"
          autoComplete="email"
        />
        <PasswordField
          value={password}
          onChange={setPassword}
          placeholder="Password"
          required
          minLength={6}
          show={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border border-neutral-900 px-4 py-3 font-semibold disabled:opacity-50"
        >
          Sign in
        </button>
      </form>

      <button
        type="button"
        disabled={busy}
        className="text-sm text-neutral-500 underline disabled:opacity-50"
        onClick={() => void forgotPassword()}
      >
        Forgot password?
      </button>

      {showCheckEmailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="check-email-title"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2 id="check-email-title" className="text-lg font-bold">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              We sent a reset link to <span className="font-medium">{email.trim()}</span>.
              Open that link to choose a new password (you will see a Set new password page).
            </p>
            <button
              type="button"
              className="mt-5 w-full rounded-lg bg-neutral-900 px-4 py-2.5 font-semibold text-white hover:bg-neutral-800"
              onClick={() => setShowCheckEmailModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
