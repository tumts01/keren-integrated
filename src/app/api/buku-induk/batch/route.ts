import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

function getRombelVariations(rombel: string) {
  const vars = new Set<string>();
  vars.add(rombel);

  const numMap: Record<string, string> = { '7': 'VII', '8': 'VIII', '9': 'IX' };
  const romanMap: Record<string, string> = { 'VII': '7', 'VIII': '8', 'IX': '9' };

  const m1 = rombel.match(/^(\d)(.*)$/);
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

  const m2 = rombel.match(/^(VII|VIII|IX)(.*)$/i);
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ids: string[] = body.ids || [];
    return processBatchStudents(ids);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawIds = searchParams.get('ids') || '';
    const ids = rawIds.split(',').map(s => s.trim()).filter(Boolean);
    return processBatchStudents(ids);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function processBatchStudents(requestedIds: string[]) {
  if (!requestedIds || requestedIds.length === 0) {
    return NextResponse.json({ success: false, error: 'Tidak ada ID siswa yang dipilih' }, { status: 400 });
  }

  const cleanIds = new Set(requestedIds.map(id => String(id).trim().toLowerCase()));

  // 1. Get Data Induk from cache
  const allStudents = await getAllCachedDataInduk();
  const matchedStudents = allStudents.filter((s: any) => {
    const meta = s.metadata || {};
    const idSiswa = String(s.id_siswa || '').trim().toLowerCase();
    const metaId = String(meta['ID SISWA'] || '').trim().toLowerCase();
    const metaNism = String(meta['NISM'] || '').trim().toLowerCase();
    const metaNisn = String(meta['NISN'] || '').trim().toLowerCase();

    return cleanIds.has(idSiswa) || cleanIds.has(metaId) || cleanIds.has(metaNism) || cleanIds.has(metaNisn);
  });

  if (matchedStudents.length === 0) {
    return NextResponse.json({ success: false, error: 'Siswa tidak ditemukan' }, { status: 404 });
  }

  // Preserve the natural alphabetical order of matched students
  matchedStudents.sort((a, b) => {
    const nameA = a.metadata?.['NAMA'] || a.nama || '';
    const nameB = b.metadata?.['NAMA'] || b.nama || '';
    return nameA.localeCompare(nameB);
  });

  // Collect history
  const historySet = new Set<string>();

  const studentsData = matchedStudents.map((student: any) => {
    const metadata = student.metadata || {};
    const nis = metadata['NISM'] || metadata['ID SISWA'] || student.id_siswa;
    const nama = metadata['NAMA'] || student.nama || '';

    const history = [
      { kelas: '7', tahun_ajaran: metadata['TA KELAS 7'], rombel: metadata['ROMBEL KELAS 7'] },
      { kelas: '8', tahun_ajaran: metadata['TA KELAS 8'], rombel: metadata['ROMBEL KELAS 8'] },
      { kelas: '9', tahun_ajaran: metadata['TA KELAS 9'], rombel: metadata['ROMBEL KELAS 9'] }
    ].filter(h => h.rombel && h.tahun_ajaran);

    history.forEach(h => historySet.add(`${h.tahun_ajaran}::${h.rombel}`));

    return {
      induk: {
        id_siswa: student.id_siswa,
        ...metadata
      },
      nis,
      nama,
      history,
      nilai: [] as any[],
      ekstra: [] as any[],
      prestasi: [] as any[],
      presensi: {
        '7-Ganjil': { S: 0, I: 0, A: 0 },
        '7-Genap': { S: 0, I: 0, A: 0 },
        '8-Ganjil': { S: 0, I: 0, A: 0 },
        '8-Genap': { S: 0, I: 0, A: 0 },
        '9-Ganjil': { S: 0, I: 0, A: 0 },
        '9-Genap': { S: 0, I: 0, A: 0 }
      } as Record<string, { S: number; I: number; A: number }>
    };
  });

  const uniqueTas = Array.from(new Set(Array.from(historySet).map(s => s.split('::')[0]))).filter(Boolean);
  const uniqueRombels = Array.from(new Set(Array.from(historySet).map(s => s.split('::')[1]))).filter(Boolean);

  // 2. Fetch Nilai Buku Induk in bulk
  let stsData: any[] = [];
  if (uniqueTas.length > 0 && uniqueRombels.length > 0) {
    const { data: sts } = await supabase
      .from('nilai_buku_induk')
      .select('*')
      .in('kelas', uniqueRombels)
      .in('tahun_ajaran', uniqueTas);

    if (sts) stsData = sts;
  }

  // 3. Fetch Ekstra in bulk
  let exsData: any[] = [];
  if (uniqueTas.length > 0 && uniqueRombels.length > 0) {
    const { data: exs } = await supabase
      .from('ekstra_buku_induk')
      .select('*')
      .in('kelas', uniqueRombels)
      .in('tahun_ajaran', uniqueTas);

    if (exs) exsData = exs;
  }

  // 4. Fetch Prestasi in bulk
  const { data: prestasi } = await supabase
    .from('data_prestasi')
    .select('metadata');
  const prestasiList = (prestasi || []).map(p => p.metadata).filter(Boolean);

  // 5. Fetch Presensi in bulk
  const studentNisns = studentsData.map((s: any) => s.induk?.['NISN']).filter(Boolean);
  const studentNames = studentsData.map((s: any) => s.nama).filter(Boolean);

  let presensiRows: any[] = [];
  if (studentNisns.length > 0 || studentNames.length > 0) {
    const orClauses: string[] = [];
    studentNisns.forEach((n: string) => orClauses.push(`metadata->>NISN.eq.${n}`));
    studentNames.forEach((nm: string) => orClauses.push(`metadata->>NAMA SISWA.eq.${nm}`));

    const { data: pRows } = await supabase
      .from('data_presensi_siswa')
      .select('tanggal, metadata')
      .or(orClauses.slice(0, 60).join(','));

    if (pRows) presensiRows = pRows;
  }

  // 6. Map all student data
  studentsData.forEach(student => {
    // Map Nilai
    stsData.forEach(row => {
      const matchesHistory = student.history.some(h => h.tahun_ajaran === row.tahun_ajaran && h.rombel === row.kelas);
      if (matchesHistory) {
        const studentGrades = (row.data_nilai || []).find((d: any) => d.nis === student.nis || d.nama === student.nama);
        if (studentGrades) {
          student.nilai.push({
            tahun_ajaran: row.tahun_ajaran,
            semester: row.semester,
            kelas: row.kelas,
            mata_pelajaran: row.mata_pelajaran,
            nilai: studentGrades.nilai
          });
        }
      }
    });

    // Merge manual DKN R_GRADES
    const manualR = student.induk?.['R_GRADES'] || student.induk?.['DKN_R'] || {};
    const rKeyMap: Record<string, { k: string; s: string; ta?: string }> = {
      r1: { k: '7', s: 'Ganjil', ta: student.induk?.['TA KELAS 7'] },
      r2: { k: '7', s: 'Genap', ta: student.induk?.['TA KELAS 7'] },
      r3: { k: '8', s: 'Ganjil', ta: student.induk?.['TA KELAS 8'] },
      r4: { k: '8', s: 'Genap', ta: student.induk?.['TA KELAS 8'] },
      r5: { k: '9', s: 'Ganjil', ta: student.induk?.['TA KELAS 9'] || student.induk?.['TAHUN AJARAN'] },
    };

    Object.keys(manualR).forEach(mapelName => {
      const mapelObj = manualR[mapelName] || {};
      (['r1', 'r2', 'r3', 'r4', 'r5'] as const).forEach(rKey => {
        const val = mapelObj[rKey];
        if (val !== undefined && val !== null && val !== '') {
          const conf = rKeyMap[rKey];
          const existingIdx = student.nilai.findIndex((item: any) =>
            item.kelas?.includes(conf.k) &&
            item.semester?.toLowerCase() === conf.s.toLowerCase() &&
            item.mata_pelajaran?.toLowerCase() === mapelName.toLowerCase()
          );

          if (existingIdx !== -1) {
            student.nilai[existingIdx].nilai = val;
          } else {
            student.nilai.push({
              tahun_ajaran: conf.ta || '',
              semester: conf.s,
              kelas: conf.k,
              mata_pelajaran: mapelName,
              nilai: val
            });
          }
        }
      });
    });

    // Map Ekstra
    exsData.forEach(row => {
      const matchesHistory = student.history.some(h => h.tahun_ajaran === row.tahun_ajaran && h.rombel === row.kelas);
      if (matchesHistory) {
        const normName = (v: any) => String(v || '').toUpperCase().replace(/\s+/g, ' ').trim();
        const studentEkstra = (row.data_ekstra || []).filter((d: any) =>
          (student.induk?.['NISN'] && d.nisn && String(d.nisn).trim() === String(student.induk?.['NISN']).trim()) ||
          (student.nis && d.nis && String(d.nis).trim() === String(student.nis).trim()) ||
          (normName(d.nama) !== '' && normName(d.nama) === normName(student.nama))
        );
        if (studentEkstra && studentEkstra.length > 0) {
          const matchedHistory = student.history.find(h => h.rombel === row.kelas && h.tahun_ajaran === row.tahun_ajaran);
          for (const ek of studentEkstra) {
            student.ekstra.push({
              tahun_ajaran: row.tahun_ajaran,
              semester: row.semester,
              kelas: matchedHistory ? matchedHistory.kelas : row.kelas,
              jenis_ekstra: ek.jenis_ekstra,
              nilai: ek.nilai
            });
          }
        }
      }
    });

    // Map Presensi
    const studentSeenDates = new Set<string>();
    presensiRows.forEach(p => {
      if (!p.tanggal) return;
      const hadir = (p.metadata?.['KEHADIRAN'] || '').trim().toUpperCase();
      if (hadir !== 'S' && hadir !== 'I' && hadir !== 'A') return;

      const pNisn = (p.metadata?.['NISN'] || '').trim();
      const pNama = (p.metadata?.['NAMA SISWA'] || '').trim().toUpperCase();
      const sNisn = (student.induk?.['NISN'] || '').trim();
      const sNama = (student.nama || '').trim().toUpperCase();

      const isMatch = (pNisn && sNisn && pNisn === sNisn) || (pNama && sNama && pNama === sNama);
      if (!isMatch) return;

      const dateKey = `${p.tanggal}::${hadir}`;
      if (studentSeenDates.has(dateKey)) return;
      studentSeenDates.add(dateKey);

      const d = new Date(p.tanggal);
      const month = d.getMonth() + 1;
      const semester = (month >= 7 && month <= 12) ? 'Ganjil' : 'Genap';
      const kelas = (p.metadata?.['KELAS'] || '').trim().toUpperCase();

      let level = '';
      if (kelas.startsWith('7') || kelas.startsWith('VII')) level = '7';
      else if (kelas.startsWith('8') || kelas.startsWith('VIII')) level = '8';
      else if (kelas.startsWith('9') || kelas.startsWith('IX')) level = '9';
      else return;

      const key = `${level}-${semester}`;
      if (!student.presensi[key]) {
        student.presensi[key] = { S: 0, I: 0, A: 0 };
      }
      if (hadir === 'S') student.presensi[key].S += 1;
      if (hadir === 'I') student.presensi[key].I += 1;
      if (hadir === 'A') student.presensi[key].A += 1;
    });

    // Manual presensi override
    const manualPres = student.induk?.['MANUAL_PRESENSI'] || student.induk?.['PRESENSI'] || {};
    Object.keys(manualPres).forEach(k => {
      if (!student.presensi[k]) student.presensi[k] = { S: 0, I: 0, A: 0 };
      if (manualPres[k]?.S !== undefined) student.presensi[k].S = manualPres[k].S;
      if (manualPres[k]?.I !== undefined) student.presensi[k].I = manualPres[k].I;
      if (manualPres[k]?.A !== undefined) student.presensi[k].A = manualPres[k].A;
    });

    // Map Prestasi
    student.prestasi = prestasiList.filter((m: any) => m.nama === student.nama || m.induk === student.nis);
  });

  return NextResponse.json({
    success: true,
    data: studentsData
  });
}
