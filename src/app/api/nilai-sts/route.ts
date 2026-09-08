import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunAjaran = searchParams.get('tahunAjaran');
    const semester = searchParams.get('semester');
    const kelas = searchParams.get('kelas');
    const mataPelajaran = searchParams.get('mataPelajaran');

    if (!tahunAjaran || !semester || !kelas) {
      return NextResponse.json({ success: false, error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    let query = supabase
      .from('nilai_sts')
      .select('*')
      .eq('tahun_ajaran', tahunAjaran)
      .eq('semester', semester)
      .eq('kelas', kelas);

    if (mataPelajaran) {
      query = query.eq('mata_pelajaran', mataPelajaran);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error GET nilai_sts:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tahunAjaran, semester, kelas, mataPelajaran, dataNilai } = body;

    if (!tahunAjaran || !semester || !kelas || !mataPelajaran || !dataNilai) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Upsert to handle insert if not exists, update if exists based on unique constraint
    const { data, error } = await supabase
      .from('nilai_sts')
      .upsert(
        {
          tahun_ajaran: tahunAjaran,
          semester,
          kelas,
          mata_pelajaran: mataPelajaran,
          data_nilai: dataNilai,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'tahun_ajaran, semester, kelas, mata_pelajaran' }
      )
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error POST nilai_sts:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
