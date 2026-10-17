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
  'NPSN SD/MI',
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

    // Auto-generate Nomor Pendaftaran kombinasi huruf dan angka acak (misal: MTS01-2026-EM5JJ)
    const currentYear = new Date().getFullYear();
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const generateCode = (length = 5) => {
      let code = '';
      while (true) {
        code = '';
        for (let i = 0; i < length; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Pastikan kombinasi huruf dan angka (minimal 1 angka dan minimal 1 huruf)
        if (/[0-9]/.test(code) && /[A-Z]/.test(code)) break;
      }
      return code;
    };

    // Ambil semua nomor pendaftaran yang sudah ada untuk memastikan kode selalu unik
    const { data: existingRows } = await supabase
      .from('data_spmb')
      .select('metadata');

    const existingNomorSet = new Set(
      (existingRows || [])
        .map((r: any) => String(r.metadata?.['Nomor Pendaftaran'] || '').toUpperCase().trim())
        .filter(Boolean)
    );

    let nomorPendaftaran = '';
    for (let attempt = 0; attempt < 50; attempt++) {
      const randomCode = generateCode(5);
      const candidate = `MTS01-${currentYear}-${randomCode}`;
      if (!existingNomorSet.has(candidate)) {
        nomorPendaftaran = candidate;
        break;
      }
    }
    if (!nomorPendaftaran) {
      nomorPendaftaran = `MTS01-${currentYear}-${generateCode(6)}`;
    }
    
    const { data: insertedData, error } = await supabase.from('data_spmb').insert({
      nama: payload.namaLengkap || '',
      nisn: payload.nisn || '',
      metadata: {
        'Timestamp': timestamp,
        'Nomor Pendaftaran': nomorPendaftaran,
        'status_verifikasi': 'menunggu',
        'status_kelulusan': 'proses',
        'catatan_verifikasi': '',
        'Jalur Pendaftaran': payload.jalurPendaftaran || '',
        'Nama Lengkap': payload.namaLengkap || '',
        'NISN': payload.nisn || '',
        'Tempat, Tanggal Lahir': payload.tempatTanggalLahir || '',
        'Jenis Kelamin': payload.jenisKelamin || '',
        'Agama': payload.agama || '',
        'Asal Sekolah': payload.asalSekolah || '',
        'NPSN SD/MI': payload.npsnSekolahAsal || '',
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
    }).select();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      id: insertedData && insertedData[0] ? insertedData[0].id : null,
      nomorPendaftaran,
      nama: payload.namaLengkap || ''
    });

  } catch (error: any) {
    console.error('Submit SPMB Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses pendaftaran SPMB: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID tidak ditemukan' }, { status: 400 });
    
    const { error } = await supabase.from('data_spmb').delete().eq('id', id);
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete SPMB Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus data: ' + error.message }, { status: 500 });
  }
}
