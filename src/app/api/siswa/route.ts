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

    // Map data to array of objects and expand historical records
    const data = rows.flatMap((row, index) => {
      const nama = row.get('NAMA') || '';
      const rawFoto = row.get('LINK FOTO TERBARU') || '';
      const foto = getImageUrl(rawFoto);
      
      const noHpAyah = row.get('NOMOR TELEPON AYAH KANDUNG') || '';
      const noHpIbu = row.get('NOMOR TELEPON IBU KANDUNG') || '';
      
      let noHp = '';
      if (noHpAyah && noHpIbu && noHpAyah !== noHpIbu) {
        noHp = `${noHpAyah} / ${noHpIbu}`;
      } else {
        noHp = noHpAyah || noHpIbu || '';
      }

      const baseStudent = {
        id: index,
        nisn: row.get('NISN') || '',
        nama,
        foto,
        jenisKelamin: row.get('JENIS KELAMIN') || '',
        status: row.get('STATUS SISWA') || '',
        domisili: row.get('DOMISILI') || '',
        alamat: row.get('ALAMAT AYAH KANDUNG') || '',
        namaAyah: row.get('NAMA AYAH KANDUNG') || '',
        namaIbu: row.get('NAMA IBU KANDUNG') || '',
        noHp,
      };

      const records = [];
      const ta7 = (row.get('TA KELAS 7') || '').trim();
      const rombel7 = (row.get('ROMBEL KELAS 7') || '').trim();
      if (ta7 && rombel7) records.push({ ...baseStudent, tahunAjaran: ta7, rombel: rombel7, isLatest: false });

      const ta8 = (row.get('TA KELAS 8') || '').trim();
      const rombel8 = (row.get('ROMBEL KELAS 8') || '').trim();
      if (ta8 && rombel8) records.push({ ...baseStudent, tahunAjaran: ta8, rombel: rombel8, isLatest: false });

      const ta9 = (row.get('TA KELAS 9') || '').trim();
      const rombel9 = (row.get('ROMBEL KELAS 9') || '').trim();
      if (ta9 && rombel9) records.push({ ...baseStudent, tahunAjaran: ta9, rombel: rombel9, isLatest: false });

      if (records.length === 0) {
        records.push({
          ...baseStudent,
          tahunAjaran: (row.get('TAHUN AJARAN') || '').trim(),
          rombel: (row.get('ROMBEL') || '').trim(),
          isLatest: true
        });
      } else {
        records[records.length - 1].isLatest = true;
      }

      return records;
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch Siswa Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data dari Database' }, { status: 500 });
  }
}
