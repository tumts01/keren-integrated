import { NextResponse } from 'next/server';
import { uploadFileToDrive } from '@/lib/google-drive';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;

    if (!file || !folderId) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap (file atau folderId hilang)' }, { status: 400 });
    }

    // Read the file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Google Drive to the specific teacher's folder
    const driveRes = await uploadFileToDrive(buffer, file.name, file.type, folderId);
    
    // Get the sharable link
    const fileUrl = driveRes.webViewLink;

    if (!fileUrl) {
      return NextResponse.json({ success: false, error: 'Gagal mendapatkan link upload dari Google Drive' }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('POST Loker Upload Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengupload file: ' + error.message }, { status: 500 });
  }
}
