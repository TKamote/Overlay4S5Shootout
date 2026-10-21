"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  adminLinkBuyerEmail,
  adminListPairs,
  adminProvisionBuyer,
  isCurrentUserAdmin,
  type AdminPair,
} from "@/lib/admin";
import {
  PACK_IDS,
  PACK_META,
  shootoutControllerPath,
  shootoutOverlayPath,
  type PackId,
} from "@/lib/packs";

export default function AdminPage() {
  const router = useRouter();
  const { ready, isSignedIn, configured } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pairs, setPairs] = useState<AdminPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [familyName, setFamilyName] = useState("");
  const [packId, setPackId] = useState<PackId>("jhayr");
  const [provisionBusy, setProvisionBusy] = useState(false);

  const [linkEmail, setLinkEmail] = useState("");
  const [linkFamilyId, setLinkFamilyId] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const admin = await isCurrentUserAdmin();
      setIsAdmin(admin);
      if (!admin) {
        setPairs([]);
        return;
      }
      setPairs(await adminListPairs());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
      setPairs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!configured) {
      setLoading(false);
      return;
    }
    if (!isSignedIn) {
      router.replace("/login");
      return;
    }
    void refresh();
  }, [ready, configured, isSignedIn, router, refresh]);

  const onProvision = async (e: FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) {
      setError("Family name is required");
      return;
    }
    setProvisionBusy(true);
    setError(null);
    setMessage(null);
    try {
      const pair = await adminProvisionBuyer(familyName, packId);
      setMessage(
        `Created ${pair.packName} for “${pair.familyName}”. Family id: ${pair.familyId}`
      );
      setFamilyName("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provision failed");
    } finally {
      setProvisionBusy(false);
    }
  };

  const onLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!linkEmail.trim() || !linkFamilyId.trim()) {
      setError("Email and family id are required");
      return;
    }
    setLinkBusy(true);
    setError(null);
    setMessage(null);
    try {
      await adminLinkBuyerEmail(linkEmail, linkFamilyId);
      setMessage(`Linked ${linkEmail.trim()} to family ${linkFamilyId.trim()}`);
      setLinkEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link failed");
    } finally {
      setLinkBusy(false);
    }
  };

  if (!configured) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-4 text-neutral-600">Supabase is not configured.</p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          Home
        </Link>
      </main>
    );
  }

  if (!ready || loading) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-neutral-600">Loading admin…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-4 text-neutral-600">Forbidden — your account is not an admin.</p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          Home
        </Link>
      </main>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <main className="mx-auto min-h-[100dvh] max-w-3xl p-6 pb-16">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="mt-1 text-sm text-neutral-600">
            All JhayR / Anthony / Trapezium / Round Top pairs. Create Auth users in Supabase, then link email here.
          </p>
        </div>
        <Link href="/" className="shrink-0 text-sm underline">
          Home
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">{message}</p>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Shootout (use these)</h2>
        <div className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50/50 p-4 text-sm">
          <a
            className="text-blue-700 underline break-all"
            href="/shootout"
            target="_blank"
            rel="noreferrer"
          >
            Landscape: {origin}/shootout
          </a>
          <a
            className="text-blue-700 underline break-all"
            href="/shootout-vertical"
            target="_blank"
            rel="noreferrer"
          >
            Vertical: {origin}/shootout-vertical
          </a>
          <a
            className="text-blue-700 underline break-all"
            href="/shootout-remote"
            target="_blank"
            rel="noreferrer"
          >
            Controller: {origin}/shootout-remote
          </a>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Provisioned buyer pairs</h2>
        {pairs.length === 0 ? (
          <p className="text-sm text-neutral-500">No pairs yet. Provision one below.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {pairs.map((pair) => (
              <li
                key={`${pair.familyId}:${pair.packId}`}
                className="rounded-lg border border-neutral-200 p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">
                    {pair.familyName} · {pair.packName}
                  </h3>
                  <code className="text-xs text-neutral-500">{pair.familyId}</code>
                </div>
                <div className="mt-3 flex flex-col gap-1 text-sm">
                  {pair.landscapeMatchId && (
                    <a
                      className="text-blue-700 underline break-all"
                      href={shootoutOverlayPath(pair.packId, pair.landscapeMatchId)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Landscape: {origin}
                      {shootoutOverlayPath(pair.packId, pair.landscapeMatchId)}
                    </a>
                  )}
                  {pair.landscapeMatchId && pair.landscapeEditToken && (
                    <p className="break-all text-xs text-neutral-600">
                      Controller: {origin}
                      {shootoutControllerPath(
                        pair.packId,
                        pair.landscapeMatchId,
                        pair.landscapeEditToken
                      )}
                    </p>
                  )}
                  {pair.verticalMatchId && (
                    <a
                      className="text-blue-700 underline break-all"
                      href={`/shootout-vertical/${pair.packId}/${pair.verticalMatchId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Vertical: {origin}/shootout-vertical/{pair.packId}/{pair.verticalMatchId}
                    </a>
                  )}
                  {pair.verticalMatchId && pair.verticalEditToken && (
                    <p className="break-all text-xs text-neutral-600">
                      Controller: {origin}
                      {shootoutControllerPath(
                        pair.packId,
                        pair.verticalMatchId,
                        pair.verticalEditToken
                      )}
                    </p>
                  )}
                  <Link
                    className="font-medium underline"
                    href={`/players/${pair.packId}?family=${pair.familyId}`}
                  >
                    Manage players
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Provision buyer</h2>
        <form onSubmit={onProvision} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Family name
            <input
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="Anthony"
              className="rounded-lg border border-neutral-300 px-3 py-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Pack
            <select
              value={packId}
              onChange={(e) => setPackId(e.target.value as PackId)}
              className="rounded-lg border border-neutral-300 px-3 py-2"
            >
              {PACK_IDS.map((id) => (
                <option key={id} value={id}>
                  {PACK_META[id].name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={provisionBusy}
            className="rounded-lg bg-neutral-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {provisionBusy ? "Creating…" : "Create"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Link buyer email</h2>
        <p className="mb-3 text-sm text-neutral-600">
          Create the Auth user first (Supabase → Authentication → Users → Add user), then choose
          the matching pair below (do not reuse one family for two emails).
        </p>
        <form onSubmit={onLink} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              value={linkEmail}
              onChange={(e) => setLinkEmail(e.target.value)}
              placeholder="buyer@email.com"
              className="rounded-lg border border-neutral-300 px-3 py-2"
              required
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Overlay pair
            <select
              value={linkFamilyId}
              onChange={(e) => setLinkFamilyId(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2"
              required
            >
              <option value="">Select pair…</option>
              {pairs.map((pair) => (
                <option key={`${pair.familyId}:${pair.packId}`} value={pair.familyId}>
                  {pair.familyName} · {pair.packName}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={linkBusy || !linkFamilyId}
            className="rounded-lg border border-neutral-900 px-4 py-2 font-semibold disabled:opacity-50"
          >
            {linkBusy ? "Linking…" : "Link"}
          </button>
        </form>
      </section>
    </main>
  );
}
