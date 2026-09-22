import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const kelas = searchParams.get('kelas');
    const tahunAjaran = searchParams.get('tahunAjaran');
    const tipe = searchParams.get('tipe') || 'sts'; // Default sts if not provided

    if (!kelas || !tahunAjaran) {
      return NextResponse.json({ success: false, error: 'Kelas dan Tahun Ajaran wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('nilai_pk')
      .select('mata_pelajaran')
      .eq('kelas', kelas)
      .eq('tahun_ajaran', tahunAjaran)
      .eq('tipe', tipe);

    if (error) {
      throw error;
    }

    // Get unique mapel
    const mapels = Array.from(new Set(data.map(d => d.mata_pelajaran))).filter(Boolean).sort();

    return NextResponse.json({ success: true, data: mapels });
  } catch (err: any) {
    console.error('Error GET mapel from nilai_pk:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
