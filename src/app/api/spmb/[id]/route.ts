import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase.from('data_spmb').select('*').eq('id', params.id).single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await req.json();
    
    const { data: existing, error: findError } = await supabase.from('data_spmb').select('metadata').eq('id', params.id).single();
    if (findError) throw findError;

    let fullAlamat = payload.alamatLengkap || '';
    if (payload.desa) fullAlamat += `, Desa/Kel. ${payload.desa}`;
    if (payload.kecamatan) fullAlamat += `, Kec. ${payload.kecamatan}`;
    if (payload.kabupaten) fullAlamat += `, ${payload.kabupaten}`;

    const newMetadata = {
      ...existing.metadata,
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
      'Prestasi (Jika Ada)': payload.prestasi || ''
    };

    const { error } = await supabase.from('data_spmb').update({
      nama: payload.namaLengkap || '',
      nisn: payload.nisn || '',
      metadata: newMetadata
    }).eq('id', params.id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Data berhasil diupdate' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
