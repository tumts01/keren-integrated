import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('nilai_buku_induk')
      .select('kelas, semester, tahun_ajaran, created_at');

    if (error) throw error;
    
    // Group by kelas, semester, tahun_ajaran
    const summaryMap: Record<string, any> = {};
    if (data) {
      data.forEach(row => {
        const key = `${row.kelas}_${row.semester}_${row.tahun_ajaran}`;
        if (!summaryMap[key]) {
          summaryMap[key] = {
            kelas: row.kelas,
            semester: row.semester,
            tahun_ajaran: row.tahun_ajaran,
            created_at: row.created_at,
            mapel_count: 0
          };
        }
        summaryMap[key].mapel_count += 1;
        if (new Date(row.created_at) > new Date(summaryMap[key].created_at)) {
          summaryMap[key].created_at = row.created_at; // keep latest timestamp
        }
      });
    }

    const summary = Object.values(summaryMap).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return NextResponse.json({ success: true, data: summary });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
