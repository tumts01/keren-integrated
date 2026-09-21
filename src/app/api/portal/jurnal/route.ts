import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kelas = searchParams.get('kelas');
    
    if (!kelas) {
      return NextResponse.json({ success: false, error: 'Parameter kelas diperlukan' }, { status: 400 });
    }

    // Ambil 3 bulan terakhir agar tidak terlalu berat
    const today = new Date();
    const threeMonthsAgo = new Date(today.setMonth(today.getMonth() - 3)).toISOString().split('T')[0];

    const { data: rows, error } = await supabase
      .from('data_jurnal_mengajar')
      .select('*')
      .eq('kelas', kelas)
      .gte('tanggal', threeMonthsAgo)
      .order('tanggal', { ascending: false });

    // Fallback: If 'kelas' column is not populated but it's in metadata
    let finalRows = rows || [];
    if (finalRows.length === 0) {
       const fallbackData = await supabase
        .from('data_jurnal_mengajar')
        .select('*')
        .eq('metadata->>KELAS', kelas)
        .gte('tanggal', threeMonthsAgo)
        .order('tanggal', { ascending: false });
       
       if (!fallbackData.error) {
         finalRows = fallbackData.data || [];
       }
    }

    const cleanJamKe = (val: string) => val.replace(/,(19|20)\d{2}$/g, '').replace(/^'/, '').trim();

    const rawData = finalRows.map((r: any) => ({
      id: r.id,
      tanggal: r.tanggal,
      jamKe: cleanJamKe(r.metadata?.['JAM KE'] || ''),
      mapel: r.metadata?.['MAPEL'] || '',
      namaGuru: r.metadata?.['NAMA GURU'] || '',
      materi: r.metadata?.['MATERI'] || '',
    }));

    // Deduplicate
    const seen = new Set<string>();
    const data = rawData.filter((r: any) => {
      const key = `${r.tanggal}|${r.mapel}|${r.jamKe}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ 
      success: true, 
      data 
    });

  } catch (error: any) {
    console.error('Portal Jurnal Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data' }, { status: 500 });
  }
}
