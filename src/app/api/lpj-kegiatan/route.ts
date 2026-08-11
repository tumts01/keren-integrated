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

    try {
      await sheet.loadHeaderRow();
    } catch (e) {
      await sheet.setHeaderRow(['TANGGAL', 'NAMA KEGIATAN', 'PJ KEGIATAN', 'FILE (UPLOAD)']);
      await sheet.loadHeaderRow();
    }
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
    const body = await req.json();
    const { tanggal, namaKegiatan, pjKegiatan, fileLink } = body;

    if (!tanggal || !namaKegiatan || !pjKegiatan || !fileLink) {
      return NextResponse.json({ success: false, error: 'Semua field dan link wajib diisi' }, { status: 400 });
    }

    // Save to Sheet
    const doc = await getNotulenDoc();
    const sheet = doc.sheetsByTitle['lpj kegiatan'];

    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab "lpj kegiatan" tidak ditemukan di Spreadsheet' }, { status: 404 });
    }

    try {
      await sheet.loadHeaderRow();
    } catch (e) {
      await sheet.setHeaderRow(['TANGGAL', 'NAMA KEGIATAN', 'PJ KEGIATAN', 'FILE (UPLOAD)']);
      await sheet.loadHeaderRow();
    }
    const headers = sheet.headerValues.map(h => h?.toUpperCase().trim() || '');
    
    const hTanggal = headers.find(h => h.includes('TANGGAL')) || 'TANGGAL';
    const hNama = headers.find(h => h.includes('NAMA KEGIATAN')) || 'NAMA KEGIATAN';
    const hPj = headers.find(h => h.includes('PJ KEGIATAN')) || 'PJ KEGIATAN';
    const hFile = headers.find(h => h.includes('FILE') || h.includes('UPLOAD')) || 'FILE (UPLOAD)';

    const newRow = {
      [hTanggal]: tanggal,
      [hNama]: namaKegiatan,
      [hPj]: pjKegiatan,
      [hFile]: fileLink
    };

    await sheet.addRow(newRow);

    return NextResponse.json({ success: true, url: fileLink });
  } catch (error: any) {
    console.error('POST LPJ Kegiatan Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan LPJ Kegiatan: ' + error.message }, { status: 500 });
  }
}
