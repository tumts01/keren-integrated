import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 400 });
    }

    const folderId = process.env.GOOGLE_DRIVE_SPMB_FOLDER_ID;
    const uploadUrl = process.env.GOOGLE_APPS_SCRIPT_UPLOAD_URL;

    if (!folderId || !uploadUrl) {
      return NextResponse.json({ success: false, error: 'Konfigurasi Google Drive untuk SPMB belum lengkap' }, { status: 500 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64File = buffer.toString('base64');
    
    // We send payload as JSON since GAS doPost typically expects JSON for this setup
    const payload = {
      filename: file.name,
      mimeType: file.type,
      data: base64File,
      folderId: folderId
    };

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const resultText = await response.text();
    let result;
    try {
      result = JSON.parse(resultText);
    } catch (e) {
      console.error('GAS HTML Error Response:', resultText);
      return NextResponse.json({ success: false, error: 'Respon invalid dari Google Apps Script' }, { status: 500 });
    }

    if (result.success && result.url) {
      return NextResponse.json({ success: true, link: result.url });
    } else {
      return NextResponse.json({ success: false, error: result.message || 'Gagal mengunggah ke Google Drive' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('SPMB Upload Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan sistem saat upload file' }, { status: 500 });
  }
}
