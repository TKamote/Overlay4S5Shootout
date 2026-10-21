"use client";

/** OBS standby panel — shown only while match.is_standby is true. */
export default function StandbyModal({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center bg-black/45">
      <div className="max-w-[90vw] rounded-2xl bg-neutral-950/95 text-center text-white shadow-2xl p-[100px]">
        <p className="text-3xl font-bold tracking-wide sm:text-4xl md:text-5xl">
          Please standby for the next match
        </p>
        <p className="mt-6 text-lg font-medium text-neutral-200 sm:text-xl md:text-2xl">
          Brought to you by FirstFive Pinoy Mini Mart | Singapore
        </p>
      </div>
    </div>
  );
}
