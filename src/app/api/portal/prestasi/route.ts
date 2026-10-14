import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nis = searchParams.get('nis') || '';
    const nama = searchParams.get('nama') || '';

    if (!nis && !nama) {
      return NextResponse.json({ success: false, error: 'Parameter nis atau nama harus disertakan' }, { status: 400 });
    }

    const cleanInputNis = String(nis).trim().replace(/^0+/, '').toLowerCase();
    const cleanInputNama = String(nama).trim().toLowerCase();

    // Query all data_prestasi from Supabase
    const { data, error } = await supabase
      .from('data_prestasi')
      .select('id, metadata');

    if (error) throw error;

    // Filter by student NIS or Nama
    const matched = (data || [])
      .map(row => ({
        id: row.id,
        no: row.metadata?.no || '',
        tahun_pelajaran: row.metadata?.tahun_pelajaran || '',
        tanggal: row.metadata?.tanggal || '',
        nama: row.metadata?.nama || '',
        kelas: row.metadata?.kelas || '',
        nama_lomba: row.metadata?.nama_lomba || '',
        penyelenggara: row.metadata?.penyelenggara || '',
        peringkat: row.metadata?.peringkat || '',
        tingkat: row.metadata?.tingkat || '',
        link_sertifikat: row.metadata?.link_sertifikat || '',
        induk: row.metadata?.induk || '',
        sertifikat_fisik: row.metadata?.sertifikat_fisik || '',
        emis: row.metadata?.emis || ''
      }))
      .filter(item => {
        const itemInduk = String(item.induk || '').trim().replace(/^0+/, '').toLowerCase();
        const itemNama = String(item.nama || '').trim().toLowerCase();

        // 1. Check matching NIS
        if (cleanInputNis && itemInduk && cleanInputNis === itemInduk) {
          return true;
        }

        // 2. Check matching Nama
        if (cleanInputNama && itemNama) {
          if (cleanInputNama === itemNama) return true;
          // Substring match if full name contains the other
          if (cleanInputNama.length > 5 && itemNama.length > 5) {
            if (cleanInputNama.includes(itemNama) || itemNama.includes(cleanInputNama)) {
              return true;
            }
          }
        }

        return false;
      });

    // Sort by tanggal descending (latest first)
    matched.sort((a, b) => {
      const dateA = new Date(a.tanggal || 0).getTime();
      const dateB = new Date(b.tanggal || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      total: matched.length,
      data: matched
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });

  } catch (error: any) {
    console.error('Error GET /api/portal/prestasi:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data prestasi siswa' }, { status: 500 });
  }
}
