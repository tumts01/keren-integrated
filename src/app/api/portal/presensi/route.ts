import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const cleanNisn = (val: any) => String(val || '').replace(/^'/, '').trim().replace(/^0+/, '');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nisn = searchParams.get('nisn');
    
    if (!nisn) {
      return NextResponse.json({ success: false, error: 'Parameter nisn diperlukan' }, { status: 400 });
    }

    const cleanInputNisn = cleanNisn(nisn);
    
    // Using simple query since we are filtering by NISN, the number of records won't exceed 1000 for a single student.
    // Notice that Supabase JSONB path query can be tricky if they have leading ' or zeros. 
    // Best is to fetch all records matching the clean NISN or do a text search.
    // Actually, `metadata->>NISN` is a string. If it has a single quote prefix in the DB, it's better to fetch and filter.
    // But fetching ALL rows for all students is too slow just for one portal user.
    // Let's use ilike on metadata->>NISN.
    
    const { data: rows, error } = await supabase
      .from('data_presensi_siswa')
      .select('*')
      .ilike('metadata->>NISN', `%${cleanInputNisn}%`)
      .order('tanggal', { ascending: false });

    if (error) throw error;

    const history = rows.map((r: any) => {
      return {
        id: r.id,
        tanggal: r.tanggal,
        jamKe: r.metadata?.['JAM KE'] || '',
        keterangan: (r.metadata?.['KETERANGAN'] || '').trim() || 'Hadir', // Default Hadir jika tidak ada keterangan sakit/izin/alpha khusus
        guru: r.metadata?.['NAMA GURU'] || '',
        mapel: r.metadata?.['MATA PELAJARAN'] || ''
      };
    });

    // Hitung rekap 
    // (Asumsi: di sistem ini, jika dicatat artinya Sakit/Izin/Alpha. Jika tidak dicatat artinya hadir)
    // Tapi karena ini data per siswa yang tercatat, kita hitung dari data ini.
    let sakit = 0, izin = 0, alpha = 0;
    history.forEach((h: any) => {
      const ket = h.keterangan.toLowerCase();
      if (ket.includes('sakit') || ket === 's') sakit++;
      else if (ket.includes('izin') || ket.includes('ijin') || ket === 'i') izin++;
      else if (ket.includes('alpha') || ket.includes('alfa') || ket === 'a') alpha++;
    });

    return NextResponse.json({ 
      success: true, 
      data: history,
      rekap: { sakit, izin, alpha }
    });

  } catch (error: any) {
    console.error('Portal Presensi Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data' }, { status: 500 });
  }
}
