import { type ReactNode } from "react";
import { overlayTheme } from "@/lib/overlayTheme";

export function FoldedBar({
  side,
  height,
  children,
  className = "",
}: {
  side: "red" | "blue";
  height: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative flex min-w-0 flex-1 items-center overflow-visible ${className}`}
      style={{
        height,
        background: side === "red" ? overlayTheme.colors.foldRed : overlayTheme.colors.foldBlue,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] h-px -translate-y-1/2"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.35), rgba(0,0,0,0.25), transparent)",
        }}
      />
      <div className="relative z-[2] flex h-full w-full min-w-0 items-center">{children}</div>
    </div>
  );
}
