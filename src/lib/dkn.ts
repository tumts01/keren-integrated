export interface DknMapelDef {
  key: string;
  name: string;
  short: string;
}

export const DKN_MAPELS: DknMapelDef[] = [
  { key: 'bin', name: 'Bahasa Indonesia', short: 'BIN' },
  { key: 'big', name: 'Bahasa Inggris', short: 'BIG' },
  { key: 'mat', name: 'Matematika', short: 'MAT' },
  { key: 'ipa', name: 'Ilmu Pengetahuan Alam', short: 'IPA' },
  { key: 'aa', name: 'Akidah Akhlak', short: 'AA' },
  { key: 'pp', name: 'Pendidikan Pancasila', short: 'PP' },
  { key: 'ips', name: 'Ilmu Pengetahuan Sosial', short: 'IPS' },
  { key: 'sb', name: 'Seni Budaya', short: 'SB' },
  { key: 'pjok', name: 'Pendidikan Jasmani, Olah Raga dan Kesehatan', short: 'PJOK' },
  { key: 'inf', name: 'Informatika', short: 'INF' },
  { key: 'qh', name: 'Alquran Hadis', short: 'QH' },
  { key: 'fik', name: 'Fikih', short: 'FIK' },
  { key: 'ski', name: 'Sejarah Kebudayaan Islam', short: 'SKI' },
  { key: 'bar', name: 'Bahasa Arab', short: 'BAR' },
  { key: 'bda', name: 'Bahasa Daerah', short: 'BDA' },
  { key: 'nu', name: 'KE-NU-AN', short: 'NU' }
];

const MONTH_MAP: Record<string, string> = {
  'JANUARI': '01', 'FEBRUARI': '02', 'MARET': '03', 'APRIL': '04',
  'MEI': '05', 'JUNI': '06', 'JULI': '07', 'AGUSTUS': '08',
  'SEPTEMBER': '09', 'OKTOBER': '10', 'NOVEMBER': '11', 'DESEMBER': '12'
};

export function parseTTL(ttl: string): { tempat: string; tanggal: string } {
  if (!ttl) return { tempat: '', tanggal: '' };
  const parts = ttl.split(/,\s*/);
  const tempat = (parts[0] || '').trim();
  const tglStr = parts.slice(1).join(', ').trim();

  // Pattern: "15 JULI 2010"
  const m1 = tglStr.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m1) {
    const day = m1[1].padStart(2, '0');
    const mon = MONTH_MAP[m1[2].toUpperCase()] || '01';
    const yr = m1[3];
    return { tempat, tanggal: `${day}-${mon}-${yr}` };
  }

  // Pattern: ISO "2010-07-15"
  const m2 = tglStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m2) {
    return { tempat, tanggal: `${m2[3].padStart(2, '0')}-${m2[2].padStart(2, '0')}-${m2[1]}` };
  }

  // Pattern: "15-07-2010"
  const m3 = tglStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m3) {
    return { tempat, tanggal: `${m3[1].padStart(2, '0')}-${m3[2].padStart(2, '0')}-${m3[3]}` };
  }

  return { tempat, tanggal: tglStr };
}

export function formatGender(jk: string): string {
  const norm = String(jk || '').trim().toUpperCase();
  if (norm.startsWith('L')) return 'L';
  if (norm.startsWith('P')) return 'P';
  return norm ? norm.substring(0, 1) : '';
}

export function formatNomorInduk(idSiswa: string, nism: string): string {
  const id = String(idSiswa || '').trim();
  const nisVal = String(nism || '').trim();
  if (id && nisVal) return `${id} / ${nisVal}`;
  return id || nisVal;
}

export function normalizeName(name: string): string {
  return String(name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getRombelVariations(rombel: string): string[] {
  const vars = new Set<string>();
  const clean = String(rombel || '').trim();
  if (!clean) return [];
  vars.add(clean);

  const numMap: Record<string, string> = { '7': 'VII', '8': 'VIII', '9': 'IX' };
  const romanMap: Record<string, string> = { 'VII': '7', 'VIII': '8', 'IX': '9' };

  const m1 = clean.match(/^(\d)(.*)$/);
  if (m1) {
    const num = m1[1];
    const rest = m1[2].replace(/^[\s\.]+/, '');
    if (numMap[num]) {
      const rom = numMap[num];
      vars.add(rom + rest);
      vars.add(rom + '.' + rest);
      vars.add(rom + ' ' + rest);
    }
  }

  const m2 = clean.match(/^(VII|VIII|IX)(.*)$/i);
  if (m2) {
    const rom = m2[1].toUpperCase();
    const rest = m2[2].replace(/^[\s\.]+/, '');
    if (romanMap[rom]) {
      const num = romanMap[rom];
      vars.add(num + rest);
      vars.add(num + '.' + rest);
      vars.add(num + ' ' + rest);
    }
  }
  return Array.from(vars);
}

export function calculateNR(r1: any, r2: any, r3: any, r4: any, r5: any): number {
  const grades = [r1, r2, r3, r4, r5]
    .map(v => (v !== null && v !== undefined && v !== '' ? Number(v) : null))
    .filter((v): v is number => v !== null && !isNaN(v));

  if (grades.length === 0) return 0;
  const sum = grades.reduce((acc, val) => acc + val, 0);
  return Number((sum / grades.length).toFixed(1));
}

export function calculateNM(nr: number, num: any): number {
  if (num === null || num === undefined || num === '' || isNaN(Number(num))) {
    return 0;
  }
  const roundNR = Math.round(nr);
  const roundNUM = Math.round(Number(num));
  const result = (roundNR * 0.6) + (roundNUM * 0.4);
  return Number(result.toFixed(2));
}

export interface DknMapelGrade {
  r1: number | null;
  r2: number | null;
  r3: number | null;
  r4: number | null;
  r5: number | null;
  nr: number;
  num: number | null;
  nm: number;
}

export interface DknStudentItem {
  id: string | number;
  id_siswa: string;
  nisn: string;
  nomor_induk: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  nama_ayah: string;
  nomor_peserta: string;
  rombel: string;
  tahun_ajaran: string;
  status: string;
  grades: Record<string, DknMapelGrade>;
  jumlah_nm: number;
  rata_rata_nm: number;
  status_lulus: string;
}
