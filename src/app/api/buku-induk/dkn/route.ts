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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const ta = url.searchParams.get('ta');
    const semester = url.searchParams.get('semester');
    const kelas = url.searchParams.get('kelas');

    // 1. If action is options, return all available filter options
    if (action === 'options' || (!ta && !kelas)) {
      const [biRes, stsRes] = await Promise.all([
        supabase.from('nilai_buku_induk').select('tahun_ajaran, semester, kelas'),
        supabase.from('nilai_sts').select('tahun_ajaran, semester, kelas')
      ]);

      const availableMap: Record<string, Record<string, Set<string>>> = {};

      const addOption = (t: string, s: string, k: string) => {
        t = (t || '').trim();
        s = (s || '').trim();
        k = (k || '').trim();
        if (!t || !s || !k) return;
        if (!availableMap[t]) availableMap[t] = {};
        if (!availableMap[t][s]) availableMap[t][s] = new Set();
        availableMap[t][s].add(k);
      };

      (biRes.data || []).forEach(r => addOption(r.tahun_ajaran, r.semester, r.kelas));
      (stsRes.data || []).forEach(r => addOption(r.tahun_ajaran, r.semester, r.kelas));

      // Build structured response
      const options = Object.entries(availableMap).map(([tahun, sems]) => ({
        tahun_ajaran: tahun,
        semesters: Object.entries(sems).map(([sem, classes]) => ({
          semester: sem,
          kelas: Array.from(classes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        }))
      })).sort((a, b) => b.tahun_ajaran.localeCompare(a.tahun_ajaran));

      return NextResponse.json({ success: true, options });
    }

    if (!ta || !semester || !kelas) {
      return NextResponse.json({ success: false, error: 'Parameter ta, semester, dan kelas diperlukan' }, { status: 400 });
    }

    const rombelVariations = getRombelVariations(kelas);

    // 2. Fetch grades from nilai_buku_induk first
    const { data: rowsBukuInduk } = await supabase
      .from('nilai_buku_induk')
      .select('mata_pelajaran, data_nilai, kelas')
      .eq('tahun_ajaran', ta)
      .ilike('semester', semester)
      .in('kelas', rombelVariations);

    let isFromSts = false;
    let rawGrades: any[] = rowsBukuInduk || [];

    // Fallback to nilai_sts if not found in nilai_buku_induk
    if (!rawGrades || rawGrades.length === 0) {
      const { data: rowsSts } = await supabase
        .from('nilai_sts')
        .select('mata_pelajaran, data_nilai, kelas')
        .eq('tahun_ajaran', ta)
        .ilike('semester', semester)
        .in('kelas', rombelVariations);

      if (rowsSts && rowsSts.length > 0) {
        isFromSts = true;
        // Transform STS data_nilai to match standard [{ nis, nama, nilai }]
        rawGrades = rowsSts.map(r => ({
          mata_pelajaran: r.mata_pelajaran,
          kelas: r.kelas,
          data_nilai: (r.data_nilai || []).map((d: any) => ({
            nis: d.NISN || d.nis || d.NO?.toString() || '',
            nama: d['NAMA SISWA'] || d.nama || '',
            nilai: d['NILAI AKHIR'] || d.STS || d.nilai || ''
          }))
        }));
      }
    }

    if (!rawGrades || rawGrades.length === 0) {
      return NextResponse.json({
        success: true,
        ta,
        semester,
        kelas,
        mapels: [],
        students: [],
        statistics: {},
        isFromSts: false,
        message: 'Belum ada data nilai untuk kelas dan semester ini'
      });
    }

    // 3. Fetch profil lembaga and wali kelas
    const [profilRes, kelasRes, allInduk] = await Promise.all([
      supabase.from('profil_lembaga').select('*'),
      supabase.from('data_kelas').select('*'),
      getAllCachedDataInduk()
    ]);

    const profilMap: Record<string, string> = {};
    (profilRes.data || []).forEach((p: any) => {
      profilMap[p.jenis] = p.isi || '';
    });

    const normalize = (s: any) => String(s || '').trim().replace(/\s+/g, ' ').toUpperCase();

    // Find wali kelas
    let namaWaliKelas = '';
    const foundKelas = (kelasRes.data || []).find((k: any) => {
      const r = (k.rombel || '').trim();
      return rombelVariations.some(v => normalize(v) === normalize(r));
    });
    if (foundKelas) {
      namaWaliKelas = foundKelas.wali_kelas || foundKelas.metadata?.['WALI KELAS'] || '';
    }

    // Create lookup for student info (gender, nisn)
    const studentInfoMap = new Map<string, { nisn: string; gender: string; fullNama: string }>();
    (allInduk || []).forEach((s: any) => {
      const nis = String(s.id_siswa || s.metadata?.['ID SISWA'] || '').trim();
      const nism = String(s.metadata?.['NISM'] || '').trim();
      const nisn = String(s.metadata?.['NISN'] || '').trim();
      const nama = normalize(s.nama || s.metadata?.['NAMA']);
      const jk = (s.metadata?.['JENIS KELAMIN'] || '').toUpperCase().includes('PEREMPUAN') ? 'P' : 'L';

      const info = { nisn, gender: jk, fullNama: s.nama || s.metadata?.['NAMA'] || '' };
      if (nis) studentInfoMap.set(nis, info);
      if (nism) studentInfoMap.set(nism, info);
      if (nama) studentInfoMap.set(nama, info);
    });

    // 4. Map subjects and student scores
    const mapels = Array.from(new Set(rawGrades.map(r => r.mata_pelajaran))).filter(Boolean);
    const studentScoresMap: Record<string, { nis: string; nisn: string; nama: string; gender: string; scores: Record<string, number | null> }> = {};

    rawGrades.forEach(r => {
      const mapelName = r.mata_pelajaran;
      (r.data_nilai || []).forEach((d: any) => {
        const nis = String(d.nis || '').trim();
        const nama = String(d.nama || '').trim();
        const key = nis || nama;
        if (!key) return;

        if (!studentScoresMap[key]) {
          const matchedInfo = studentInfoMap.get(nis) || studentInfoMap.get(normalize(nama));
          studentScoresMap[key] = {
            nis,
            nisn: matchedInfo?.nisn || '',
            nama: matchedInfo?.fullNama || nama,
            gender: matchedInfo?.gender || (d['L/P'] || '-'),
            scores: {}
          };
        }

        const rawVal = d.nilai;
        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
          const num = parseFloat(String(rawVal).replace(',', '.'));
          studentScoresMap[key].scores[mapelName] = isNaN(num) ? null : num;
        } else {
          studentScoresMap[key].scores[mapelName] = null;
        }
      });
    });

    // 5. Compute totals, averages, rankings
    const studentsList = Object.values(studentScoresMap).map(s => {
      let total = 0;
      let count = 0;
      mapels.forEach(m => {
        const val = s.scores[m];
        if (val !== null && val !== undefined) {
          total += val;
          count++;
        }
      });
      const avg = count > 0 ? parseFloat((total / count).toFixed(2)) : 0;
      return {
        ...s,
        total: Math.round(total * 100) / 100,
        average: avg,
        rank: 0
      };
    });

    // Rank by total score descending
    const sortedForRank = [...studentsList].sort((a, b) => b.total - a.total);
    sortedForRank.forEach((s, idx) => {
      s.rank = idx + 1;
    });

    // Default return sorted by student name A-Z
    studentsList.sort((a, b) => a.nama.localeCompare(b.nama));

    // 6. Calculate statistics per mapel
    const statistics: Record<string, { rataRata: number; tertinggi: number; terendah: number }> = {};
    mapels.forEach(m => {
      const validScores = studentsList
        .map(s => s.scores[m])
        .filter((val): val is number => val !== null && val !== undefined);

      if (validScores.length > 0) {
        const sum = validScores.reduce((acc, curr) => acc + curr, 0);
        const avg = parseFloat((sum / validScores.length).toFixed(2));
        const max = Math.max(...validScores);
        const min = Math.min(...validScores);
        statistics[m] = { rataRata: avg, tertinggi: max, terendah: min };
      } else {
        statistics[m] = { rataRata: 0, tertinggi: 0, terendah: 0 };
      }
    });

    // Total and overall average stats
    const allTotals = studentsList.map(s => s.total);
    const allAvgs = studentsList.map(s => s.average);
    const overallStats = {
      avgTotal: allTotals.length > 0 ? parseFloat((allTotals.reduce((a, b) => a + b, 0) / allTotals.length).toFixed(2)) : 0,
      avgClass: allAvgs.length > 0 ? parseFloat((allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length).toFixed(2)) : 0,
      highestTotal: allTotals.length > 0 ? Math.max(...allTotals) : 0,
      lowestTotal: allTotals.length > 0 ? Math.min(...allTotals) : 0
    };

    return NextResponse.json({
      success: true,
      ta,
      semester,
      kelas,
      mapels,
      students: studentsList,
      statistics,
      overallStats,
      isFromSts,
      lembaga: {
        nama: profilMap['NAMA LEMBAGA PENDIDIKAN'] || 'MTs Almaarif 01 Singosari',
        yayasan: profilMap['NAMA YAYASAN/INSTANSI'] || 'Yayasan Pendidikan Almaarif Singosari',
        alamat: profilMap['ALAMAT LEMBAGA PENDIDIKAN'] || 'Jl. Masjid No.33 Pagentan, Kec. Singosari, Kab. Malang',
        kepalaMadrasah: profilMap['NAMA KEPALA SEKOLAH/MADRASAH'] || 'Dwi Retno Palupi, M.Pd.',
        waliKelas: namaWaliKelas || 'Wali Kelas'
      }
    });

  } catch (err: any) {
    console.error('Error fetching DKN:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
