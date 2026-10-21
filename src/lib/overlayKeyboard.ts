/** Numpad `+` → Player A +1 (not laptop `=` / Shift+`=`). */
export function isNumpadPlayer1Inc(e: KeyboardEvent): boolean {
  return e.code === "NumpadAdd" || e.key === "Add";
}

/** Numpad `-` → Player A −1 (not laptop `-`). */
export function isNumpadPlayer1Dec(e: KeyboardEvent): boolean {
  return e.code === "NumpadSubtract" || e.key === "Subtract";
}

/** Laptop `+` / `=` → Race +1; excludes numpad. */
export function isLaptopRaceInc(e: KeyboardEvent): boolean {
  return (
    e.code !== "NumpadAdd" &&
    e.key !== "Add" &&
    (e.key === "+" || e.key === "=")
  );
}

/** Laptop `-` / `_` → Race −1; excludes numpad. */
export function isLaptopRaceDec(e: KeyboardEvent): boolean {
  return (
    e.code !== "NumpadSubtract" &&
    e.key !== "Subtract" &&
    (e.key === "-" || e.key === "_")
  );
}
