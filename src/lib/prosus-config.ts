export type PKSemester = 'Ganjil' | 'Genap';

export type PKCategoryKey =
  | 'SAINS RISET'
  | 'OLAHRAGA SENI'
  | 'MULTILINGUAL'
  | 'KETERAMPILAN KREATIF PRODUKTIF'
  | 'AGAMA TAHFIDZ';

export type PKScoreField = 'm1' | 'm2' | 'm3' | 'sts' | 'sas';
export type PKMapelBaseField = 'm1' | 'm2' | 'm3';

export interface PKMapelDef {
  /** Canonical name saved to database for new writes */
  name: string;
  /** Short label for compact UI display */
  shortName: string;
  /** All accepted historical names in `nilai_pk.mata_pelajaran` (case-insensitive matching also applied) */
  aliases: string[];
}

export interface PKCategoryDef {
  key: PKCategoryKey;
  label: string;
  mapels: PKMapelDef[];
}

export const PK_CATEGORIES: PKCategoryDef[] = [
  {
    key: 'SAINS RISET',
    label: 'Sains & Riset',
    mapels: [
      {
        name: 'Ilmu Pengetahuan Alam',
        shortName: 'IPA',
        aliases: ['Ilmu Pengetahuan Alam', 'IPA'],
      },
      {
        name: 'Ilmu Pengetahuan Sosial',
        shortName: 'IPS',
        aliases: ['Ilmu Pengetahuan Sosial', 'IPS'],
      },
      {
        name: 'Matematika',
        shortName: 'Matematika',
        aliases: ['Matematika', 'MTK'],
      },
      {
        name: 'Riset',
        shortName: 'Riset',
        aliases: ['Riset', 'RISET', 'Sains dan Riset'],
      },
    ],
  },
  {
    key: 'OLAHRAGA SENI',
    label: 'Olahraga & Seni',
    mapels: [
      {
        name: 'Pendidikan Jasmani, Olah Raga dan Kesehatan',
        shortName: 'PJOK',
        aliases: ['Pendidikan Jasmani, Olah Raga dan Kesehatan', 'PJOK', 'Penjasorkes'],
      },
      {
        name: 'Seni Budaya',
        shortName: 'Seni Budaya',
        aliases: ['Seni Budaya'],
      },
    ],
  },
  {
    key: 'MULTILINGUAL',
    label: 'Multilingual',
    mapels: [
      {
        name: 'Bahasa Arab',
        shortName: 'Bahasa Arab',
        aliases: ['Bahasa Arab'],
      },
      {
        name: 'Bahasa Inggris',
        shortName: 'Bahasa Inggris',
        aliases: ['Bahasa Inggris'],
      },
    ],
  },
  {
    key: 'KETERAMPILAN KREATIF PRODUKTIF',
    label: 'Keterampilan Kreatif Produktif',
    mapels: [
      {
        name: 'Keterampilan Kreatif Produktif',
        shortName: 'KKP',
        aliases: ['Keterampilan Kreatif Produktif'],
      },
    ],
  },
  {
    key: 'AGAMA TAHFIDZ',
    label: 'Agama & Tahfidz',
    mapels: [
      {
        name: 'Pendidikan Agama Islam',
        shortName: 'PAI',
        aliases: ['Pendidikan Agama Islam', 'PAI'],
      },
      {
        name: 'Tahfidh',
        shortName: 'Tahfidh',
        aliases: ['Tahfidh', 'Tahfidz'],
      },
    ],
  },
];

export const PK_LAYANAN_UMUM_MAPELS: PKMapelDef[] = [
  {
    name: 'Bahasa Arab (Layanan Umum)',
    shortName: 'B. Arab (LU)',
    aliases: ['Bahasa Arab (Layanan Umum)', 'Bahasa Arab', 'B. Arab (LU)', 'PK Bahasa Arab'],
  },
  {
    name: 'Bahasa Inggris (Layanan Umum)',
    shortName: 'B. Inggris (LU)',
    aliases: ['Bahasa Inggris (Layanan Umum)', 'Bahasa Inggris', 'B. Inggris (LU)', 'PK Bahasa Inggris'],
  },
];

