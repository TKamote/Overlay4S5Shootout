"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function isRecoveryRedirect(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get("type") === "recovery") return true;
  if (params.get("next") === "/auth/update-password") return true;
  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    if (hashParams.get("type") === "recovery") return true;
  }
  return false;
}

/** Completes OAuth / email recovery PKCE redirect. */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const run = async () => {
      if (!supabase) {
        setMessage("Supabase is not configured.");
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const next = safeNextPath(params.get("next"));

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(error.message);
          return;
        }
      }

      if (isRecoveryRedirect() || next === "/auth/update-password") {
        router.replace("/auth/update-password");
        return;
      }
      router.replace(next === "/" ? "/" : next);
    };
    void run();
  }, [router]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-8 text-neutral-600">
      {message}
    </main>
  );
}
