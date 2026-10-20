import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await supabase.from('data_spmb').select('*').eq('id', id).single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await req.json();
    
    const { data: existing, error: findError } = await supabase.from('data_spmb').select('metadata').eq('id', id).single();
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
      'Prestasi (Jika Ada)': payload.prestasi || '',
      ...(payload.linkKk ? { 'File KK': payload.linkKk } : {}),
      ...(payload.linkAkta ? { 'File Akta': payload.linkAkta } : {})
    };

    const { error } = await supabase.from('data_spmb').update({
      nama: payload.namaLengkap || '',
      nisn: payload.nisn || '',
      metadata: newMetadata
    }).eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Data berhasil diupdate' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { data: existing, error: findError } = await supabase
      .from('data_spmb')
      .select('metadata')
      .eq('id', id)
      .single();

    if (findError || !existing) throw new Error('Data tidak ditemukan');

    const updatedMetadata = {
      ...existing.metadata,
      ...(body.statusVerifikasi !== undefined ? { status_verifikasi: body.statusVerifikasi } : {}),
      ...(body.catatanVerifikasi !== undefined ? { catatan_verifikasi: body.catatanVerifikasi } : {}),
      ...(body.statusVerifikasiRapor !== undefined ? { status_verifikasi_rapor: body.statusVerifikasiRapor } : {}),
      ...(body.catatanVerifikasiRapor !== undefined ? { catatan_verifikasi_rapor: body.catatanVerifikasiRapor } : {}),
      ...(body.statusKelulusan !== undefined ? { status_kelulusan: body.statusKelulusan } : {}),
      ...(body.jadwalTes !== undefined ? { jadwal_tes: body.jadwalTes } : {}),
      ...(body.biayaDaftarUlang !== undefined ? { biaya_daftar_ulang: Number(body.biayaDaftarUlang) } : {}),
      ...(body.potonganDaftarUlang !== undefined ? { potongan_daftar_ulang: Number(body.potonganDaftarUlang) } : {}),
      ...(body.nominalDibayarDaftarUlang !== undefined ? { nominal_dibayar_daftar_ulang: Number(body.nominalDibayarDaftarUlang) } : {}),
      ...(body.statusDaftarUlang !== undefined ? { status_daftar_ulang: body.statusDaftarUlang } : {}),
      ...(body.buktiDaftarUlang !== undefined ? { bukti_daftar_ulang: body.buktiDaftarUlang } : {}),
      ...(body.catatanDaftarUlang !== undefined ? { catatan_daftar_ulang: body.catatanDaftarUlang } : {}),
      ...(body.metodeBayarDaftarUlang !== undefined ? { metode_bayar_daftar_ulang: body.metodeBayarDaftarUlang } : {}),
      ...(body.tglBayarDaftarUlang !== undefined ? { tgl_bayar_daftar_ulang: body.tglBayarDaftarUlang } : {})
    };

    const { error: updateError } = await supabase
      .from('data_spmb')
      .update({ metadata: updatedMetadata })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Status berhasil diperbarui' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


