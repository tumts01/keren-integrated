import { NextResponse } from 'next/server';
import { getNotulenDoc } from '@/lib/google-sheets';
import { uploadFileToDrive } from '@/lib/google-drive';

export async function GET() {
  try {
    const doc = await getNotulenDoc();
    const sheet = doc.sheetsByTitle['lpj kegiatan'];

    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab "lpj kegiatan" tidak ditemukan di Spreadsheet' }, { status: 404 });
    }

    await sheet.loadHeaderRow();
    const headers = sheet.headerValues.map(h => h?.toUpperCase().trim() || '');
    
    // Mapping Header Dinamis
    const hTanggal = headers.find(h => h.includes('TANGGAL')) || 'TANGGAL';
    const hNama = headers.find(h => h.includes('NAMA KEGIATAN')) || 'NAMA KEGIATAN';
    const hPj = headers.find(h => h.includes('PJ KEGIATAN')) || 'PJ KEGIATAN';
    const hFile = headers.find(h => h.includes('FILE') || h.includes('UPLOAD')) || 'FILE (UPLOAD)';

    const rows = await sheet.getRows();
    const data = rows.map((row, index) => {
      return {
        id: index,
        rowNumber: row.rowNumber,
        tanggal: row.get(hTanggal) || '',
        namaKegiatan: row.get(hNama) || '',
        pjKegiatan: row.get(hPj) || '',
        fileUpload: row.get(hFile) || ''
      };
    }).filter(item => item.namaKegiatan || item.pjKegiatan);

    return NextResponse.json({ 
      success: true, 
      data: data.reverse() // terbaru di atas
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error: any) {
    console.error('Fetch LPJ Kegiatan Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data LPJ Kegiatan: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const tanggal = formData.get('tanggal') as string;
    const namaKegiatan = formData.get('namaKegiatan') as string;
    const pjKegiatan = formData.get('pjKegiatan') as string;
    const file = formData.get('file') as File;

    if (!tanggal || !namaKegiatan || !pjKegiatan || !file) {
      return NextResponse.json({ success: false, error: 'Semua field dan file wajib diisi' }, { status: 400 });
    }

    const folderId = process.env.GOOGLE_DRIVE_PERSURATAN_FOLDER_ID;
    if (!folderId) {
      return NextResponse.json({ success: false, error: 'Folder ID Google Drive belum dikonfigurasi' }, { status: 500 });
    }

    // Upload to Google Drive
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const driveRes = await uploadFileToDrive(buffer, file.name, file.type, folderId);
    
    const fileUrl = driveRes.webViewLink;
    if (!fileUrl) {
      return NextResponse.json({ success: false, error: 'Gagal mendapatkan link dari Google Drive' }, { status: 500 });
    }

    // Save to Sheet
    const doc = await getNotulenDoc();
    const sheet = doc.sheetsByTitle['lpj kegiatan'];

    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab "lpj kegiatan" tidak ditemukan di Spreadsheet' }, { status: 404 });
    }

    await sheet.loadHeaderRow();
    const headers = sheet.headerValues.map(h => h?.toUpperCase().trim() || '');
    
    const hTanggal = headers.find(h => h.includes('TANGGAL')) || 'TANGGAL';
    const hNama = headers.find(h => h.includes('NAMA KEGIATAN')) || 'NAMA KEGIATAN';
    const hPj = headers.find(h => h.includes('PJ KEGIATAN')) || 'PJ KEGIATAN';
    const hFile = headers.find(h => h.includes('FILE') || h.includes('UPLOAD')) || 'FILE (UPLOAD)';

    const newRow = {
      [hTanggal]: tanggal,
      [hNama]: namaKegiatan,
      [hPj]: pjKegiatan,
      [hFile]: fileUrl
    };

    await sheet.addRow(newRow);

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('POST LPJ Kegiatan Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan LPJ Kegiatan: ' + error.message }, { status: 500 });
  }
}
