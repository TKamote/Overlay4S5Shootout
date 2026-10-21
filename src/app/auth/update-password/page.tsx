"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/** Set a new password after recovery / magic-link session. */
export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setReady(true);
    });
  }, []);

  if (!isSupabaseConfigured || !supabase) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold">Set password</h1>
        <p className="text-neutral-600">Supabase is not configured.</p>
        <Link href="/login" className="text-sm underline">
          Back to sign in
        </Link>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center p-8 text-neutral-600">
        Checking session…
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold">Set password</h1>
        <p className="text-neutral-600">
          Open the recovery link from your email first, or use Forgot password on the sign-in
          page.
        </p>
        <Link href="/login" className="text-sm underline">
          Back to sign in
        </Link>
      </main>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Set new password</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Choose a password, then you can sign in with email on this site.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className="rounded-lg border border-neutral-300 px-3 py-2"
          autoComplete="new-password"
        />
        <input
          type="password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm password"
          className="rounded-lg border border-neutral-300 px-3 py-2"
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-neutral-900 px-4 py-3 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>

      <Link href="/login" className="text-sm underline">
        Back to sign in
      </Link>
    </main>
  );
}
