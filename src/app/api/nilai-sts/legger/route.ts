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

// Helper: get mapel name from mata_pelajaran metadata
const getMapelName = (r: any) => {
  if (!r.metadata) return '';
  const keys = Object.keys(r.metadata);
  const key = keys.find(k => {
    const lower = k.toLowerCase().replace(/[\s_]/g, '');
    return lower === 'namamapel' || lower === 'mapel' || lower === 'matapelajaran' || lower === 'pelajaran' || lower === 'namapelajaran';
  }) || 'MataPelajaran';
  return (r.metadata[key] || '').toString().trim();
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunAjaran = searchParams.get('tahunAjaran');
    const semester = searchParams.get('semester');
    const kelas = searchParams.get('kelas');

    if (!tahunAjaran || !semester || !kelas) {
      return NextResponse.json({ success: false, error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    // 1. Fetch all students and parse them like API siswa
    const allStudents = await getAllCachedDataInduk();
    const parsedStudents = allStudents.flatMap((row: any) => {
      const metadata = row.metadata || {};
      const nama = metadata['NAMA'] || row.nama || '';
      const nisn = metadata['NISN'] || row.nisn || '';
      const jk = metadata['JENIS KELAMIN'] || metadata['L/P'] || '';
      const status = (metadata['STATUS SISWA'] || metadata['STATUS'] || 'Aktif').toLowerCase();

      const records = [];
      const ta7 = (metadata['TA KELAS 7'] || '').trim();
      const rombel7 = (metadata['ROMBEL KELAS 7'] || '').trim();
      if (ta7 && rombel7) records.push({ nisn, nama, jk, status, tahunAjaran: ta7, rombel: rombel7 });

      const ta8 = (metadata['TA KELAS 8'] || '').trim();
      const rombel8 = (metadata['ROMBEL KELAS 8'] || '').trim();
      if (ta8 && rombel8) records.push({ nisn, nama, jk, status, tahunAjaran: ta8, rombel: rombel8 });

      const ta9 = (metadata['TA KELAS 9'] || '').trim();
      const rombel9 = (metadata['ROMBEL KELAS 9'] || '').trim();
      if (ta9 && rombel9) records.push({ nisn, nama, jk, status, tahunAjaran: ta9, rombel: rombel9 });

      if (records.length === 0) {
        records.push({
          nisn, nama, jk, status,
          tahunAjaran: (metadata['TAHUN AJARAN'] || row.tahun_ajaran || '').trim(),
          rombel: (metadata['ROMBEL'] || metadata['rombel'] || row.rombel || '').trim()
        });
      }
      return records;
    });

    const siswaKelas = parsedStudents
      .filter((s: any) => s.rombel === kelas && s.tahunAjaran === tahunAjaran && s.status.includes('aktif'))
      .sort((a: any, b: any) => a.nama.localeCompare(b.nama));

    if (siswaKelas.length === 0) {
      // Jika data kosong
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([['Data siswa tidak ditemukan untuk kelas ' + kelas]]);
      XLSX.utils.book_append_sheet(wb, ws, 'Legger');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return new Response(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=Legger_STS_${kelas}_${semester}_${tahunAjaran.replace('/', '-')}.xlsx`,
        },
      });
    }

    // 2. Fetch all possible mapels
    const { data: dbMapels } = await supabase.from('mata_pelajaran').select('metadata');
    const baseMapels = (dbMapels || []).map(r => getMapelName(r)).filter(Boolean);

    // 3. Fetch all nilai for this kelas
    const { data: nilaiRows, error: nilaiError } = await supabase
      .from('nilai_sts')
      .select('mata_pelajaran, data_nilai')
      .eq('tahun_ajaran', tahunAjaran)
      .eq('semester', semester)
      .eq('kelas', kelas);

    if (nilaiError) throw nilaiError;

    // 4. Fetch prosus/PK nilai
    const { data: pkRows, error: pkError } = await supabase
      .from('nilai_pk')
      .select('mata_pelajaran, data_nilai')
      .eq('tahun_ajaran', tahunAjaran)
      .eq('kelas', kelas)
      .eq('tipe', 'sts');

    if (pkError) throw pkError;

    // Build unified mapels list
    const usedMapels = new Set<string>();
    baseMapels.forEach(m => usedMapels.add(m));
    (nilaiRows || []).forEach(r => { if (r.mata_pelajaran) usedMapels.add(r.mata_pelajaran) });
    (pkRows || []).forEach(r => { if (r.mata_pelajaran) usedMapels.add(r.mata_pelajaran) });

    const uniqueMapels = Array.from(usedMapels).sort();

    const allRows = [
      ...(nilaiRows || []),
      ...(pkRows || []).map(r => ({ mata_pelajaran: r.mata_pelajaran, data_nilai: r.data_nilai }))
    ];

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
      const rowData: (string | number)[] = [idx + 1, s.nisn || '', s.nama || '', s.jk || ''];
      
      for (const mapel of uniqueMapels) {
        const nilaiByMapel = mapelNilaiMap[mapel] || {};
        let nilai: string | number = '';
        
        if (s.nisn && nilaiByMapel[s.nisn] !== undefined) {
          nilai = nilaiByMapel[s.nisn];
        } else if (s.nama) {
          const namaUpper = s.nama.toUpperCase();
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

    const titleRows = [
      [`LEGGER NILAI STS - KELAS ${kelas}`],
      [`Tahun Ajaran: ${tahunAjaran} | Semester: ${semester}`],
      [],
      headers,
      ...rows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(titleRows);

    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 14 },  // NISN
      { wch: 30 },  // Nama
      { wch: 5 },   // L/P
      ...uniqueMapels.map(() => ({ wch: 18 }))
    ];

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
