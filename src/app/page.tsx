"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { useAuth } from "@/hooks/useAuth";
import { isCurrentUserAdmin } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

/** Standalone shootout product (landscape, vertical, controller). */
const SHOOTOUT_OVERLAY_HREF = "/shootout";
const SHOOTOUT_VERTICAL_HREF = "/shootout-vertical";
const SHOOTOUT_CONTROLLER_HREF = "/shootout-remote";

export default function Home() {
  const router = useRouter();
  const { configured, isSignedIn, user, ready } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionReady, setSessionReady] = useState(!configured);

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  useEffect(() => {
    if (!configured) {
      setSessionReady(true);
      setIsAdmin(false);
      return;
    }
    if (!ready) return;
    if (!isSignedIn) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    setSessionReady(false);
    (async () => {
      try {
        const admin = await isCurrentUserAdmin();
        if (!cancelled) setIsAdmin(admin);
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setSessionReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, isSignedIn, ready, router]);

  if (configured && ready && !isSignedIn) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center p-8 text-neutral-600">
        Redirecting to sign in…
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <BrandHeader titleClassName="text-3xl font-bold" />
        {!configured && (
          <p className="mt-2 text-sm text-neutral-500">Local demo</p>
        )}
      </div>

      <nav className="flex w-full flex-col gap-8">
        {configured && isSignedIn && isAdmin && (
          <Link
            href="/admin"
            className="rounded-lg border border-amber-700 bg-amber-50 px-6 py-4 text-center font-semibold text-amber-950 hover:bg-amber-100"
          >
            Admin
          </Link>
        )}

        <section className="flex flex-col gap-3 rounded-xl border-4 border-red-800 bg-white p-4 shadow-sm">
          <h2 className="text-center text-xs font-semibold uppercase tracking-wide text-red-800/70">
            Shootout
          </h2>
          <Link
            href={SHOOTOUT_OVERLAY_HREF}
            className="rounded-lg border border-red-800 bg-red-50 px-6 py-4 text-center font-semibold text-red-950 hover:bg-red-100"
          >
            Shootout overlay
          </Link>
          <Link
            href={SHOOTOUT_VERTICAL_HREF}
            className="rounded-lg border border-red-300 bg-white px-6 py-4 text-center font-semibold text-red-950 hover:bg-red-50"
          >
            Shootout vertical
          </Link>
          <Link
            href={SHOOTOUT_CONTROLLER_HREF}
            className="rounded-lg bg-red-900 px-6 py-4 text-center font-semibold text-white hover:bg-red-800"
          >
            Shootout controller
          </Link>
          <Link
            href="/players"
            className="rounded-lg border border-red-300 bg-white px-6 py-4 text-center font-semibold text-red-950 hover:bg-red-50"
          >
            Manage players &amp; logos
          </Link>
        </section>
      </nav>

      {configured && isSignedIn && (
        <div className="w-full text-center text-sm text-neutral-600">
          {!ready || !sessionReady ? (
            <p>Checking session…</p>
          ) : (
            <p>
              Signed in as {user?.email || "buyer"}.{" "}
              <button type="button" onClick={signOut} className="underline">
                Sign out
              </button>
            </p>
          )}
        </div>
      )}

      {!configured && (
        <p className="text-center text-sm text-neutral-500">
          Add <code>.env.local</code> with your Supabase URL and anon key for live data.
        </p>
      )}
    </main>
  );
}
