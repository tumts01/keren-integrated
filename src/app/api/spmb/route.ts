import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

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
  'Nama Ibu',
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
    const doc = await getIndukDoc();
    
    let sheet = doc.sheetsByTitle['SPMB'];
    
    if (!sheet) {
      // If SPMB sheet doesn't exist, create it with headers
      sheet = await doc.addSheet({ title: 'SPMB', headerValues: SPMB_HEADERS });
    } else {
      // Check if it has headers
      try {
        await sheet.loadHeaderRow();
      } catch (err: any) {
        // "No values in the header row" error means it's empty
        await sheet.setHeaderRow(SPMB_HEADERS);
      }
    }

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // Add new row
    await sheet.addRow({
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
      'Nama Ibu': payload.namaIbu || '',
      'Nomor WA Ayah': payload.nomorWaAyah || '',
      'Nomor WA Ibu': payload.nomorWaIbu || '',
      'Alamat Lengkap': payload.alamatLengkap || '',
      'Prestasi (Jika Ada)': payload.prestasi || '',
      'File KK': payload.linkKk || '',
      'File Akta': payload.linkAkta || ''
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Submit SPMB Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses pendaftaran SPMB: ' + error.message }, { status: 500 });
  }
}
