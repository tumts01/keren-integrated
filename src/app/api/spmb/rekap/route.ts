import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function GET() {
  try {
    const doc = await getIndukDoc();
    const sheet = doc.sheetsByTitle['SPMB'];

    if (!sheet) {
      return NextResponse.json({ success: true, data: [] });
    }

    const rows = await sheet.getRows();
    const data = rows.map((row, index) => {
      return {
        id: index,
        rowNumber: row.rowNumber,
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
    }).filter(item => item.namaLengkap !== ''); // filter out empty rows

    // Reverse to show newest first
    return NextResponse.json({ success: true, data: data.reverse() });

  } catch (error: any) {
    console.error('Fetch SPMB Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data SPMB: ' + error.message }, { status: 500 });
  }
}
