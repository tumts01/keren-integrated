import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function GET(req: Request, { params }: { params: Promise<{ rowNumber: string }> }) {
  try {
    const resolvedParams = await params;
    const rowNumber = parseInt(resolvedParams.rowNumber, 10);
    const doc = await getIndukDoc();
    const sheet = doc.sheetsByTitle['SPMB'];

    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Sheet SPMB tidak ditemukan' }, { status: 404 });
    }

    const rows = await sheet.getRows();
    const targetRow = rows.find(r => r.rowNumber === rowNumber);

    if (!targetRow) {
      return NextResponse.json({ success: false, error: 'Data pendaftar tidak ditemukan' }, { status: 404 });
    }

    const data = {
      timestamp: targetRow.get('Timestamp') || '',
      jalurPendaftaran: targetRow.get('Jalur Pendaftaran') || '',
      namaLengkap: targetRow.get('Nama Lengkap') || '',
      nisn: targetRow.get('NISN') || '',
      tempatTanggalLahir: targetRow.get('Tempat, Tanggal Lahir') || '',
      jenisKelamin: targetRow.get('Jenis Kelamin') || '',
      agama: targetRow.get('Agama') || '',
      asalSekolah: targetRow.get('Asal Sekolah') || '',
      alamatSekolahAsal: targetRow.get('Alamat Sekolah Asal') || '',
      namaAyah: targetRow.get('Nama Ayah') || '',
      namaIbu: targetRow.get('Nama Ibu') || '',
      alamatLengkap: targetRow.get('Alamat Lengkap') || '',
      prestasi: targetRow.get('Prestasi (Jika Ada)') || ''
    };

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Fetch Cetak SPMB Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat data: ' + error.message }, { status: 500 });
  }
}
