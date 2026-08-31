import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: allRows, error } = await supabase.from('data_survey').select('*');
    if (error) throw error;

    const rekap = [
      { id: 'wali_murid', nama: 'Angket Persepsi Wali Murid', total: 0, latest: [] as any[] },
      { id: 'siswa', nama: 'Angket Persepsi Siswa', total: 0, latest: [] as any[] },
      { id: 'kepuasan_ortu', nama: 'Angket Kepuasan Orang Tua', total: 0, latest: [] as any[] },
    ];

    const mappedRows = (allRows || []).map((r: any) => ({
      tipe: r.tipe_survey,
      timestamp: r.metadata?.['Timestamp'] || '-',
      nama: r.metadata?.['Nama Wali Murid'] || r.metadata?.['Nama Siswa'] || r.metadata?.['Nama Anak / Siswa'] || '-',
      kelas: r.metadata?.['Kelas'] || r.metadata?.['Kelas Siswa'] || '-'
    }));

    for (let i = 0; i < rekap.length; i++) {
      const tipeId = rekap[i].id;
      const filtered = mappedRows.filter(r => r.tipe === tipeId);
      rekap[i].total = filtered.length;
      rekap[i].latest = filtered.slice(-10).reverse(); // Assuming original order is chronological
    }

    return NextResponse.json({ success: true, data: rekap }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error: any) {
    console.error('API Survey Rekap Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data rekap: ' + error.message }, { status: 500 });
  }
}
