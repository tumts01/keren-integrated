import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadFileToDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const nomorPeserta = formData.get('nomorPeserta') as string;
    const file = formData.get('buktiPembayaran') as File;

    if (!nomorPeserta || !file) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Ambil data peserta dari data_olimpiade_seni
    const { data: pendaftar, error: errCari } = await supabase
      .from('data_olimpiade_seni')
      .select('id, metadata')
      .filter('metadata->>NOMOR_PESERTA', 'eq', nomorPeserta)
      .single();

    if (errCari || !pendaftar) {
      return NextResponse.json({ success: false, error: 'Data pendaftar tidak ditemukan' }, { status: 404 });
    }

    // Upload file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const folderId = process.env.GOOGLE_DRIVE_OLIMPIADE_FOLDER_ID || '1XMpQqdTzx0i_WaD79AHdgzhRUUmgQX6z';
    const res = await uploadFileToDrive(buffer, `SusulanBayar_${nomorPeserta}_${file.name}`, file.type, folderId);
    const buktiUrl = res.webViewLink || '';

    if (!buktiUrl) throw new Error('Gagal mengunggah file ke Google Drive');

    // Update data pendaftar
    const newMetadata = {
      ...(pendaftar.metadata as object),
      STATUS_PEMBAYARAN: 'Menunggu Verifikasi'
    };

    const { error: errUpdate } = await supabase
      .from('data_olimpiade_seni')
      .update({ 
        bukti_pembayaran_url: buktiUrl,
        metadata: newMetadata
      })
      .eq('id', pendaftar.id);

    if (errUpdate) throw errUpdate;

    return NextResponse.json({ success: true, message: 'Bukti pembayaran berhasil diunggah' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
