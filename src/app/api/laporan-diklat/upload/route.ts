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
    const result = await uploadFileToDrive(buffer, file.name, file.type, FOLDER_ID);

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
