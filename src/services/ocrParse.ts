export type OcrParseResult = {
  odometerKm: number | null;
  kmPerLiter: number | null;
  diagnostics?: string[];
};

function parseFlexibleNumber(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  // Caso 1: contiene ambos separadores -> asumimos "." miles y "," decimal.
  if (s.includes(",") && s.includes(".")) {
    const normalized = s.replace(/\./g, "").replace(",", ".");
    const v = Number(normalized);
    return Number.isFinite(v) ? v : null;
  }

  // Caso 2: solo coma -> asumimos decimal.
  const normalized = s.includes(",") ? s.replace(",", ".") : s;
  const v = Number(normalized);
  return Number.isFinite(v) ? v : null;
}

function extractAllNumbers(text: string): number[] {
  const matches = text.match(/[0-9]+(?:[.,][0-9]+)?/g) ?? [];
  const out: number[] = [];
  for (const m of matches) {
    const v = parseFlexibleNumber(m);
    if (v !== null) out.push(v);
  }
  return out;
}

export function parseDashboardText(text: string): OcrParseResult {
  const diagnostics: string[] = [];
  const t = text.replace(/\s+/g, " ");

  // Rinde: km/L (heurísticas diversas)
  const kmPerLiterPatterns: RegExp[] = [
    /km\s*\/\s*l[^0-9]*([0-9]+(?:[.,][0-9]+)?)/i,
    /km\s*\/\s*lt[^0-9]*([0-9]+(?:[.,][0-9]+)?)/i,
    /km\s*\/\s*lit(?:ro|ros)?[^0-9]*([0-9]+(?:[.,][0-9]+)?)/i,
    /([0-9]+(?:[.,][0-9]+)?)\s*km\s*\/\s*l/i,
    /([0-9]+(?:[.,][0-9]+)?)\s*km\s*\/\s*lt/i
  ];

  let kmPerLiter: number | null = null;
  for (const p of kmPerLiterPatterns) {
    const m = t.match(p);
    if (m?.[1]) {
      const v = parseFlexibleNumber(m[1]);
      if (v !== null) {
        // Rendimiento razonable: 0.1 a 80 km/L
        if (v > 0.1 && v < 80) {
          kmPerLiter = v;
          diagnostics.push(`kmPerLiter matched: ${m[1]}`);
          break;
        }
      }
    }
  }

  // Odómetro: buscar etiquetas tipo "ODO" / "ODOMETRO" / "KILOMETRAJE"
  const odometerPatterns: RegExp[] = [
    /odo(?:metro|\.|:)?[^0-9]*([0-9]+(?:[.,][0-9]+)?)/i,
    /odomet(?:ro|\.|:)?[^0-9]*([0-9]+(?:[.,][0-9]+)?)/i,
    /kilomet(?:ra|raje)[^0-9]*([0-9]+(?:[.,][0-9]+)?)/i,
    /km(?:\s*total)?[^0-9]*([0-9]{3,}(?:[.,][0-9]+)?)/i
  ];

  let odometerKm: number | null = null;
  for (const p of odometerPatterns) {
    const m = t.match(p);
    if (m?.[1]) {
      const v = parseFlexibleNumber(m[1]);
      if (v !== null) {
        if (v >= 1000) {
          odometerKm = v;
          diagnostics.push(`odometer matched: ${m[1]}`);
          break;
        }
      }
    }
  }

  // Fallback:
  // - Odómetro: el número más grande (entero o casi entero) >= 1000
  // - km/L: el número entre 0.1 y 80 que no sea muy grande
  if (odometerKm === null || kmPerLiter === null) {
    const nums = extractAllNumbers(t);
    if (odometerKm === null) {
      const candidates = nums.filter((n) => n >= 1000);
      if (candidates.length) {
        odometerKm = Math.max(...candidates);
        diagnostics.push("odometer fallback: max number >= 1000");
      }
    }

    if (kmPerLiter === null) {
      const candidates = nums.filter((n) => n > 0.1 && n < 80);
      if (candidates.length) {
        // Elegimos el más grande dentro del rango (heurística)
        kmPerLiter = Math.max(...candidates);
        diagnostics.push("kmPerLiter fallback: max number in range");
      }
    }
  }

  return { odometerKm, kmPerLiter, diagnostics: diagnostics.length ? diagnostics : undefined };
}

