/** Ball rack style IDs for Overlay4S1 scoreboard. */

export type BallStyleId =
  | "classic"
  | "broadcast"
  | "pro_gloss"
  | "stream_edge"
  | "set_5";

export const DEFAULT_BALL_STYLE: BallStyleId = "classic";

export const BALL_STYLE_OPTIONS: {
  id: BallStyleId;
  label: string;
  description: string;
}[] = [
  {
    id: "classic",
    label: "Classic PNG",
    description: "Same PNG art as Facebook & YouTube ballicons.",
  },
  {
    id: "broadcast",
    label: "Broadcast Flat",
    description: "Flat pastel solids with white number disc.",
  },
  {
    id: "pro_gloss",
    label: "Pro Gloss",
    description: "Soft glossy sphere with clean broadcast highlight.",
  },
  {
    id: "stream_edge",
    label: "Stream Edge",
    description: "Bold colors with dark ring — sharp on small OBS sizes.",
  },
  {
    id: "set_5",
    label: "Set 5",
    description: "Stream Edge look with Classic PNG number orientation on balls 1–10.",
  },
];

export const BROADCAST_SOLID: Record<number, string> = {
  1: "#F1C40F",
  2: "#5DADE2",
  3: "#C0392B",
  4: "#E056A0",
  5: "#5D6D7E",
  6: "#58D68D",
  7: "#A0522D",
  8: "#1C1C1C",
  9: "#F4D03F",
  10: "#1E4B9C",
  11: "#C62828",
  12: "#6A1B9A",
  13: "#EF6C00",
  14: "#2E7D32",
  15: "#4E1C16",
};

export const BROADCAST_FLAT_SOLID: Record<number, string> = {
  1: "#C9A00C",
  2: "#2E86C1",
  3: "#922B21",
  4: "#AD3872",
  5: "#34495E",
  6: "#229954",
  7: "#6E3B1F",
  8: "#141414",
  9: "#C9A00C",
  10: "#123A52",
  11: "#B71C1C",
  12: "#4A148C",
  13: "#CA4E00",
  14: "#196F3D",
  15: "#331410",
};

export const PRO_GLOSS_SOLID: Record<number, string> = {
  1: "#FFD700",
  2: "#1565C0",
  3: "#C62828",
  4: "#7B1FA2",
  5: "#E65100",
  6: "#2E7D32",
  7: "#5D4037",
  8: "#212121",
  9: "#F9A825",
  10: "#0D47A1",
  11: "#B71C1C",
  12: "#4A148C",
  13: "#EF6C00",
  14: "#1B5E20",
  15: "#3E2723",
};

export const STREAM_EDGE_SOLID: Record<number, string> = {
  1: "#E6C200",
  2: "#1565C0",
  3: "#C62828",
  4: "#AD1457",
  5: "#512DA8",
  6: "#2E7D32",
  7: "#5D4037",
  8: "#000000",
  9: "#E6A800",
  10: "#0D47A1",
  11: "#B71C1C",
  12: "#6A1B9A",
  13: "#EF6C00",
  14: "#1B5E20",
  15: "#3E2723",
};

export function isStripeBall(n: number): boolean {
  return n >= 9 && n <= 15;
}

export function solidColorFor(n: number, palette: Record<number, string>): string {
  const key = Math.min(15, Math.max(1, Math.round(n)));
  return palette[key] ?? "#888888";
}

export function parseBallStyle(value: unknown): BallStyleId {
  if (
    value === "classic" ||
    value === "broadcast" ||
    value === "pro_gloss" ||
    value === "stream_edge" ||
    value === "set_5"
  ) {
    return value;
  }
  return DEFAULT_BALL_STYLE;
}

export const PREVIEW_BALLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
