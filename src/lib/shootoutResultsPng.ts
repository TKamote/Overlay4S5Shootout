/** Canvas PNG of shootout history for sharing. Controller-only download. */

import type { ShootHistoryRound, ShootoutPlayer } from "@/hooks/useShootoutMatch";

const W = 900;
const PAD = 40;
const LINE = 28;
const TITLE = 36;
const ROUND = 26;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= maxWidth) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export function downloadShootoutResultsPng(opts: {
  title: string;
  history: ShootHistoryRound[];
  players: ShootoutPlayer[];
}): void {
  const { title, history, players } = opts;
  const winner = players.find((p) => p.isWinner);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  // Estimate height then redraw — first pass count lines
  const measure = canvas.getContext("2d");
  if (!measure) return;
  measure.font = `bold ${TITLE}px system-ui, sans-serif`;
  let yEstimate = PAD + TITLE + 24 + 20;
  for (const round of history) {
    yEstimate += ROUND + 12 + round.entries.length * LINE + 24;
  }
  if (winner) yEstimate += 48;
  yEstimate += PAD + 40;
  canvas.height = Math.max(yEstimate, 480);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Accent bar
  ctx.fillStyle = "#b91c1c";
  ctx.fillRect(0, 0, 8, canvas.height);

  let y = PAD;
  ctx.fillStyle = "#f8fafc";
  ctx.font = `bold ${TITLE}px system-ui, sans-serif`;
  ctx.fillText("SHOOTOUT RESULTS", PAD, y + TITLE);
  y += TITLE + 16;

  ctx.fillStyle = "#94a3b8";
  ctx.font = `600 18px system-ui, sans-serif`;
  const titleLines = wrapText(ctx, title || "Shootout", W - PAD * 2);
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y + 18);
    y += 24;
  }
  y += 12;

  ctx.fillStyle = "#64748b";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(new Date().toLocaleString(), PAD, y);
  y += 32;

  if (history.length === 0) {
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText("No completed turns recorded yet.", PAD, y);
  }

  for (const round of history) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = `bold ${ROUND}px system-ui, sans-serif`;
    ctx.fillText(round.label, PAD, y + ROUND);
    y += ROUND + 12;

    ctx.font = "16px ui-monospace, monospace";
    if (round.entries.length === 0) {
      ctx.fillStyle = "#64748b";
      ctx.fillText("(no eliminations yet)", PAD + 8, y);
      y += LINE;
    } else {
      for (const e of round.entries) {
        ctx.fillStyle = "#e2e8f0";
        const row = `${String(e.seq).padStart(2, "0")}.  ${e.name.toUpperCase().padEnd(18, " ")}  ${e.score} pts`;
        ctx.fillText(row, PAD + 8, y);
        y += LINE;
      }
    }
    y += 20;
  }

  if (winner) {
    y += 8;
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.fillText(`WINNER: ${winner.name.toUpperCase()}`, PAD, y + 28);
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `shootout-results-${stamp}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
