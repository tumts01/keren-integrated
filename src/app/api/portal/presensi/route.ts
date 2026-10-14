import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const cleanNisn = (val: any) => String(val || '').replace(/^'/, '').trim().replace(/^0+/, '');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nisn = searchParams.get('nisn');
    const namaParam = searchParams.get('nama');
    
    if (!nisn && !namaParam) {
      return NextResponse.json({ success: false, error: 'Parameter nisn atau nama diperlukan' }, { status: 400 });
    }

    const cleanInputNisn = cleanNisn(nisn);
    let rows: any[] = [];

    // 1. Primary Query by NISN
    if (cleanInputNisn) {
      const { data, error } = await supabase
        .from('data_presensi_siswa')
        .select('*')
        .ilike('metadata->>NISN', `%${cleanInputNisn}%`)
        .order('tanggal', { ascending: false });

      if (error) throw error;
      if (data) rows = data;
    }

    // 2. Secondary fallback by Nama Siswa if rows is empty and nama is provided
    if (rows.length === 0 && namaParam) {
      const cleanNama = namaParam.trim();
      const { data, error } = await supabase
        .from('data_presensi_siswa')
        .select('*')
        .ilike('metadata->>NAMA SISWA', `%${cleanNama}%`)
        .order('tanggal', { ascending: false });

      if (!error && data) rows = data;
    }

    const history = rows.map((r: any) => {
      // Check KEHADIRAN (S, I, A, H) or KETERANGAN
      const rawKet = (r.metadata?.['KEHADIRAN'] || r.metadata?.['KETERANGAN'] || '').trim().toUpperCase();
      let status = 'HADIR';
      let statusLabel = 'Hadir';

      if (rawKet === 'S' || rawKet.includes('SAKIT')) {
        status = 'SAKIT';
        statusLabel = 'Sakit';
      } else if (rawKet === 'I' || rawKet.includes('IZIN') || rawKet.includes('IJIN')) {
        status = 'IZIN';
        statusLabel = 'Izin';
      } else if (rawKet === 'A' || rawKet.includes('ALPHA') || rawKet.includes('ALFA')) {
        status = 'ALPHA';
        statusLabel = 'Alpha';
      } else if (rawKet === 'H' || rawKet.includes('HADIR')) {
        status = 'HADIR';
        statusLabel = 'Hadir';
      }

      const rawTgl = (r.metadata?.['TANGGAL'] || r.tanggal || '').trim();

      return {
        id: r.metadata?.['ID'] || r.id?.toString() || Math.random().toString(),
        tanggal: rawTgl,
        jamKe: (r.metadata?.['JAM KE'] || '').trim(),
        status, // 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPHA'
        keterangan: statusLabel,
        guru: (r.metadata?.['GURU PENGINPUT'] || r.metadata?.['NAMA GURU'] || '').trim(),
        mapel: (r.metadata?.['MAPEL'] || r.metadata?.['MATA PELAJARAN'] || '').trim(),
        kelas: (r.metadata?.['KELAS'] || r.kelas || '').trim()
      };
    });

    let hadir = 0, sakit = 0, izin = 0, alpha = 0;
    history.forEach((h: any) => {
      if (h.status === 'SAKIT') sakit++;
      else if (h.status === 'IZIN') izin++;
      else if (h.status === 'ALPHA') alpha++;
      else hadir++;
    });

    return NextResponse.json({ 
      success: true, 
      data: history,
      rekap: { hadir, sakit, izin, alpha, total: history.length }
    });

  } catch (error: any) {
    console.error('Portal Presensi Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data presensi' }, { status: 500 });
  }
}
