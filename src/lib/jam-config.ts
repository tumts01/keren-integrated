export const ALL_JAMS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export const GRADE_KEYS = ['7', '8', '9'] as const;
export type GradeKey = (typeof GRADE_KEYS)[number];
export type JamPerTingkat = Record<GradeKey, number[]>;

export function createDefaultJamPerTingkat(jams: number[] = ALL_JAMS): JamPerTingkat {
  const clean = parseJamList(jams);
  return {
    '7': [...clean],
    '8': [...clean],
    '9': [...clean]
  };
}

export function parseJamList(raw: unknown): number[] {
  let nums: number[] = [];
  if (Array.isArray(raw)) {
    nums = raw.map(v => Number(v));
  } else if (typeof raw === 'string' && raw.trim().length > 0) {
    nums = raw.split(',').map(s => parseInt(s.trim(), 10));
  }
  return Array.from(new Set(nums.filter(n => Number.isInteger(n) && n >= 1 && n <= 13))).sort(
    (a, b) => a - b
  );
}

export function extractGradeFromKelas(kelas?: string): GradeKey | null {
  const cleaned = String(kelas || '').trim();
  if (!cleaned) return null;
  const match = cleaned.match(/^(?:KELAS\s*)?([789])\b|^(?:KELAS\s*)?([789])/i);
  const digit = match?.[1] || match?.[2];
  if (digit === '7' || digit === '8' || digit === '9') return digit;
  return null;
}

export function normalizeJamPerTingkat(
  raw: unknown,
  fallbackGlobal: number[] = ALL_JAMS
): JamPerTingkat {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  const fallback = parseJamList(fallbackGlobal);
  return {
    '7': obj && obj['7'] !== undefined ? parseJamList(obj['7']) : [...fallback],
    '8': obj && obj['8'] !== undefined ? parseJamList(obj['8']) : [...fallback],
    '9': obj && obj['9'] !== undefined ? parseJamList(obj['9']) : [...fallback]
  };
}

export function computeUnionJams(perTingkat: JamPerTingkat): number[] {
  const union = new Set<number>();
  GRADE_KEYS.forEach(g => {
    (perTingkat[g] || []).forEach(j => union.add(j));
  });
  return Array.from(union).sort((a, b) => a - b);
}

export function getEffectiveJamsForKelas(
  kelas: string | undefined,
  globalJams: number[],
  perTingkat?: Partial<JamPerTingkat> | null
): number[] {
  if (!perTingkat) return parseJamList(globalJams);
  const grade = extractGradeFromKelas(kelas);
  if (grade && Array.isArray(perTingkat[grade])) {
    return parseJamList(perTingkat[grade]);
  }
  if (!kelas) {
    const normalized = normalizeJamPerTingkat(perTingkat, globalJams);
    return computeUnionJams(normalized);
  }
  return parseJamList(globalJams);
}

export function getClosedGrades(perTingkat: JamPerTingkat): GradeKey[] {
  return GRADE_KEYS.filter(g => (perTingkat[g] || []).length === 0);
}
