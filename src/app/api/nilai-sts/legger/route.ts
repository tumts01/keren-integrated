import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

// Helper: get nilai akhir from a student record inside data_nilai
function getNilaiAkhir(record: Record<string, any>): string | number {
  const keys = ['NILAI AKHIR', 'Nilai Akhir', 'NA'];
  for (const k of keys) {
    if (record[k] !== undefined && record[k] !== '') return record[k];
  }
  // Fallback to STS score
  const stsKeys = ['STS', 'SUMATIF TENGAH SEMESTER', 'Nilai STS', 'NILAI STS'];
  for (const k of stsKeys) {
    if (record[k] !== undefined && record[k] !== '') return record[k];
  }
  return '';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunAjaran = searchParams.get('tahunAjaran');
    const semester = searchParams.get('semester');
    const kelas = searchParams.get('kelas');

    if (!tahunAjaran || !semester || !kelas) {
      return NextResponse.json({ success: false, error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    // 1. Fetch all nilai for this kelas (all mapels)
    const { data: nilaiRows, error: nilaiError } = await supabase
      .from('nilai_sts')
      .select('mata_pelajaran, data_nilai')
      .eq('tahun_ajaran', tahunAjaran)
      .eq('semester', semester)
      .eq('kelas', kelas)
      .order('mata_pelajaran', { ascending: true });

    if (nilaiError) throw nilaiError;

    // 2. Fetch prosus/PK nilai (tipe = sts)
    const { data: pkRows, error: pkError } = await supabase
      .from('nilai_pk')
      .select('mata_pelajaran, data_nilai')
      .eq('tahun_ajaran', tahunAjaran)
      .eq('kelas', kelas)
      .eq('tipe', 'sts');

    if (pkError) throw pkError;

    const allRows = [
      ...(nilaiRows || []),
      ...(pkRows || []).map(r => ({ mata_pelajaran: r.mata_pelajaran, data_nilai: r.data_nilai }))
    ];

    // 3. Fetch student list for this kelas
    const allStudents = await getAllCachedDataInduk();
    const siswaKelas = allStudents
      .filter((s: any) => {
        const rombelRaw = s.metadata?.['ROMBEL'] || s.metadata?.['rombel'] || s.rombel || '';
        const taRaw = s.metadata?.['TAHUN_AJARAN'] || s.tahun_ajaran || '';
        const statusRaw = (s.metadata?.['STATUS'] || s.status || '').toLowerCase();
        return rombelRaw === kelas && taRaw === tahunAjaran && statusRaw.includes('aktif');
      })
      .sort((a: any, b: any) => {
        const namaA = (a.metadata?.['NAMA'] || a.nama || '').toUpperCase();
        const namaB = (b.metadata?.['NAMA'] || b.nama || '').toUpperCase();
        return namaA.localeCompare(namaB);
      });

    // 4. Get sorted list of mapels
    const mapelList = allRows.map(r => r.mata_pelajaran).filter(Boolean);
    // Remove duplicate mapels (keep order)
    const uniqueMapels = Array.from(new Set(mapelList));

    // 5. Build a lookup: mapel -> { nisn -> nilaiAkhir }
    const mapelNilaiMap: Record<string, Record<string, string | number>> = {};
    for (const row of allRows) {
      const mapel = row.mata_pelajaran;
      if (!mapel) continue;
      const dataNilai: any[] = Array.isArray(row.data_nilai) ? row.data_nilai : [];
      mapelNilaiMap[mapel] = {};
      for (const rec of dataNilai) {
        const nisn = (rec['NISN'] || rec['nisn'] || '').toString().trim();
        const namaRec = (rec['NAMA SISWA'] || rec['NAMA'] || rec['nama'] || '').toString().trim().toUpperCase();
        const nilai = getNilaiAkhir(rec);
        if (nisn) mapelNilaiMap[mapel][nisn] = nilai;
        if (namaRec) mapelNilaiMap[mapel]['__nama__' + namaRec] = nilai;
      }
    }

    // 6. Build Excel rows
    const headers = ['No', 'NISN', 'Nama Siswa', 'L/P', ...uniqueMapels];
    const rows: (string | number)[][] = [];

    siswaKelas.forEach((s: any, idx: number) => {
      const nisn = (s.metadata?.['NISN'] || s.nisn || '').toString().trim();
      const nama = (s.metadata?.['NAMA'] || s.nama || '').toString().trim();
      const lp = (s.metadata?.['JENIS_KELAMIN'] || s.jenis_kelamin || s.metadata?.['L/P'] || '').toString().trim();

      const rowData: (string | number)[] = [idx + 1, nisn, nama, lp];
      for (const mapel of uniqueMapels) {
        const nilaiByMapel = mapelNilaiMap[mapel] || {};
        let nilai: string | number = '';
        // Try by NISN first
        if (nisn && nilaiByMapel[nisn] !== undefined) {
          nilai = nilaiByMapel[nisn];
        } else {
          // Fallback by name
          const namaUpper = nama.toUpperCase();
          if (nilaiByMapel['__nama__' + namaUpper] !== undefined) {
            nilai = nilaiByMapel['__nama__' + namaUpper];
          }
        }
        rowData.push(nilai);
      }
      rows.push(rowData);
    });

    // 7. Create Excel workbook
    const wb = XLSX.utils.book_new();

    // Title rows
    const titleRows = [
      [`LEGGER NILAI STS - KELAS ${kelas}`],
      [`Tahun Ajaran: ${tahunAjaran} | Semester: ${semester}`],
      [],
      headers,
      ...rows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(titleRows);

    // Column widths
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 14 },  // NISN
      { wch: 30 },  // Nama
      { wch: 5 },   // L/P
      ...uniqueMapels.map(() => ({ wch: 18 }))
    ];

    // Merge title cell
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Legger');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=Legger_STS_${kelas}_${semester}_${tahunAjaran.replace('/', '-')}.xlsx`,
      },
    });
  } catch (error: any) {
    console.error('Error GET legger:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