export const PK_CATEGORY_MAP: Record<PKCategoryKey, PKCategoryDef> = PK_CATEGORIES.reduce(
  (acc, item) => {
    acc[item.key] = item;
    return acc;
  },
  {} as Record<PKCategoryKey, PKCategoryDef>
);

export const MAP_MINAT_BAKAT: Record<string, PKCategoryKey> = {
  '7A': 'SAINS RISET',
  '7B': 'SAINS RISET',
  '7C': 'OLAHRAGA SENI',
  '7D': 'OLAHRAGA SENI',
  '7E': 'MULTILINGUAL',
  '7F': 'MULTILINGUAL',
  '7G': 'KETERAMPILAN KREATIF PRODUKTIF',
  '7H': 'AGAMA TAHFIDZ',
  '7I': 'AGAMA TAHFIDZ',
  '8A': 'OLAHRAGA SENI',
  '8B': 'MULTILINGUAL',
  '8C': 'OLAHRAGA SENI',
  '8D': 'MULTILINGUAL',
  '8E': 'SAINS RISET',
  '8F': 'KETERAMPILAN KREATIF PRODUKTIF',
  '8G': 'SAINS RISET',
  '8H': 'AGAMA TAHFIDZ',
  '8I': 'AGAMA TAHFIDZ',
};

export const PK_MAPEL_BASE_FIELDS: { key: PKMapelBaseField; label: string; shortLabel: string }[] = [
  { key: 'm1', label: 'Materi 1', shortLabel: 'M1' },
  { key: 'm2', label: 'Materi 2', shortLabel: 'M2' },
  { key: 'm3', label: 'Materi 3', shortLabel: 'M3' },
];

export const PK_SCORE_FIELDS: { key: PKScoreField; label: string; shortLabel: string }[] = [
  { key: 'm1', label: 'Materi 1', shortLabel: 'M1' },
  { key: 'm2', label: 'Materi 2', shortLabel: 'M2' },
  { key: 'm3', label: 'Materi 3', shortLabel: 'M3' },
  { key: 'sts', label: 'STS', shortLabel: 'STS' },
  { key: 'sas', label: 'SAS', shortLabel: 'SAS' },
];

export interface PKMapelScores {
  m1: string;
  m2: string;
  m3: string;
  sts: string;
  sas: string;
  rata: number | null;
}

export function createEmptyMapelScores(): PKMapelScores {
  return { m1: '', m2: '', m3: '', sts: '', sas: '', rata: null };
}

function parsePKNumericScore(raw: string | undefined): number | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const n = Number(s.replace(',', '.'));
  return !Number.isNaN(n) && n >= 0 ? n : null;
}

function combineMateriAndSas(avgMateri: number | null, sasVal: number | null): number | null {
  if (avgMateri !== null && sasVal !== null) {
    return Math.round(avgMateri * 0.4 + sasVal * 0.6);
  }
  if (avgMateri !== null) {
    return Math.round(avgMateri);
  }
  if (sasVal !== null) {
    return Math.round(sasVal);
  }
  return null;
}

export function getProgramStsStorageMapel(kategori: PKCategoryKey): string {
  return `STS_PK_${kategori}`;
}

export function getProgramSasStorageMapel(kategori: PKCategoryKey): string {
  return `SAS_PK_${kategori}`;
}

export const PK_LAYANAN_UMUM_STS_MAPEL = 'STS_PK_LAYANAN_UMUM';
export const PK_LAYANAN_UMUM_SAS_MAPEL = 'SAS_PK_LAYANAN_UMUM';

export function computeMapelAverage(scores: Pick<PKMapelScores, PKScoreField>): number | null {
  const materiVals = (['m1', 'm2', 'm3'] as PKScoreField[])
    .map((f) => parsePKNumericScore(scores[f]))
    .filter((n): n is number => n !== null);

  const sasVal = parsePKNumericScore(scores.sas);
  const avgMateri =
    materiVals.length > 0
      ? materiVals.reduce((sum, n) => sum + n, 0) / materiVals.length
      : null;

  return combineMateriAndSas(avgMateri, sasVal);
}

