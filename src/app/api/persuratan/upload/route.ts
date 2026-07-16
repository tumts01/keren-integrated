import { NextResponse } from 'next/server';
import { getPersuratanDoc } from '@/lib/google-sheets';
import { uploadFileToDrive } from '@/lib/google-drive';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const rowNumber = formData.get('rowNumber');
    const type = formData.get('type') as string; // 'keluar' or 'masuk'

    if (!file || !rowNumber || !type) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap (file, rowNumber, atau type hilang)' }, { status: 400 });
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
    const sheetName = type === 'keluar' ? 'NO SURAT KELUAR' : 'ARSIP SURAT MASUK';
    const sheet = doc.sheetsByTitle[sheetName];

    if (!sheet) {
      return NextResponse.json({ success: false, error: `Tab ${sheetName} tidak ditemukan di Spreadsheet` }, { status: 404 });
    }

    const rows = await sheet.getRows();
    const targetRow = rows.find(r => r.rowNumber === parseInt(rowNumber as string, 10));

    if (!targetRow) {
      return NextResponse.json({ success: false, error: 'Baris surat tidak ditemukan di Spreadsheet' }, { status: 404 });
    }

    // Set the file URL to the column
    targetRow.set('FILE/SCAN SURAT', fileUrl);
    await targetRow.save();

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('POST Persuratan Upload Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengupload file: ' + error.message }, { status: 500 });
  }
}
