export const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'] as const;
export type DayName = (typeof DAYS)[number];

export interface JadwalKelasEntry {
  hari: DayName | string;
  kelas: string;
  jamKe: number;
  waktu?: string;
  kodeGuru: string;
  namaGuru: string;
  mataPelajaran: string;
  isPK?: boolean;
}

export interface JadwalMengajarMeta {
  kodeGuru?: string;
  namaGuru?: string;
  statusGuru?: string;
  mataPelajaran?: string;
  totalJam?: string | number;
  [key: string]: unknown;
}

export interface GeneratorOptions {
  includePK?: boolean;
}

export interface GeneratorStats {
  totalClasses: number;
  totalEntries: number;
  totalRegularJP: number;
  unplacedCount: number;
  clashCount: number;
  attemptsUsed: number;
}

export interface ClashItem {
  hari: string;
  jamKe: number;
  kodeGuru: string;
  namaGuru: string;
  classes: string[];
}

const DEFAULT_KBM_78: Record<DayName, number[]> = {
  SENIN: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  SELASA: [2, 3, 4, 5, 6, 7, 8, 9],
  RABU: [2, 3, 4, 5, 6, 7, 8, 9],
  KAMIS: [2, 3, 4, 5, 6, 7, 8, 9],
  JUMAT: [2, 3, 4, 5],
  SABTU: [2, 3, 4, 5, 6, 7],
};

const DEFAULT_KBM_9: Record<DayName, number[]> = {
  SENIN: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  SELASA: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  RABU: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  KAMIS: [1, 2, 3, 4, 5, 6, 7, 8],
  JUMAT: [1, 2, 3, 4, 5],
  SABTU: [1, 2, 3, 4, 5, 6, 7],
};

function buildRangesForClass(isIX: boolean, requiredJP: number, includePK: boolean): Record<DayName, number[]> {
  const base = isIX || !includePK ? DEFAULT_KBM_9 : DEFAULT_KBM_78;
  const ranges: Record<DayName, number[]> = {
    SENIN: [...base.SENIN],
    SELASA: [...base.SELASA],
    RABU: [...base.RABU],
    KAMIS: [...base.KAMIS],
    JUMAT: [...base.JUMAT],
    SABTU: [...base.SABTU],
  };

  if (!isIX && !includePK) {
    // Allow same capacity spread starting from Jam 1
    ranges.KAMIS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  }

  let cap = DAYS.reduce((acc, d) => acc + ranges[d].length, 0);
  const expandOrder: DayName[] = ['KAMIS', 'SELASA', 'RABU', 'SABTU', 'JUMAT', 'SENIN'];
  let idx = 0;
  while (cap < requiredJP && idx < 40) {
    const d = expandOrder[idx % expandOrder.length];
    const last = ranges[d][ranges[d].length - 1] || 0;
    if (last < 10) {
      ranges[d].push(last + 1);
      cap++;
    }
    idx++;
  }
  return ranges;
}

function splitHoursIntoBlocks(jp: number): number[] {
  const blocks: number[] = [];
  let rem = jp;
  while (rem >= 2) {
    blocks.push(2);
    rem -= 2;
  }
  if (rem === 1) {
    blocks.push(1);
  }
  return blocks;
}

export function findTeacherClashes(entries: JadwalKelasEntry[]): ClashItem[] {
  const slotMap = new Map<string, { namaGuru: string; classes: Set<string> }>();
  for (const e of entries) {
    const kode = String(e.kodeGuru || '').trim();
    if (!kode || kode === 'PK' || e.isPK) continue;
    const key = `${e.hari}|${e.jamKe}|${kode}`;
    const cur = slotMap.get(key);
    if (!cur) {
      slotMap.set(key, { namaGuru: e.namaGuru || kode, classes: new Set([e.kelas]) });
    } else {
      cur.classes.add(e.kelas);
    }
  }
  const clashes: ClashItem[] = [];
  for (const [key, val] of slotMap.entries()) {
    if (val.classes.size > 1) {
      const [hari, jamStr, kodeGuru] = key.split('|');
      clashes.push({
        hari,
        jamKe: Number(jamStr),
        kodeGuru,
        namaGuru: val.namaGuru,
        classes: Array.from(val.classes).sort(),
      });
    }
  }
  return clashes;
}

