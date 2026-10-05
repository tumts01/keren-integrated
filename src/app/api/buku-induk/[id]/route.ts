import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    
    // 1. Get Data Induk
    const allStudents = await getAllCachedDataInduk();
    const student = allStudents.find((s: any) => s.id_siswa === id || (s.metadata && s.metadata['ID SISWA'] === id));
    
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const metadata = student.metadata || {};
    const nis = metadata['NISM'] || metadata['ID SISWA'] || id;
    const nisn = metadata['NISN'] || '';
    const nama = metadata['NAMA'] || student.nama || '';
    
    // Extract history of classes
    const history = [
      { kelas: '7', tahun_ajaran: metadata['TA KELAS 7'], rombel: metadata['ROMBEL KELAS 7'] },
      { kelas: '8', tahun_ajaran: metadata['TA KELAS 8'], rombel: metadata['ROMBEL KELAS 8'] },
      { kelas: '9', tahun_ajaran: metadata['TA KELAS 9'], rombel: metadata['ROMBEL KELAS 9'] }
    ].filter(h => h.rombel && h.tahun_ajaran);

    // 2. Fetch Nilai STS for these classes
    let nilaiData: any[] = [];
    if (history.length > 0) {
      const rombels = history.map(h => h.rombel);
      const tas = history.map(h => h.tahun_ajaran);
      
      const { data: sts, error: stsError } = await supabase
        .from('nilai_sts')
        .select('*')
        .in('kelas', rombels)
        .in('tahun_ajaran', tas);
        
      if (!stsError && sts) {
        // filter the jsonb array for this student
        for (const row of sts) {
          const studentGrades = (row.data_nilai || []).find((d: any) => d.nis === nis || d.nama === nama);
          if (studentGrades) {
            nilaiData.push({
              tahun_ajaran: row.tahun_ajaran,
              semester: row.semester,
              kelas: row.kelas,
              mata_pelajaran: row.mata_pelajaran,
              nilai: studentGrades.nilai
            });
          }
        }
      }
    }

    // 3. Fetch Prestasi
    const { data: prestasi, error: prestasiError } = await supabase
      .from('data_prestasi')
      .select('metadata');
      
    let prestasiList = [];
    if (!prestasiError && prestasi) {
      prestasiList = prestasi
        .map(p => p.metadata)
        .filter(m => m && (m.nama === nama || m.induk === nis));
    }

    return NextResponse.json({
      success: true,
      data: {
        induk: {
          id_siswa: student.id_siswa,
          ...metadata
        },
        history,
        nilai: nilaiData,
        prestasi: prestasiList
      }
    });

  } catch (error: any) {
    console.error('Error fetching buku induk:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
