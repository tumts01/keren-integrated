import { NextResponse } from 'next/server';
import { uploadFileToDrive } from '@/lib/google-drive';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 400 });
    }

    // Tolak secara tegas jika file berupa VIDEO
    const fileName = (file.name || '').toLowerCase();
    const fileType = (file.type || '').toLowerCase();
    const isVideo = fileType.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|3gp|wmv|flv|m4v|mpg|mpeg)$/i.test(fileName);

    if (isVideo) {
      return NextResponse.json({
        success: false,
        error: 'Upload berkas video ditolak! Berkas Kartu Keluarga dan bukti persyaratan hanya boleh berupa foto dokumen (JPG/PNG) atau scan PDF.'
      }, { status: 400 });
    }

    // Hanya izinkan Foto/Gambar dan Dokumen PDF
    const isImage = fileType.startsWith('image/') || /\.(jpe?g|png|webp|heic|bmp)$/i.test(fileName);
    const isPdf = fileType === 'application/pdf' || /\.pdf$/i.test(fileName);

    if (!isImage && !isPdf) {
      return NextResponse.json({
        success: false,
        error: 'Format berkas tidak didukung! Hanya diperbolehkan foto dokumen (JPG/PNG) atau file PDF.'
      }, { status: 400 });
    }

    const folderId = process.env.GOOGLE_DRIVE_SPMB_FOLDER_ID;

    if (!folderId) {
      return NextResponse.json({ success: false, error: 'Konfigurasi Google Drive untuk SPMB belum lengkap' }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload using our centralized Google Drive / GAS bridge
    const driveRes = await uploadFileToDrive(buffer, file.name, file.type, folderId);
    
    if (driveRes && driveRes.webViewLink) {
      return NextResponse.json({ success: true, link: driveRes.webViewLink });
    } else {
      return NextResponse.json({ success: false, error: 'Gagal mendapatkan link dari Google Drive' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('SPMB Upload Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan saat mengunggah: ' + error.message }, { status: 500 });
  }
}
