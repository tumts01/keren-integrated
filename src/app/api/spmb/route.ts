import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';
import { supabase } from '@/lib/supabase';

const SPMB_HEADERS = [
  'Timestamp',
  'Jalur Pendaftaran',
  'Nama Lengkap',
  'NISN',
  'Tempat, Tanggal Lahir',
  'Jenis Kelamin',
  'Agama',
  'Asal Sekolah',
  'Alamat Sekolah Asal',
  'Nama Ayah',
  'Pekerjaan Ayah',
  'Nama Ibu',
  'Pekerjaan Ibu',
  'Nomor WA Ayah',
  'Nomor WA Ibu',
  'Alamat Lengkap',
  'Prestasi (Jika Ada)',
  'File KK',
  'File Akta'
];

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    let fullAlamat = payload.alamatLengkap || '';
    if (payload.desa) fullAlamat += `, Desa/Kel. ${payload.desa}`;
    if (payload.kecamatan) fullAlamat += `, Kec. ${payload.kecamatan}`;
    if (payload.kabupaten) fullAlamat += `, ${payload.kabupaten}`;
    
    const { error } = await supabase.from('data_spmb').insert({
      nama: payload.namaLengkap || '',
      nisn: payload.nisn || '',
      metadata: {
      'Timestamp': timestamp,
      'Jalur Pendaftaran': payload.jalurPendaftaran || '',
      'Nama Lengkap': payload.namaLengkap || '',
      'NISN': payload.nisn || '',
      'Tempat, Tanggal Lahir': payload.tempatTanggalLahir || '',
      'Jenis Kelamin': payload.jenisKelamin || '',
      'Agama': payload.agama || '',
      'Asal Sekolah': payload.asalSekolah || '',
      'Alamat Sekolah Asal': payload.alamatSekolahAsal || '',
      'Nama Ayah': payload.namaAyah || '',
      'Pekerjaan Ayah': payload.pekerjaanAyah || '',
      'Nama Ibu': payload.namaIbu || '',
      'Pekerjaan Ibu': payload.pekerjaanIbu || '',
      'Nomor WA Ayah': payload.nomorWaAyah || '',
      'Nomor WA Ibu': payload.nomorWaIbu || '',
      'Alamat (Jalan/RT/RW)': payload.alamatLengkap || '',
      'Desa/Kelurahan': payload.desa || '',
      'Kecamatan': payload.kecamatan || '',
      'Kabupaten/Kota': payload.kabupaten || '',
      'Alamat Lengkap': fullAlamat,
      'Prestasi (Jika Ada)': payload.prestasi || '',
      'File KK': payload.linkKk || '',
      'File Akta': payload.linkAkta || ''
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Submit SPMB Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses pendaftaran SPMB: ' + error.message }, { status: 500 });
  }
}
