import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: rows, error } = await supabase.from('data_spmb').select('*');
    if (error) throw error;

    const data = (rows || []).map((r: any, index: number) => {
      const row = { get: (k: string) => r.metadata?.[k] || '' };
      return {
        id: index,
        rowNumber: r.id,
        timestamp: row.get('Timestamp') || '',
        jalurPendaftaran: row.get('Jalur Pendaftaran') || '',
        namaLengkap: row.get('Nama Lengkap') || '',
        nisn: row.get('NISN') || '',
        tempatTanggalLahir: row.get('Tempat, Tanggal Lahir') || '',
        jenisKelamin: row.get('Jenis Kelamin') || '',
        agama: row.get('Agama') || '',
        asalSekolah: row.get('Asal Sekolah') || '',
        alamatSekolahAsal: row.get('Alamat Sekolah Asal') || '',
        namaAyah: row.get('Nama Ayah') || '',
        namaIbu: row.get('Nama Ibu') || '',
        nomorWaAyah: row.get('Nomor WA Ayah') || '',
        nomorWaIbu: row.get('Nomor WA Ibu') || '',
        alamatLengkap: row.get('Alamat Lengkap') || '',
        prestasi: row.get('Prestasi (Jika Ada)') || '',
        linkKk: row.get('File KK') || '',
        linkAkta: row.get('File Akta') || ''
      };
    }).filter((item: any) => item.namaLengkap !== ''); // filter out empty rows

    // Reverse to show newest first
    return NextResponse.json({ success: true, data: data.reverse() }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });

  } catch (error: any) {
    console.error('Fetch SPMB Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data SPMB: ' + error.message }, { status: 500 });
  }
}
