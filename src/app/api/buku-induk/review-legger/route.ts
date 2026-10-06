import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kelas = url.searchParams.get('kelas');
    const semester = url.searchParams.get('semester');
    const ta = url.searchParams.get('ta');

    if (!kelas || !semester || !ta) {
      return NextResponse.json({ success: false, error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('nilai_buku_induk')
      .select('mata_pelajaran, data_nilai')
      .match({ kelas, semester, tahun_ajaran: ta });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
