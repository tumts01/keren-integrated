import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ kelas: string }> }) {
  try {
    const { kelas } = await context.params;
    const decodedKelas = decodeURIComponent(kelas);
    
    // 1. Get Data Induk
    const allStudents = await getAllCachedDataInduk();
    const studentsInClass = allStudents.filter((s: any) => {
      const rombel = (s.metadata?.['ROMBEL'] || '').trim();
      const status = (s.metadata?.['STATUS SISWA'] || '').trim().toUpperCase();
      return rombel === decodedKelas && status === 'AKTIF';
    });

    if (studentsInClass.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada siswa aktif di kelas ini' }, { status: 404 });
    }

    // Collect all unique tas and rombels for these students
    const historySet = new Set<string>();
    
    const studentsData = studentsInClass.map((student: any) => {
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
        prestasi: [] as any[]
      };
    });

    // 2. Fetch Nilai Buku Induk for all collected classes
    const uniqueTas = Array.from(new Set(Array.from(historySet).map(s => s.split('::')[0])));
    const uniqueRombels = Array.from(new Set(Array.from(historySet).map(s => s.split('::')[1])));

    let stsData: any[] = [];
    if (uniqueTas.length > 0 && uniqueRombels.length > 0) {
      const { data: sts, error: stsError } = await supabase
        .from('nilai_buku_induk')
        .select('*')
        .in('kelas', uniqueRombels)
        .in('tahun_ajaran', uniqueTas);
        
      if (!stsError && sts) {
        stsData = sts;
      }
    }

    // 3. Fetch Prestasi for these students
    const { data: prestasi, error: prestasiError } = await supabase
      .from('data_prestasi')
      .select('metadata');
      
    let prestasiList: any[] = [];
    if (!prestasiError && prestasi) {
      prestasiList = prestasi.map(p => p.metadata).filter(Boolean);
    }

    // 4. Map everything together
    studentsData.forEach(student => {
      // Map Nilai from legger
      stsData.forEach(row => {
        // Only consider this row if it belongs to one of the student's historical classes
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

      // Also merge manual DKN R_GRADES (e.g. for transfer students or missing legger)
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

      // Map Prestasi
      student.prestasi = prestasiList.filter(m => m.nama === student.nama || m.induk === student.nis);
    });

    // Sort students by name
    studentsData.sort((a, b) => a.nama.localeCompare(b.nama));

    return NextResponse.json({
      success: true,
      data: studentsData
    });

  } catch (error: any) {
    console.error('Error fetching mass buku induk:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
