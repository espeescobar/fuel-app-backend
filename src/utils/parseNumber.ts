/** Parse user-typed amounts. In Chile "." often means thousands and "," means decimals. */

function normalizeRaw(raw: unknown): string | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? String(raw) : null;
  }
  if (typeof raw !== "string") return null;
  const s = raw.trim().replace(/\s/g, "").replace(/\$/g, "").replace(/CLP/gi, "");
  return s || null;
}

function toNumber(normalized: string): number | null {
  const v = Number(normalized);
  return Number.isFinite(v) ? v : null;
}

export function parseLiters(raw: unknown): number | null {
  const s = normalizeRaw(raw);
  if (s === null) return null;

  if (typeof raw === "number") {
    return raw > 0 ? raw : null;
  }

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  let normalized: string;
  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    normalized =
      lastComma > lastDot
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
      } else if (hasComma) {
        const parts = s.split(",");
        if (parts.length > 2 || parts[1]?.length === 3) {
          // 42,000 / 1,234,567 → miles
          normalized = s.replace(/,/g, "");
        } else {
          normalized = s.replace(",", ".");
        } 
  } else {
    normalized = s;
  }

  const v = toNumber(normalized);
  return v !== null && v > 0 ? v : null;
}

export function parseMoney(raw: unknown): number | null {
  const s = normalizeRaw(raw);
  if (s === null) return null;

  if (typeof raw === "number") {
    return raw > 0 ? raw : null;
  }

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  let normalized: string;
  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    normalized =
      lastComma > lastDot
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts.length > 2) {
      normalized = s.replace(/,/g, "");
    } else {
      normalized = s.replace(",", ".");
    }
  } else if (hasDot) {
    const parts = s.split(".");
    if (parts.length > 2) {
      normalized = s.replace(/\./g, "");
    } else if (parts[1]?.length === 3) {
      normalized = s.replace(/\./g, "");
    } else {
      normalized = s;
    }
  } else {
    normalized = s;
  }

  const v = toNumber(normalized);
  return v !== null && v > 0 ? v : null;
}

export const PRICE_PER_LITER_MIN = 300;
export const PRICE_PER_LITER_MAX = 4000;
