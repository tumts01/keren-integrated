import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch Students from Supabase
    const { data: rawSiswa, error: errorSiswa } = await supabase.from('data_induk').select('*');
    if (errorSiswa) throw errorSiswa;
    
    const activeStudents = (rawSiswa || []).map((row: any) => {
        let rombel = (row.metadata?.['ROMBEL KELAS 9'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL KELAS 8'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL KELAS 7'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL'] || '').trim();

        return {
           nis: row.metadata?.['ID SISWA'] || row.id_siswa || '',
           nama: row.metadata?.['NAMA'] || row.nama || '',
           kelas: rombel,
           status: (row.metadata?.['STATUS SISWA'] || '').toLowerCase().trim()
        }
    }).filter((s: any) => s.status === 'aktif' && s.kelas && s.nis);

    // 2. Fetch Config & Returned Report Cards from Supabase in Parallel
    const [configRes, returnedRes] = await Promise.all([
      supabase.from('rapor_config').select('*'),
      supabase.from('rapor_pengembalian').select('*')
    ]);

    let startDate = '', endDate = '';
    if (configRes.data) {
      const startRow = configRes.data.find(r => r.key === 'StartDate');
      const endRow = configRes.data.find(r => r.key === 'EndDate');
      if (startRow) startDate = startRow.value || '';
      if (endRow) endDate = endRow.value || '';
    }

    let returnedMap: Record<string, string> = {};
    if (returnedRes.data) {
      returnedRes.data.forEach(r => {
        const scanData = (r.scan_data || '').trim();
        const nis = scanData.split(' ')[0]; // Extract NIS from first word
        
        let tglStr = '';
        if (r.waktu) {
          const jsDate = new Date(r.waktu);
          tglStr = jsDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        
        if (nis) {
          returnedMap[nis] = tglStr;
        }
      });
    }

    // 4. Combine Data
    const data = activeStudents.map((s: any) => ({
      ...s,
      tanggalKembali: returnedMap[s.nis] || null,
      isReturned: !!returnedMap[s.nis]
    }));

    return NextResponse.json({ success: true, data, config: { startDate, endDate } }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });

  } catch (error: any) {
    console.error('Fetch Rapor Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat data rapor' }, { status: 500 });
  }
}
