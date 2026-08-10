import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

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
        nis: row.get('ID SISWA') || '',
        nisn: row.get('NISN') || '',
        nik: row.get('NIK') || '',
        nrp: row.get('NRP') || '',
        tempatLahir: (row.get('TEMPAT, TANGGAL LAHIR') || '').split(',')[0]?.trim() || '',
        tanggalLahir: (row.get('TEMPAT, TANGGAL LAHIR') || '').split(',').slice(1).join(',')?.trim() || '',
        nama,
        foto,
        jenisKelamin: row.get('JENIS KELAMIN') || '',
        status: row.get('STATUS SISWA') || '',
        domisili: row.get('DOMISILI') || '',
        alamat: row.get('ALAMAT AYAH KANDUNG') || '',
        namaAyah: row.get('NAMA AYAH KANDUNG') || '',
        namaIbu: row.get('NAMA IBU KANDUNG') || '',
        pekerjaanAyah: row.get('PEKERJAAN AYAH KANDUNG') || '',
        pekerjaanIbu: row.get('PEKERJAAN IBU KANDUNG') || '',
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

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'no-store, no-cache' }
    });
  } catch (error: any) {
    console.error('Fetch Siswa Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data dari Database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kelas, ...fields } = body;
    // kelas: '7' | '8' | '9'

    const doc = await getIndukDoc();
    const sheet = doc.sheetsByTitle['DATABASE'];
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab DATABASE tidak ditemukan' }, { status: 404 });
    }

    await sheet.loadHeaderRow();
    const headers = sheet.headerValues; // array nama kolom

    // Buat map: nama kolom → nilai
    const rowData: Record<string, string> = {
      'ID SISWA':                   fields.nis || '',
      'NISN':                       fields.nisn || '',
      'NIK':                        fields.nik || '',
      'NAMA':                       fields.nama || '',
      'JENIS KELAMIN':              fields.jenisKelamin || '',
      'TEMPAT, TANGGAL LAHIR':     `${fields.tempatLahir || ''}, ${fields.tanggalLahir || ''}`,
      'DOMISILI':                   fields.domisili || '',
      'ALAMAT AYAH KANDUNG':        fields.alamat || '',
      'NAMA AYAH KANDUNG':          fields.namaAyah || '',
      'NAMA IBU KANDUNG':           fields.namaIbu || '',
      'PEKERJAAN AYAH KANDUNG':     fields.pekerjaanAyah || '',
      'PEKERJAAN IBU KANDUNG':      fields.pekerjaanIbu || '',
      'NOMOR TELEPON AYAH KANDUNG': fields.noHpAyah || '',
      'NOMOR TELEPON IBU KANDUNG':  fields.noHpIbu || '',
      'STATUS SISWA':               'Aktif',
      [`TA KELAS ${kelas}`]:        fields.tahunAjaran || '',
      [`ROMBEL KELAS ${kelas}`]:    fields.rombel || '',
      'NOMOR SURAT MUTASI MASUK': fields.noSuratMutasiMasuk || '',
      'SMP/MTs SEBELUMNYA': fields.sekolahSebelumnya || '',
      'NPSN/NSS/NSM SMP/MTs SEBELUMNYA': fields.npsnSekolahSebelumnya || '',
      'TANGGAL MUTASI MASUK': fields.tanggalMutasiMasuk || '',
    };

    // Asal SD/MI diarahkan ke kolom AY (index 50)
    if (fields.asalSekolah && headers[50]) {
      rowData[headers[50]] = fields.asalSekolah;
    }

    // Sisipkan baris kosong di row index 1 (baris ke-2, tepat di bawah header)
    await sheet.insertDimension('ROWS', { startIndex: 1, endIndex: 2 }, false);

    // Muat sel baris ke-2 (index 1)
    await sheet.loadCells({ startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: headers.length });

    // Isi nilai per kolom
    headers.forEach((header, colIndex) => {
      const val = rowData[header];
      if (val !== undefined && val !== '') {
        const cell = sheet.getCell(1, colIndex);
        cell.value = val;
      }
    });

    // Simpan
    await sheet.saveUpdatedCells();

    return NextResponse.json({ success: true, message: 'Siswa mutasi masuk berhasil ditambahkan.' });
  } catch (error: any) {
    console.error('POST Siswa Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menyimpan data siswa' }, { status: 500 });
  }
}