export function computeProgramFinalScore(
  mapelNames: string[],
  scoresByMapel: Record<string, PKMapelScores>,
  sasProgram: string | undefined
): number | null {
  const perMapelMateriAvgs: number[] = [];
  for (const mName of mapelNames) {
    const sc = scoresByMapel?.[mName];
    if (!sc) continue;
    const vals = (['m1', 'm2', 'm3'] as const)
      .map((f) => parsePKNumericScore(sc[f]))
      .filter((n): n is number => n !== null);
    if (vals.length > 0) {
      perMapelMateriAvgs.push(vals.reduce((sum, n) => sum + n, 0) / vals.length);
    }
  }

  const avgMateriProgram =
    perMapelMateriAvgs.length > 0
      ? perMapelMateriAvgs.reduce((sum, n) => sum + n, 0) / perMapelMateriAvgs.length
      : null;
  const sasVal = parsePKNumericScore(sasProgram);

  return combineMateriAndSas(avgMateriProgram, sasVal);
}

export type PKDeskripsiTierKey = 'A' | 'B' | 'C' | 'D';

export type PKDeskripsiProgramKey =
  | PKCategoryKey
  | 'LAYANAN UMUM'
  | 'Bahasa Arab (Layanan Umum)'
  | 'Bahasa Inggris (Layanan Umum)';

export type PKDeskripsiConfig = Record<PKDeskripsiProgramKey, Record<PKDeskripsiTierKey, string>>;

export const PK_DESKRIPSI_CONFIG_KEY = 'pk_deskripsi_capaian_config';

export const PK_DESKRIPSI_TIERS: { key: PKDeskripsiTierKey; label: string; rangeLabel: string }[] = [
  { key: 'A', label: 'Sangat Baik', rangeLabel: '90 – 100' },
  { key: 'B', label: 'Baik', rangeLabel: '80 – 89' },
  { key: 'C', label: 'Cukup', rangeLabel: '70 – 79' },
  { key: 'D', label: 'Perlu Bimbingan', rangeLabel: '< 70' },
];

export const PK_DESKRIPSI_PROGRAMS: { key: PKDeskripsiProgramKey; label: string; group: string }[] = [
  { key: 'SAINS RISET', label: 'Sains & Riset', group: 'Kelas Program Khusus' },
  { key: 'OLAHRAGA SENI', label: 'Olahraga & Seni', group: 'Kelas Program Khusus' },
  { key: 'MULTILINGUAL', label: 'Multilingual', group: 'Kelas Program Khusus' },
  { key: 'KETERAMPILAN KREATIF PRODUKTIF', label: 'Keterampilan Kreatif Produktif', group: 'Kelas Program Khusus' },
  { key: 'AGAMA TAHFIDZ', label: 'Agama & Tahfidz', group: 'Kelas Program Khusus' },
  { key: 'LAYANAN UMUM', label: 'Layanan Umum (B. Arab & B. Inggris)', group: 'Program Khusus Layanan Umum' },
];

