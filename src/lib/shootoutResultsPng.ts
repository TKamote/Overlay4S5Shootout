/** Canvas PNG of shootout results for sharing. Controller-only. */

import type { ShootHistoryEntry, ShootHistoryRound, ShootoutPlayer } from "@/hooks/useShootoutMatch";

const W = 450;
const PAD = 24;
const LINE = 32;
const TITLE = 22;
const SECTION = 18;

type ShotRow = { order: number; name: string; score: number };
type LeaderRow = { place: number; name: string; score: number };

/** Latest finished score per player, in the order turns were ended. */
function latestShots(history: ShootHistoryRound[]): Map<string, ShootHistoryEntry> {
  const byId = new Map<string, ShootHistoryEntry>();
  for (const round of history) {
    for (const entry of round.entries) byId.set(entry.playerId, entry);
  }
  return byId;
}

/**
 * Top 10 by latest score. Players tied with 10th place are included,
 * so the list can be longer than 10. Tied scores share one place number.
 */
export function leadersWithTies(history: ShootHistoryRound[]): LeaderRow[] {
  const sorted = Array.from(latestShots(history).values()).sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name)
  );
  if (sorted.length === 0) return [];

  const cutoff = sorted[Math.min(9, sorted.length - 1)].score;
  const included = sorted.filter((row) => row.score >= cutoff);

  let place = 1;
  return included.map((row, index) => {
    if (index > 0 && row.score < included[index - 1].score) place = index + 1;
    return { place, name: row.name, score: row.score };
  });
}

function shootingOrder(history: ShootHistoryRound[]): ShotRow[] {
  const rows: ShotRow[] = [];
  for (const round of history) {
    for (const entry of round.entries) {
      rows.push({ order: rows.length + 1, name: entry.name, score: entry.score });
    }
  }
  return rows;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

/** Fit a name between the place label and the right-aligned score. */
function fitName(ctx: CanvasRenderingContext2D, name: string, maxWidth: number): string {
  const upper = name.toUpperCase();
  if (ctx.measureText(upper).width <= maxWidth) return upper;
  let shown = upper;
  while (shown.length > 1 && ctx.measureText(`${shown}…`).width > maxWidth) {
    shown = shown.slice(0, -1);
  }
  return `${shown}…`;
}

function drawResultRow(
  ctx: CanvasRenderingContext2D,
  y: number,
  label: string,
  name: string,
  score: number
) {
  const scoreText = `${score} pts`;
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.fillStyle = "#f8fafc";
  const scoreWidth = ctx.measureText(scoreText).width;
  const scoreX = W - PAD - scoreWidth;
  ctx.fillText(scoreText, scoreX, y);

  ctx.font = "600 18px system-ui, sans-serif";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(label, PAD, y);
  const nameX = PAD + ctx.measureText(label).width + 16;

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText(fitName(ctx, name, scoreX - nameX - 20), nameX, y);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function shareOrDownload(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "image/png" });
  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canShareFiles) {
    try {
      await navigator.share({ files: [file], title: "Shootout results" });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  downloadBlob(blob, filename);
}

export function downloadShootoutResultsPng(opts: {
  title: string;
  history: ShootHistoryRound[];
  players: ShootoutPlayer[];
}): void {
  const { title, history, players } = opts;
  const winner = players.find((p) => p.isWinner);
  const shots = shootingOrder(history);
  const leaders = leadersWithTies(history);
  const showRoundLabels = history.length > 1;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  const measure = canvas.getContext("2d");
  if (!measure) return;

  measure.font = "600 18px system-ui, sans-serif";
  const titleLines = wrapText(measure, title || "Shootout", W - PAD * 2);

  let height = PAD + TITLE + 16 + titleLines.length * 24 + 12 + 32;
  height += SECTION + 16;
  if (shots.length === 0) height += LINE;
  else {
    for (const round of history) {
      if (showRoundLabels) height += SECTION + 8;
      height += (round.entries.length || 1) * LINE;
    }
  }
  height += 28 + SECTION + 16 + Math.max(leaders.length, 1) * LINE + 24;
  if (winner) height += 48;
  height += PAD;

  canvas.height = Math.max(height, 480);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#b91c1c";
  ctx.fillRect(0, 0, 8, canvas.height);

  let y = PAD;
  ctx.fillStyle = "#f8fafc";
  ctx.font = `bold ${TITLE}px system-ui, sans-serif`;
  ctx.fillText("SHOOTOUT RESULTS", PAD, y + TITLE);
  y += TITLE + 16;

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 18px system-ui, sans-serif";
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y + 18);
    y += 24;
  }
  y += 12;

  ctx.fillStyle = "#64748b";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(new Date().toLocaleString(), PAD, y);
  y += 36;

  ctx.fillStyle = "#fbbf24";
  ctx.font = `bold ${SECTION}px system-ui, sans-serif`;
  ctx.fillText("SHOOTING ORDER", PAD, y + SECTION);
  y += SECTION + 16;

  if (shots.length === 0) {
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText("No completed turns recorded yet.", PAD, y);
    y += LINE;
  } else {
    let shotIndex = 0;
    for (const round of history) {
      if (showRoundLabels) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = `bold 16px system-ui, sans-serif`;
        ctx.fillText(round.label, PAD, y + 16);
        y += SECTION + 8;
      }
      if (round.entries.length === 0) {
        ctx.fillStyle = "#64748b";
        ctx.font = "18px system-ui, sans-serif";
        ctx.fillText("(no shots)", PAD, y);
        y += LINE;
        continue;
      }
      for (const entry of round.entries) {
        const shot = shots[shotIndex];
        shotIndex += 1;
        drawResultRow(ctx, y, String(shot?.order ?? entry.seq).padStart(2, "0"), entry.name, entry.score);
        y += LINE;
      }
    }
  }

  y += 28;
  ctx.fillStyle = "#fbbf24";
  ctx.font = `bold ${SECTION}px system-ui, sans-serif`;
  ctx.fillText(leaders.length > 10 ? "TOP 10 (INCLUDING TIES)" : "TOP 10", PAD, y + SECTION);
  y += SECTION + 16;

  if (leaders.length === 0) {
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText("No scores yet.", PAD, y);
    y += LINE;
  } else {
    for (const leader of leaders) {
      drawResultRow(ctx, y, String(leader.place).padStart(2, "0"), leader.name, leader.score);
      y += LINE;
    }
  }

  if (winner) {
    y += 16;
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 22px system-ui, sans-serif";
    const winnerLabel = "WINNER";
    ctx.fillText(winnerLabel, PAD, y + 22);
    const nameX = PAD + ctx.measureText(winnerLabel).width + 16;
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(fitName(ctx, winner.name, W - PAD - nameX), nameX, y + 22);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `shootout-results-${stamp}.png`;
  canvas.toBlob((blob) => {
    if (!blob) return;
    void shareOrDownload(blob, filename);
  }, "image/png");
}
