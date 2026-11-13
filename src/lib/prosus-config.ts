export type PKSemester = 'Ganjil' | 'Genap';

export type PKCategoryKey =
  | 'SAINS RISET'
  | 'OLAHRAGA SENI'
  | 'MULTILINGUAL'
  | 'KETERAMPILAN KREATIF PRODUKTIF'
  | 'AGAMA TAHFIDZ';

export type PKScoreField = 'm1' | 'm2' | 'm3' | 'sts' | 'sas';

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

export function computeMapelAverage(scores: Pick<PKMapelScores, PKScoreField>): number | null {
  const vals = (['m1', 'm2', 'm3', 'sts', 'sas'] as PKScoreField[])
    .map((f) => {
      const raw = String(scores[f] ?? '').trim();
      if (!raw) return NaN;
      return Number(raw.replace(',', '.'));
    })
    .filter((n) => !Number.isNaN(n) && n >= 0);

  if (vals.length === 0) return null;
  const avg = vals.reduce((sum, n) => sum + n, 0) / vals.length;
  return Math.round(avg);
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