export function createDefaultPKDeskripsiConfig(): PKDeskripsiConfig {
  return {
    'SAINS RISET': {
      A: 'Sangat baik dalam menguasai konsep sains, matematika, analisis ilmiah, serta terampil melaksanakan kegiatan riset dengan teliti.',
      B: 'Baik dalam memahami konsep sains, matematika, dan mampu mempraktikkan langkah dasar kegiatan riset secara terarah.',
      C: 'Cukup memahami konsep dasar sains, matematika, dan riset, namun perlu peningkatan ketelitian dan latihan analisis.',
      D: 'Memerlukan bimbingan lebih lanjut dalam memahami konsep dasar sains, perhitungan, serta langkah-langkah riset.',
    },
    'OLAHRAGA SENI': {
      A: 'Sangat baik dalam teknik gerak, kebugaran, sportivitas, serta menunjukkan kreativitas dan apresiasi seni yang unggul.',
      B: 'Baik dalam penguasaan teknik dasar olahraga, kedisiplinan berlatih, dan ekspresi karya seni sesuai target.',
      C: 'Cukup menguasai teknik dasar olahraga dan seni, namun perlu meningkatkan konsistensi latihan dan rasa percaya diri.',
      D: 'Memerlukan bimbingan lebih lanjut dalam melatih koordinasi teknik dasar olahraga maupun praktik seni.',
    },
    MULTILINGUAL: {
      A: 'Sangat baik dalam menguasai kosakata, struktur kalimat, serta terampil berkomunikasi aktif dalam Bahasa Arab dan Bahasa Inggris.',
      B: 'Baik dalam memahami materi kebahasaan serta mampu mempraktikkan percakapan Bahasa Arab dan Bahasa Inggris dengan lancar.',
      C: 'Cukup memahami kosakata dan ungkapan dasar Bahasa Arab serta Bahasa Inggris, perlu latihan praktik berbicara lebih rutin.',
      D: 'Memerlukan bimbingan lebih lanjut dalam penguasaan kosakata dasar dan keberanian praktik berbahasa Arab maupun Inggris.',
    },
    'KETERAMPILAN KREATIF PRODUKTIF': {
      A: 'Sangat baik dalam merancang ide kreatif, terampil menggunakan peralatan praktik, dan menghasilkan karya produktif bernilai guna.',
      B: 'Baik dalam memahami tahapan praktik keterampilan kreatif produktif serta mampu menyelesaikan proyek karya sesuai arahan.',
      C: 'Cukup terampil mengikuti praktik karya kreatif produktif, namun perlu meningkatkan kerapian dan kemandirian berkarya.',
      D: 'Memerlukan bimbingan lebih lanjut dalam memahami prosedur praktik dan penyelesaian produk keterampilan kreatif.',
    },
    'AGAMA TAHFIDZ': {
      A: 'Sangat baik dalam pemahaman materi keagamaan serta menunjukkan kelancaran, ketepatan tajwid, dan konsistensi hafalan Al-Qur\'an.',
      B: 'Baik dalam penguasaan materi keagamaan dan mampu menjaga kelancaran hafalan ayat sesuai target yang ditentukan.',
      C: 'Cukup baik dalam memahami materi agama dan hafalan Al-Qur\'an, perlu murajaah lebih rutin untuk menjaga kelancaran dan tajwid.',
      D: 'Memerlukan bimbingan intensif dan pendampingan rutin dalam pemahaman materi keagamaan serta murajaah hafalan.',
    },
    'LAYANAN UMUM': {
      A: 'Sangat baik dalam penguasaan kosakata, pemahaman teks sederhana, serta terampil mempraktikkan percakapan Bahasa Arab dan Bahasa Inggris layanan umum.',
      B: 'Baik dalam memahami kosakata dasar serta mampu menyusun dan mempraktikkan ungkapan sederhana Bahasa Arab dan Bahasa Inggris layanan umum.',
      C: 'Cukup memahami kosakata dasar Bahasa Arab dan Bahasa Inggris layanan umum, perlu penguatan pelafalan dan latihan percakapan lebih rutin.',
      D: 'Memerlukan bimbingan lebih lanjut dalam mengenal kosakata dasar serta melatih keberanian berbahasa Arab dan Bahasa Inggris layanan umum.',
    },
    'Bahasa Arab (Layanan Umum)': {
      A: 'Sangat baik dalam penguasaan mufrodat, pemahaman teks sederhana, serta terampil mempraktikkan percakapan Bahasa Arab.',
      B: 'Baik dalam memahami kosakata dasar dan mampu merangkai ungkapan sederhana Bahasa Arab sesuai materi layanan umum.',
      C: 'Cukup memahami kosakata dasar Bahasa Arab layanan umum, perlu penguatan pelafalan dan latihan percakapan.',
      D: 'Memerlukan bimbingan lebih lanjut dalam mengenal mufrodat dasar dan melatih keberanian berbahasa Arab.',
    },
    'Bahasa Inggris (Layanan Umum)': {
      A: 'Sangat baik dalam penguasaan vocabulary, pemahaman kalimat, dan percaya diri berkomunikasi dalam Bahasa Inggris layanan umum.',
      B: 'Baik dalam memahami kosakata serta mampu menyusun dan mempraktikkan ungkapan sederhana dalam Bahasa Inggris.',
      C: 'Cukup memahami kosakata dasar Bahasa Inggris layanan umum, perlu lebih aktif berlatih speaking dan pelafalan.',
      D: 'Memerlukan bimbingan lebih lanjut dalam memahami kosakata dasar dan mempraktikkan ungkapan Bahasa Inggris sehari-hari.',
    },
  };
}

