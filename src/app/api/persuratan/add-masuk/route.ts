import { NextResponse } from 'next/server';
import { uploadFileToDrive } from '@/lib/google-drive';
import { supabase } from '@/lib/supabase';

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

    const newRow = {
      'TANGGAL TERIMA': tanggal,
      'NAMA SURAT': namaSurat,
      'NAMA INSTANSI': asalSurat,
      'FILE/SCAN SURAT': fileUrl
    };

    const { error } = await supabase.from('data_surat_masuk').insert([{ metadata: newRow }]);

    if (error) throw error;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('POST Add Surat Masuk Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menambah surat masuk: ' + error.message }, { status: 500 });
  }
}
