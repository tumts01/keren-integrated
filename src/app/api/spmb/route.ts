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

    // Auto-generate Nomor Pendaftaran
    const currentYear = new Date().getFullYear();
    const { data: latestRows } = await supabase
      .from('data_spmb')
      .select('id, metadata')
      .order('id', { ascending: false })
      .limit(1);

    let nextSeq = 1;
    if (latestRows && latestRows.length > 0) {
      const lastNomor = latestRows[0].metadata?.['Nomor Pendaftaran'] || '';
      const match = lastNomor.match(/SPMB-\d{4}-(\d+)/);
      if (match && match[1]) {
        nextSeq = parseInt(match[1], 10) + 1;
      } else {
        const { count } = await supabase.from('data_spmb').select('*', { count: 'exact', head: true });
        nextSeq = (count || 0) + 1;
      }
    }
    const nomorPendaftaran = `SPMB-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
    
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
