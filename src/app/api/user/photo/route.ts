import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadFileToDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const username = String(formData.get('username') || '').trim();
    const nama = String(formData.get('nama') || '').trim();

    if (!file) {
      return NextResponse.json({ success: false, error: 'File foto wajib dipilih' }, { status: 400 });
    }

    if (!username && !nama) {
      return NextResponse.json({ success: false, error: 'Identitas user (username/nama) tidak ditemukan' }, { status: 400 });
    }

    // 1. Cari user di tabel data_users
    let query = supabase.from('data_users').select('*');
    if (username && nama) {
      query = query.or(`username.ilike.${username},metadata->>Username.ilike.${username},nama.ilike.${nama}`);
    } else if (username) {
      query = query.or(`username.ilike.${username},metadata->>Username.ilike.${username}`);
    } else {
      query = query.ilike('nama', nama);
    }

    const { data: rows, error: findErr } = await query;
    if (findErr) throw findErr;

    const userRow = (rows || []).find((r: any) => {
      const uCol = String(r.username || '').toLowerCase().trim();
      const uMeta = String(r.metadata?.['Username'] || '').toLowerCase().trim();
      const nCol = String(r.nama || r.metadata?.['Nama'] || '').toLowerCase().trim();
      if (username && (uCol === username.toLowerCase() || uMeta === username.toLowerCase())) return true;
      if (nama && nCol === nama.toLowerCase()) return true;
      return false;
    });

    if (!userRow) {
      return NextResponse.json({ success: false, error: 'Data akun user tidak ditemukan di database' }, { status: 404 });
    }

    // 2. Upload file foto ke Google Drive
    const folderId =
      process.env.GOOGLE_DRIVE_LOKER_GTK_FOLDER_ID ||
      process.env.GOOGLE_DRIVE_SPMB_FOLDER_ID ||
      process.env.GOOGLE_DRIVE_PERSURATAN_FOLDER_ID ||
      '';

    if (!folderId) {
      return NextResponse.json({ success: false, error: 'Konfigurasi folder Google Drive belum tersedia' }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const cleanName = (userRow.nama || username || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `FOTO_PROFIL_${cleanName}_${Date.now()}.${ext}`;

    const driveRes = await uploadFileToDrive(buffer, fileName, file.type || 'image/jpeg', folderId);
    const webViewLink = driveRes.webViewLink;
    const fileId = driveRes.id;

    if (!webViewLink) {
      return NextResponse.json({ success: false, error: 'Gagal mendapatkan link foto dari Google Drive' }, { status: 500 });
    }

    const thumbnailUrl = fileId
      ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h400`
      : webViewLink;

    // 3. Simpan link foto baru ke metadata data_users
    const updatedMetadata = {
      ...(userRow.metadata || {}),
      'Foto': webViewLink
    };

    const { error: updateErr } = await supabase
      .from('data_users')
      .update({ metadata: updatedMetadata })
      .eq('id', userRow.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: 'Foto profil berhasil diperbarui!',
      foto: thumbnailUrl,
      rawFoto: webViewLink
    });
  } catch (error: any) {
    console.error('Upload Profile Photo Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengubah foto profil' },
      { status: 500 }
    );
  }
}
