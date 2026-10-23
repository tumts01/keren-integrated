import { NextResponse } from 'next/server';
import { uploadFileToDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

const FOLDER_ID = process.env.GOOGLE_DRIVE_LOKER_GTK_FOLDER_ID || '17VLruiXLMYLr9cBIYQ6pvj13yDaZ868I';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Bersihkan nama file dari karakter khusus/spasi/koma agar aman di serverless & Google Drive
    const cleanFileName = (file.name || 'berkas')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');

    const result = await uploadFileToDrive(buffer, cleanFileName, file.type || 'application/octet-stream', FOLDER_ID);

    return NextResponse.json({ 
      success: true, 
      url: result.webViewLink, 
      id: result.id 
    });
  } catch (error: any) {
    console.error('Upload Laporan Diklat Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal upload file: ' + error.message }, { status: 500 });
  }
}
