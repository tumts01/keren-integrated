import { supabase } from '@/lib/supabase';

export const MAX_LOLOS_SELEKSI = 30;
export const CABANG_AKADEMIK_KEYS = ['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'] as const;

function stripInvisible(val: unknown): string {
  return (val ?? '')
    .toString()
    .replace(/[\u00A0\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\uFEFF]/g, '')
    .trim();
}

export function normalizeAcademicCabangKey(raw: string): string {
  const clean = stripInvisible(raw).replace(/_FINAL$/i, '');
  const l = clean.toLowerCase();
  if (l.includes('matematika') || l === 'mtk') return 'Matematika';
  if (l.includes('ipas') || l === 'ipa' || l.includes('ipa')) return 'IPAS';
  if (l.includes('pai') || l.includes('agama')) return 'PAI';
  if (l.includes('inggris') || l.includes('english')) return 'Inggris';
  if (l.includes('arab')) return 'Arab';
  return clean;
}

function getDurationMs(waktuMulai?: string | null, waktuSelesai?: string | null): number {
  if (!waktuMulai || !waktuSelesai) return Infinity;
  const diff = new Date(waktuSelesai).getTime() - new Date(waktuMulai).getTime();
  return Number.isFinite(diff) && diff >= 0 ? diff : Infinity;
}

function getFinishMs(waktuSelesai?: string | null): number {
  if (!waktuSelesai) return Infinity;
  const t = new Date(waktuSelesai).getTime();
  return Number.isFinite(t) ? t : Infinity;
}

/**
 * Menghitung daftar tepat Top 30 peserta yang lolos Babak Seleksi pada setiap cabang mapel Akademik.
 * Akun BYPASS dikecualikan agar tidak mengambil kuota peserta asli.
 * Tie-breaker: 1) Nilai tertinggi (>0), 2) Durasi pengerjaan tercepat, 3) Waktu selesai lebih awal, 4) Nomor peserta.
 */
export async function computeTop30LolosMap(): Promise<Record<string, number>> {
  const [{ data: pesertaData, error: errPeserta }, { data: cbtData, error: errCbt }] = await Promise.all([
    supabase
      .from('data_olimpiade_seni')
      .select('id, jenis_pendaftaran, metadata')
      .in('jenis_pendaftaran', ['individu', 'peserta_kolektif'])
      .range(0, 4999),
    supabase
      .from('cbt_sesi')
      .select('nomor_peserta, cabang_lomba, nilai_akhir, waktu_mulai, waktu_selesai')
      .range(0, 4999),
  ]);

  if (errPeserta) throw errPeserta;
  if (errCbt && errCbt.code !== '42P01') throw errCbt;

  const seleksiSesiMap: Record<string, any> = {};
  (cbtData || []).forEach((s: any) => {
    const no = stripInvisible(s.nomor_peserta);
    if (!no || no.endsWith('_FINAL') || no.startsWith('BYPASS-')) return;
    seleksiSesiMap[no] = s;
  });

  const candidatesByCabang: Record<string, Array<{
    nomor_peserta: string;
    nilai: number;
    durasiMs: number;
    finishMs: number;
  }>> = {};

  (pesertaData || []).forEach((row: any) => {
    const meta = row.metadata || {};
    const nomorPeserta = stripInvisible(meta.NOMOR_PESERTA);
    if (!nomorPeserta || meta.IS_BYPASS === true || nomorPeserta.startsWith('BYPASS-')) return;

    const rawCabang = stripInvisible(meta.LOMBA_DIPILIH || meta['LOMBA YANG DIPILIH'] || '');
    const cabangKey = normalizeAcademicCabangKey(rawCabang);
    if (!CABANG_AKADEMIK_KEYS.includes(cabangKey as any)) return;

    const sesi = seleksiSesiMap[nomorPeserta];
    const nilai = sesi && sesi.nilai_akhir !== null && sesi.nilai_akhir !== undefined
      ? Number(sesi.nilai_akhir)
      : 0;

    if (nilai > 0 || meta.LOLOS_FINAL === true) {
      if (!candidatesByCabang[cabangKey]) candidatesByCabang[cabangKey] = [];
      candidatesByCabang[cabangKey].push({
        nomor_peserta: nomorPeserta,
        nilai,
        durasiMs: getDurationMs(sesi?.waktu_mulai, sesi?.waktu_selesai),
        finishMs: getFinishMs(sesi?.waktu_selesai),
      });
    }
  });

  const top30RankByNomor: Record<string, number> = {};
  Object.values(candidatesByCabang).forEach((arr) => {
    arr.sort((a, b) => {
      if (b.nilai !== a.nilai) return b.nilai - a.nilai;
      if (a.durasiMs !== b.durasiMs) return a.durasiMs - b.durasiMs;
      if (a.finishMs !== b.finishMs) return a.finishMs - b.finishMs;
      return a.nomor_peserta.localeCompare(b.nomor_peserta);
    });
    arr.slice(0, MAX_LOLOS_SELEKSI).forEach((item, idx) => {
      top30RankByNomor[item.nomor_peserta] = idx + 1;
    });
  });

  return top30RankByNomor;
}

export async function isPesertaLolosTop30(nomorPeserta: string, pesertaMeta?: any): Promise<boolean> {
  const cleanNo = stripInvisible(nomorPeserta).replace(/_FINAL$/i, '');
  if (!cleanNo) return false;
  if (pesertaMeta?.IS_BYPASS === true || cleanNo.startsWith('BYPASS-')) return true;
  if (pesertaMeta?.LOLOS_FINAL === true) return true;

  const rankMap = await computeTop30LolosMap();
  return rankMap[cleanNo] !== undefined;
}
