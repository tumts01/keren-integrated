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
        nomorPendaftaran: row.get('Nomor Pendaftaran') || (`MTS01-2026-${String(r.id).padStart(4, '0')}`),
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
        linkAkta: row.get('File Akta') || '',
        statusVerifikasi: row.get('status_verifikasi') || 'menunggu',
        catatanVerifikasi: row.get('catatan_verifikasi') || '',
        statusKelulusan: row.get('status_kelulusan') || 'proses',
        jadwalTes: row.get('jadwal_tes') || ''
      };
    }).filter((item: any) => item.namaLengkap !== ''); // filter out empty rows

    // Urutkan berdasarkan nomor pendaftaran (ascending)
    data.sort((a: any, b: any) => {
      const valA = (a.nomorPendaftaran || '').trim();
      const valB = (b.nomorPendaftaran || '').trim();
      if (!valA && !valB) return 0;
      if (!valA) return 1;
      if (!valB) return -1;
      return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    });

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });

  } catch (error: any) {
    console.error('Fetch SPMB Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data SPMB: ' + error.message }, { status: 500 });
  }
}
