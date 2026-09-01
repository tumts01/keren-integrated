import { NextResponse } from 'next/server';
import { uploadFileToDrive } from '@/lib/google-drive';
import { supabase } from '@/lib/supabase';

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

    // Update Supabase
    const tableName = type === 'keluar' ? 'data_surat_keluar' : 'data_surat_masuk';
    const targetId = parseInt(rowNumber as string, 10);

    // Fetch existing metadata first
    const { data: existing, error: getErr } = await supabase.from(tableName).select('metadata').eq('id', targetId).single();

    if (getErr || !existing) {
      return NextResponse.json({ success: false, error: 'Baris surat tidak ditemukan di Database' }, { status: 404 });
    }

    const newMeta = {
      ...existing.metadata,
      'FILE/SCAN SURAT': fileUrl
    };

    const { error: updateErr } = await supabase.from(tableName).update({ metadata: newMeta }).eq('id', targetId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('POST Persuratan Upload Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengupload file: ' + error.message }, { status: 500 });
  }
}
