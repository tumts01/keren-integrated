import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function GET() {
  try {
    const doc = await getIndukDoc();
    const sheet = doc.sheetsByTitle['DATABASE'];
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab DATABASE tidak ditemukan' }, { status: 404 });
    }

    const rows = await sheet.getRows();
    
    // Helper untuk mengubah link gdrive menjadi raw image link
    const getImageUrl = (url: string) => {
      if (!url) return '';
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (url.includes('drive.google.com') && match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}=w200-h200`;
      }
      return url;
    };

    // Map data to array of objects
    const data = rows.map((row, index) => {
      const nama = row.get('NAMA') || '';
      const rawFoto = row.get('LINK FOTO TERBARU') || '';
      const foto = getImageUrl(rawFoto);
      
      const noHpAyah = row.get('NOMOR TELEPON AYAH KANDUNG') || '';
      const noHpIbu = row.get('NOMOR TELEPON IBU KANDUNG') || '';
      let noHp = noHpAyah;
      if (!noHp && noHpIbu) noHp = noHpIbu;
      else if (noHp && noHpIbu && noHp !== noHpIbu) noHp += ` / ${noHpIbu}`;

      return {
        id: index,
        no: row.get('NO') || (index + 1).toString(),
        nisn: row.get('NISN') || '',
        nama,
        foto,
        jenisKelamin: row.get('JENIS KELAMIN') || '',
        rombel: row.get('ROMBEL') || '',
        status: row.get('STATUS SISWA') || '',
        domisili: row.get('DOMISILI') || '',
        alamat: row.get('ALAMAT AYAH KANDUNG') || '',
        namaAyah: row.get('NAMA AYAH KANDUNG') || '',
        namaIbu: row.get('NAMA IBU KANDUNG') || '',
        noHp,
        tahunAjaran: row.get('TAHUN AJARAN') || ''
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch Siswa Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data dari Database' }, { status: 500 });
  }
}