export function getScoreBracketKey(score: number): PKDeskripsiTierKey {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  return 'D';
}

export function resolvePKDeskripsi(
  config: PKDeskripsiConfig,
  programKey: PKDeskripsiProgramKey,
  score: number | null | undefined
): string {
  if (score === null || score === undefined || Number.isNaN(score) || score <= 0) {
    return '-';
  }
  const tier = getScoreBracketKey(score);
  const customText = config?.[programKey]?.[tier];
  if (customText && customText.trim()) return customText.trim();
  const def = createDefaultPKDeskripsiConfig();
  return def[programKey]?.[tier] || '-';
}

/** Encode semester into tahun_ajaran column without altering DB schema. Legacy rows (without suffix) belong to Ganjil. */
export function toStorageTahunAjaran(tahunAjaran: string, semester: PKSemester): string {
  const baseTA = tahunAjaran.replace(/\s*\((Ganjil|Genap)\)\s*$/i, '').trim();
  return semester === 'Genap' ? `${baseTA} (Genap)` : baseTA;
}

export function getReadTahunAjaranCandidates(tahunAjaran: string, semester: PKSemester): string[] {
  const baseTA = tahunAjaran.replace(/\s*\((Ganjil|Genap)\)\s*$/i, '').trim();
  if (semester === 'Genap') {
    return [`${baseTA} (Genap)`];
  }
  return [baseTA, `${baseTA} (Ganjil)`];
}

export function getCanonicalFieldStorage(field: PKScoreField): {
  tipe: 'materi_harian' | 'sts' | 'sas';
  materi: string;
  sub_materi: string;
} {
  switch (field) {
    case 'm1':
      return { tipe: 'materi_harian', materi: 'Materi 1', sub_materi: 'S1' };
    case 'm2':
      return { tipe: 'materi_harian', materi: 'Materi 2', sub_materi: 'S1' };
    case 'm3':
      return { tipe: 'materi_harian', materi: 'Materi 3', sub_materi: 'S1' };
    case 'sts':
      return { tipe: 'sts', materi: '', sub_materi: '' };
    case 'sas':
      return { tipe: 'sas', materi: '', sub_materi: '' };
  }
}

export function findCategoryByKey(key: string): PKCategoryDef | undefined {
  return PK_CATEGORIES.find((c) => c.key === key);
}

export function resolveCanonicalMapel(kategori: PKCategoryKey, rawMapelName: string): PKMapelDef | undefined {
  const cat = PK_CATEGORY_MAP[kategori];
  if (!cat) return undefined;
  const normalized = rawMapelName.trim().toLowerCase();
  return cat.mapels.find(
    (m) =>
      m.name.toLowerCase() === normalized ||
      m.aliases.some((a) => a.toLowerCase() === normalized)
  );
}

export function getLayananUmumMapels(_kategori?: PKCategoryKey): PKMapelDef[] {
  return PK_LAYANAN_UMUM_MAPELS;
}

export function resolveLayananUmumMapel(rawMapelName: string, allowGenericAlias = true): PKMapelDef | undefined {
  const normalized = rawMapelName.trim().toLowerCase();
  return PK_LAYANAN_UMUM_MAPELS.find((m) => {
    if (m.name.toLowerCase() === normalized) return true;
    return m.aliases.some((a) => {
      const al = a.toLowerCase();
      if (!allowGenericAlias && (al === 'bahasa arab' || al === 'bahasa inggris')) {
        return false;
      }
      return al === normalized;
    });
  });
}

export function resolveMapelForKategori(kategori: PKCategoryKey, rawMapelName: string): PKMapelDef | undefined {
  return (
    resolveCanonicalMapel(kategori, rawMapelName) ||
    resolveLayananUmumMapel(rawMapelName, kategori !== 'MULTILINGUAL')
  );
}
