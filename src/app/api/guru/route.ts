import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function GET() {
  try {
    const doc = await getIndukDoc();
    const sheet = doc.sheetsByTitle['db_GTK'];
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab db_GTK tidak ditemukan' }, { status: 404 });
    }

    const rows = await sheet.getRows();
    
    // Map data to array of objects
    const data = rows.map((row, index) => {
      return {
        id: index,
        nama: row.get('Nama') || '',
        status: row.get('Status') || '',
        nip: row.get('NIP') || '',
        pegId: row.get('PEG ID') || '',
        passEmisHijau: row.get('Pass EMIS Hijau') || '',
        passEmisDev: row.get('Pass EMIS DEV') || '',
        jenisKelamin: row.get('Jenis Kelamin') || '',
        jabatan: row.get('Jabatan') || '',
        tempatLahir: row.get('Tempat Lahir') || '',
        tanggalLahir: row.get('Tanggal Lahir') || '',
        nik: row.get('NIK') || '',
        noHp: row.get('No WA') || '',
        alamat: row.get('Alamat') || '',
        tanggalSk: row.get('Tanggal SK Awal') || '',
        email: row.get('Email') || ''
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch Guru Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data dari Database' }, { status: 500 });
  }
}