interface NeedBlock {
  id: string;
  kelas: string;
  kodeGuru: string;
  namaGuru: string;
  mataPelajaran: string;
  len: number;
  teacherTotal: number;
}

/**
 * Generate jadwal kelas bebas bentrok guru langsung dari data beban mengajar di Jadwal Guru.
 */
export function generateJadwalKelasFromGuru(
  jmRows: Array<{ metadata?: JadwalMengajarMeta } | JadwalMengajarMeta>,
  options: GeneratorOptions = {}
): { entries: JadwalKelasEntry[]; stats: GeneratorStats; unplaced: NeedBlock[] } {
  const includePK = options.includePK !== false;

  const classesSet = new Set<string>();
  const classNeeds: Record<string, Array<{ kodeGuru: string; namaGuru: string; mataPelajaran: string; jp: number }>> = {};
  const classTotalJP: Record<string, number> = {};
  const teacherTotals: Record<string, number> = {};

  for (const raw of jmRows) {
    const m: JadwalMengajarMeta = (raw as { metadata?: JadwalMengajarMeta }).metadata || (raw as JadwalMengajarMeta);
    const kodeGuru = String(m.kodeGuru || '').trim();
    const namaGuru = String(m.namaGuru || '').trim();
    const mataPelajaran = String(m.mataPelajaran || '').trim();
    if (!kodeGuru || !namaGuru || !mataPelajaran) continue;

    for (const key of Object.keys(m)) {
      if (!/^(VII|VIII|IX)_[A-Z]+$/.test(key)) continue;
      const jp = parseInt(String(m[key] || '0'), 10);
      if (jp > 0) {
        classesSet.add(key);
        if (!classNeeds[key]) classNeeds[key] = [];
        classNeeds[key].push({ kodeGuru, namaGuru, mataPelajaran, jp });
        classTotalJP[key] = (classTotalJP[key] || 0) + jp;
        teacherTotals[kodeGuru] = (teacherTotals[kodeGuru] || 0) + jp;
      }
    }
  }

  const classes = Array.from(classesSet).sort();
  const classRanges: Record<string, Record<DayName, number[]>> = {};
  const allBlocks: NeedBlock[] = [];

  for (const kelas of classes) {
    const isIX = kelas.startsWith('IX_');
    classRanges[kelas] = buildRangesForClass(isIX, classTotalJP[kelas] || 0, includePK);
    (classNeeds[kelas] || []).forEach((item, idx) => {
      const parts = splitHoursIntoBlocks(item.jp);
      parts.forEach((len, pIdx) => {
        allBlocks.push({
          id: `${kelas}-${idx}-${pIdx}`,
          kelas,
          kodeGuru: item.kodeGuru,
          namaGuru: item.namaGuru,
          mataPelajaran: item.mataPelajaran,
          len,
          teacherTotal: teacherTotals[item.kodeGuru] || 0,
        });
      });
    });
  }

  let bestResult: {
    grid: Record<string, Record<DayName, Record<number, NeedBlock | null>>>;
    unplaced: NeedBlock[];
    sameDayDuplicates: number;
    attempt: number;
  } | null = null;

  const MAX_ATTEMPTS = 35;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const grid: Record<string, Record<DayName, Record<number, NeedBlock | null>>> = {};
    const teacherBusy: Record<string, Record<DayName, Record<number, string>>> = {};
    const classDayMapels: Record<string, Record<DayName, Record<string, number>>> = {};

    for (const k of classes) {
      grid[k] = { SENIN: {}, SELASA: {}, RABU: {}, KAMIS: {}, JUMAT: {}, SABTU: {} };
      classDayMapels[k] = { SENIN: {}, SELASA: {}, RABU: {}, KAMIS: {}, JUMAT: {}, SABTU: {} };
      for (const d of DAYS) {
        for (const j of classRanges[k][d]) {
          grid[k][d][j] = null;
        }
      }
    }

    const canPlaceBlock = (b: NeedBlock, day: DayName, jamStart: number, maxSameMapelOnDay: number) => {
      const mapelCount = classDayMapels[b.kelas][day][b.mataPelajaran] || 0;
      if (mapelCount >= maxSameMapelOnDay) return false;
      const jams = classRanges[b.kelas][day];
      const idx = jams.indexOf(jamStart);
      if (idx === -1 || idx + b.len > jams.length) return false;
      for (let off = 0; off < b.len; off++) {
        const jam = jams[idx + off];
        if (jam !== jamStart + off) return false;
        if (grid[b.kelas][day][jam] !== null) return false;
        if (teacherBusy[b.kodeGuru]?.[day]?.[jam]) return false;
      }
      return true;
    };

    const placeBlock = (b: NeedBlock, day: DayName, jamStart: number) => {
      for (let off = 0; off < b.len; off++) {
        const jam = jamStart + off;
        grid[b.kelas][day][jam] = b;
        if (!teacherBusy[b.kodeGuru]) teacherBusy[b.kodeGuru] = { SENIN: {}, SELASA: {}, RABU: {}, KAMIS: {}, JUMAT: {}, SABTU: {} };
        teacherBusy[b.kodeGuru][day][jam] = b.kelas;
      }
      classDayMapels[b.kelas][day][b.mataPelajaran] = (classDayMapels[b.kelas][day][b.mataPelajaran] || 0) + 1;
    };

    const removeSingleCell = (kelas: string, day: DayName, jam: number) => {
      const b = grid[kelas][day][jam];
      if (!b) return null;
      grid[kelas][day][jam] = null;
      if (teacherBusy[b.kodeGuru]?.[day]) {
        delete teacherBusy[b.kodeGuru][day][jam];
      }
      const prev = classDayMapels[kelas][day][b.mataPelajaran] || 1;
      classDayMapels[kelas][day][b.mataPelajaran] = Math.max(0, prev - 1);
      return b;
    };

    const getCandidateSlots = (b: NeedBlock, maxSameMapelOnDay: number) => {
      const candidates: Array<{ day: DayName; jamStart: number; score: number }> = [];
      for (const d of DAYS) {
        const jams = classRanges[b.kelas][d];
        const tDayLoad = teacherBusy[b.kodeGuru]?.[d] ? Object.keys(teacherBusy[b.kodeGuru][d]).length : 0;
        const mapelReuse = classDayMapels[b.kelas][d][b.mataPelajaran] || 0;
        for (let i = 0; i <= jams.length - b.len; i++) {
          const jamStart = jams[i];
          if (canPlaceBlock(b, d, jamStart, maxSameMapelOnDay)) {
            const score = mapelReuse * 50 + tDayLoad * 2 + Math.random() * 1.2;
            candidates.push({ day: d, jamStart, score });
          }
        }
      }
      candidates.sort((a, c) => a.score - c.score);
      return candidates;
    };

    const ordered = [...allBlocks].sort((a, b) => {
      const jitterA = attempt === 0 ? 0 : (Math.random() - 0.5) * 6;
      const jitterB = attempt === 0 ? 0 : (Math.random() - 0.5) * 6;
      return b.len - a.len || b.teacherTotal + jitterB - (a.teacherTotal + jitterA);
    });

    const deferred: NeedBlock[] = [];
    for (const b of ordered) {
      const opts = getCandidateSlots(b, 1);
      if (opts.length > 0) {
        placeBlock(b, opts[0].day, opts[0].jamStart);
      } else {
        deferred.push(b);
      }
    }

    const trySwapSingle = (b: NeedBlock, maxSameMapelOnDay: number): boolean => {
      if (b.len !== 1) return false;
      const k = b.kelas;
      for (const d1 of DAYS) {
        if ((classDayMapels[k][d1][b.mataPelajaran] || 0) >= maxSameMapelOnDay) continue;
        for (const j1 of classRanges[k][d1]) {
          if (teacherBusy[b.kodeGuru]?.[d1]?.[j1]) continue;
          const existing = grid[k][d1][j1];
          if (!existing) {
            placeBlock(b, d1, j1);
            return true;
          }
          if (existing.len === 1) {
            for (const d2 of DAYS) {
              if ((classDayMapels[k][d2][existing.mataPelajaran] || 0) >= maxSameMapelOnDay && d2 !== d1) continue;
              for (const j2 of classRanges[k][d2]) {
                if (grid[k][d2][j2] === null && !teacherBusy[existing.kodeGuru]?.[d2]?.[j2]) {
                  const moved = removeSingleCell(k, d1, j1);
                  if (moved) {
                    placeBlock(moved, d2, j2);
                    placeBlock(b, d1, j1);
                    return true;
                  }
                }
              }
            }
          }
        }
      }
      return false;
    };

    const unplaced: NeedBlock[] = [];
    for (const b of deferred) {
      const fallbackOpts = getCandidateSlots(b, 2);
      if (fallbackOpts.length > 0) {
        placeBlock(b, fallbackOpts[0].day, fallbackOpts[0].jamStart);
        continue;
      }
      if (b.len === 2) {
        const halves: NeedBlock[] = [
          { ...b, id: `${b.id}-a`, len: 1 },
          { ...b, id: `${b.id}-b`, len: 1 },
        ];
        for (const half of halves) {
          const opts1 = getCandidateSlots(half, 1);
          if (opts1.length > 0) {
            placeBlock(half, opts1[0].day, opts1[0].jamStart);
          } else if (!trySwapSingle(half, 1)) {
            const opts2 = getCandidateSlots(half, 3);
            if (opts2.length > 0) {
              placeBlock(half, opts2[0].day, opts2[0].jamStart);
            } else if (!trySwapSingle(half, 3)) {
              unplaced.push(half);
            }
          }
        }
      } else {
        if (!trySwapSingle(b, 1) && !trySwapSingle(b, 3)) {
          unplaced.push(b);
        }
      }
    }

    let sameDayDuplicates = 0;
    for (const k of classes) {
      for (const d of DAYS) {
        for (const count of Object.values(classDayMapels[k][d])) {
          if (count > 1) sameDayDuplicates += count - 1;
        }
      }
    }

    if (
      !bestResult ||
      unplaced.length < bestResult.unplaced.length ||
      (unplaced.length === bestResult.unplaced.length && sameDayDuplicates < bestResult.sameDayDuplicates)
    ) {
      bestResult = { grid, unplaced, sameDayDuplicates, attempt: attempt + 1 };
      if (unplaced.length === 0 && sameDayDuplicates === 0) break;
    }
  }

  const entries: JadwalKelasEntry[] = [];
  let totalRegularJP = 0;

  if (bestResult) {
    for (const kelas of classes) {
      const isIX = kelas.startsWith('IX_');
      if (!isIX && includePK) {
        for (const hari of DAYS) {
          entries.push({
            hari,
            kelas,
            jamKe: 1,
            kodeGuru: 'PK',
            namaGuru: 'Pembina Program Khusus',
            mataPelajaran: 'Program Khusus (PK)',
            isPK: true,
          });
        }
      }
      for (const hari of DAYS) {
        for (const jamKe of classRanges[kelas][hari]) {
          const block = bestResult.grid[kelas][hari][jamKe];
          if (block) {
            totalRegularJP++;
            entries.push({
              hari,
              kelas,
              jamKe,
              kodeGuru: block.kodeGuru,
              namaGuru: block.namaGuru,
              mataPelajaran: block.mataPelajaran,
            });
          }
        }
      }
    }
  }

  const clashes = findTeacherClashes(entries);

  return {
    entries,
    unplaced: bestResult?.unplaced || [],
    stats: {
      totalClasses: classes.length,
      totalEntries: entries.length,
      totalRegularJP,
      unplacedCount: bestResult?.unplaced.length || 0,
      clashCount: clashes.length,
      attemptsUsed: bestResult?.attempt || 0,
    },
  };
}
