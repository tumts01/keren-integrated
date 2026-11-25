import { NextResponse } from 'next/server';
import { uploadFileToDrive } from '@/lib/google-drive';
import {
  MAX_UPLOAD_DOC_BYTES,
  isValidImageMagicBytes,
  isValidPdfMagicBytes
} from '@/lib/upload-security';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_DOC_BYTES) {
      return NextResponse.json({
        success: false,
        error: 'Ukuran berkas terlalu besar! Maksimal ukuran foto/dokumen adalah 10 MB.'
      }, { status: 413 });
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

    // Validasi isi biner (magic bytes) agar berkas berbahaya tidak bisa menyamar memakai ekstensi JPG/PNG/PDF
    const validBinary = (isImage && isValidImageMagicBytes(buffer)) || (isPdf && isValidPdfMagicBytes(buffer));
    if (!validBinary) {
      return NextResponse.json({
        success: false,
        error: 'Isi berkas tidak sesuai dengan format foto/PDF yang valid.'
      }, { status: 400 });
    }
    
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
