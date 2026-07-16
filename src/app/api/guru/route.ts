import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function GET() {
  try {
    const doc = await getIndukDoc();
    const sheet = doc.sheetsByTitle['db_GTK'];
    const sheetUsers = doc.sheetsByTitle['Users']; // Ambil data users untuk foto
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab db_GTK tidak ditemukan' }, { status: 404 });
    }

    const rows = await sheet.getRows();
    
    // Buat pemetaan foto dari tab Users berdasarkan Nama
    const userPhotos: Record<string, string> = {};
    if (sheetUsers) {
      const userRows = await sheetUsers.getRows();
      userRows.forEach(uRow => {
        const uNama = uRow.get('Nama');
        const uFoto = uRow.get('Foto');
        if (uNama && uFoto) {
          userPhotos[uNama.trim().toLowerCase()] = uFoto;
        }
      });
    }

    // Helper untuk mengubah link gdrive menjadi raw image link
    const getImageUrl = (url: string) => {
      if (!url) return '';
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (url.includes('drive.google.com') && match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}=w200-h200`;
      }
      return url;
    };

    // Map data to array of objects
    const data = rows.map((row, index) => {
      const nama = row.get('Nama') || '';
      const rawFoto = userPhotos[nama.trim().toLowerCase()] || '';
      const foto = getImageUrl(rawFoto);

      return {
        id: index,
        nama,
        foto,
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
