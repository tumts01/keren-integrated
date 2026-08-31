import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request, { params }: { params: Promise<{ rowNumber: string }> }) {
  try {
    const resolvedParams = await params;
    const rowNumber = parseInt(resolvedParams.rowNumber, 10);
    
    const { data: targetRow, error } = await supabase.from('data_spmb').select('*').eq('id', rowNumber).single();

    if (error || !targetRow) {
      return NextResponse.json({ success: false, error: 'Data pendaftar tidak ditemukan' }, { status: 404 });
    }

    const data = {
      timestamp: targetRow.metadata?.['Timestamp'] || '',
      jalurPendaftaran: targetRow.metadata?.['Jalur Pendaftaran'] || '',
      namaLengkap: targetRow.metadata?.['Nama Lengkap'] || '',
      nisn: targetRow.metadata?.['NISN'] || '',
      tempatTanggalLahir: targetRow.metadata?.['Tempat, Tanggal Lahir'] || '',
      jenisKelamin: targetRow.metadata?.['Jenis Kelamin'] || '',
      agama: targetRow.metadata?.['Agama'] || '',
      asalSekolah: targetRow.metadata?.['Asal Sekolah'] || '',
      alamatSekolahAsal: targetRow.metadata?.['Alamat Sekolah Asal'] || '',
      namaAyah: targetRow.metadata?.['Nama Ayah'] || '',
      namaIbu: targetRow.metadata?.['Nama Ibu'] || '',
      alamatLengkap: targetRow.metadata?.['Alamat Lengkap'] || '',
      prestasi: targetRow.metadata?.['Prestasi (Jika Ada)'] || ''
    };

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });

  } catch (error: any) {
    console.error('Fetch Cetak SPMB Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat data: ' + error.message }, { status: 500 });
  }
}
