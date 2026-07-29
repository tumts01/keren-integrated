import { NextResponse } from 'next/server';
import { getPersuratanDoc } from '@/lib/google-sheets';
import { uploadFileToDrive } from '@/lib/google-drive';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const tanggal = formData.get('tanggal') as string;
    const namaSurat = formData.get('namaSurat') as string;
    const asalSurat = formData.get('asalSurat') as string;
    const file = formData.get('file') as File;

    if (!tanggal || !namaSurat || !asalSurat || !file) {
      return NextResponse.json({ success: false, error: 'Semua field dan file wajib diisi' }, { status: 400 });
    }

    const folderId = process.env.GOOGLE_DRIVE_PERSURATAN_FOLDER_ID;
    if (!folderId) {
      return NextResponse.json({ success: false, error: 'Folder ID Google Drive belum dikonfigurasi' }, { status: 500 });
    }

    // Read the file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Google Drive
    const driveRes = await uploadFileToDrive(buffer, file.name, file.type, folderId);
    
    // Get the sharable link
    const fileUrl = driveRes.webViewLink;

    if (!fileUrl) {
      return NextResponse.json({ success: false, error: 'Gagal mendapatkan link dari Google Drive' }, { status: 500 });
    }

    // Update Spreadsheet
    const doc = await getPersuratanDoc();
    const sheet = doc.sheetsByTitle['ARSIP SURAT MASUK'];

    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab ARSIP SURAT MASUK tidak ditemukan di Spreadsheet' }, { status: 404 });
    }

    await sheet.loadHeaderRow();
    const headers = sheet.headerValues.map(h => h?.toUpperCase().trim() || '');

    // Map headers intelligently
    const headerTanggal = headers.find(h => h.includes('TANGGAL') || h.includes('TGL')) || 'TANGGAL TERIMA';
    const headerNamaSurat = headers.find(h => h.includes('NAMA SURAT') || h.includes('PERIHAL') || h.includes('RINGKAS')) || 'NAMA SURAT';
    const headerAsalSurat = headers.find(h => h.includes('ASAL') || h.includes('PENGIRIM')) || 'ASAL SURAT';
    const headerFile = headers.find(h => h.includes('FILE') || h.includes('SCAN')) || 'FILE/SCAN SURAT';

    const newRow = {
      [headerTanggal]: tanggal,
      [headerNamaSurat]: namaSurat,
      [headerAsalSurat]: asalSurat,
      [headerFile]: fileUrl
    };

    await sheet.addRow(newRow);

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('POST Add Surat Masuk Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menambah surat masuk: ' + error.message }, { status: 500 });
  }
}
