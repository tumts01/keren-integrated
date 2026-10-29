import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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
        npsnSekolahAsal: row.get('NPSN SD/MI') || row.get('NPSN') || row.get('npsn') || '',
        namaAyah: row.get('Nama Ayah') || '',
        pendidikanAyah: row.get('Pendidikan Terakhir Ayah') || row.get('Pendidikan Ayah') || '',
        pekerjaanAyah: row.get('Pekerjaan Ayah') || '',
        namaIbu: row.get('Nama Ibu') || '',
        pendidikanIbu: row.get('Pendidikan Terakhir Ibu') || row.get('Pendidikan Ibu') || '',
        pekerjaanIbu: row.get('Pekerjaan Ibu') || '',
        nomorWaAyah: row.get('Nomor WA Ayah') || '',
        nomorWaIbu: row.get('Nomor WA Ibu') || '',
        alamatLengkap: row.get('Alamat Lengkap') || '',
        prestasi: row.get('Prestasi (Jika Ada)') || '',
        linkKk: row.get('File KK') || '',
        linkAkta: row.get('File Akta') || '',
        statusVerifikasi: row.get('status_verifikasi') || 'menunggu',
        catatanVerifikasi: row.get('catatan_verifikasi') || '',
        statusVerifikasiRapor: row.get('status_verifikasi_rapor') || 'menunggu',
        catatanVerifikasiRapor: row.get('catatan_verifikasi_rapor') || '',
        statusKelulusan: row.get('status_kelulusan') || 'proses',
        jadwalTes: row.get('jadwal_tes') || '',
        biayaDaftarUlang: r.metadata?.['biaya_daftar_ulang'] !== undefined && r.metadata?.['biaya_daftar_ulang'] !== '' ? Number(r.metadata['biaya_daftar_ulang']) : 4500000,
        potonganDaftarUlang: Number(r.metadata?.['potongan_daftar_ulang'] || 0),
        nominalDibayarDaftarUlang: Number(r.metadata?.['nominal_dibayar_daftar_ulang'] || 0),
        statusDaftarUlang: r.metadata?.['status_daftar_ulang'] || 'belum_bayar',
        buktiDaftarUlang: r.metadata?.['bukti_daftar_ulang'] || '',
        catatanDaftarUlang: r.metadata?.['catatan_daftar_ulang'] || '',
        metodeBayarDaftarUlang: r.metadata?.['metode_bayar_daftar_ulang'] || '',
        tglBayarDaftarUlang: r.metadata?.['tgl_bayar_daftar_ulang'] || ''
      };
    }).filter((item: any) => item.namaLengkap !== ''); // filter out empty rows

    // Urutkan default: pendaftar terbaru ke terlama (descending)
    const parseTimestamp = (item: any): number => {
      const str = item.timestamp || '';
      if (str) {
        const parts = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2})[.:](\d{1,2})[.:](\d{1,2})/);
        if (parts) {
          const [, d, m, y, h, min, s] = parts;
          const t = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s)).getTime();
          if (!isNaN(t)) return t;
        }
        const parsed = Date.parse(str);
        if (!isNaN(parsed)) return parsed;
      }
      const numId = Number(item.rowNumber || item.id || 0);
      return !isNaN(numId) ? numId : 0;
    };

    data.sort((a: any, b: any) => {
      const timeDiff = parseTimestamp(b) - parseTimestamp(a);
      if (timeDiff !== 0) return timeDiff;
      return Number(b.rowNumber || 0) - Number(a.rowNumber || 0);
    });

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate' }
    });

  } catch (error: any) {
    console.error('Fetch SPMB Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data SPMB: ' + error.message }, { status: 500 });
  }
}
