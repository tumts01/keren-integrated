import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadFileToDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

function stripInvisible(val: unknown): string {
  return (val ?? '')
    .toString()
    .replace(/[\u00A0\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\uFEFF]/g, '')
    .trim();
}

async function findPesertaByNomor(nomor: string) {
  const cleanNomor = stripInvisible(nomor).replace(/_FINAL$/i, '');
  const { data: exactRows } = await supabase
    .from('data_olimpiade_seni')
    .select('id, metadata, bukti_pembayaran_url')
    .in('jenis_pendaftaran', ['individu', 'peserta_kolektif'])
    .filter('metadata->>NOMOR_PESERTA', 'eq', cleanNomor)
    .limit(1);

  if (exactRows && exactRows.length > 0) return exactRows[0];

  const safeNomor = cleanNomor.replace(/[%_]/g, '');
  if (safeNomor) {
    const { data: ilikeRows } = await supabase
      .from('data_olimpiade_seni')
      .select('id, metadata, bukti_pembayaran_url')
      .in('jenis_pendaftaran', ['individu', 'peserta_kolektif'])
      .ilike('metadata->>NOMOR_PESERTA', `%${safeNomor}%`)
      .limit(10);

    const matched = (ilikeRows || []).find(
      (r: any) => stripInvisible(r.metadata?.NOMOR_PESERTA).toUpperCase() === cleanNomor.toUpperCase()
    );
    if (matched) return matched;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // 1. Aksi Admin via JSON (Validasi / Tolak Pembayaran Final)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { action, nomorPeserta } = body;

      if (!nomorPeserta) {
        return NextResponse.json({ success: false, error: 'Nomor peserta wajib diisi' }, { status: 400 });
      }

      const pendaftar = await findPesertaByNomor(nomorPeserta);
      if (!pendaftar) {
        return NextResponse.json({ success: false, error: 'Peserta tidak ditemukan' }, { status: 404 });
      }

      const statusTarget = action === 'tolak' ? 'Ditolak' : 'Valid';
      const newMetadata = {
        ...(pendaftar.metadata as object),
        STATUS_BAYAR_FINAL: statusTarget,
        VERIFIED_AT_FINAL: new Date().toISOString()
      };

      const { error: errUpdate } = await supabase
        .from('data_olimpiade_seni')
        .update({ metadata: newMetadata })
        .eq('id', pendaftar.id);

      if (errUpdate) throw errUpdate;

      return NextResponse.json({
        success: true,
        message: action === 'tolak'
          ? 'Pembayaran Babak Final ditandai Ditolak'
          : 'Pembayaran Babak Final berhasil divalidasi (Lunas)',
        status: statusTarget
      });
    }

    // 2. Upload Bukti Pembayaran oleh Siswa (FormData)
    const formData = await req.formData();
    const nomorPeserta = formData.get('nomorPeserta') as string;
    const file = formData.get('buktiPembayaran') as File;

    if (!nomorPeserta || !file) {
      return NextResponse.json({ success: false, error: 'Nomor peserta dan file bukti pembayaran wajib disertakan' }, { status: 400 });
    }

    const pendaftar = await findPesertaByNomor(nomorPeserta);
    if (!pendaftar) {
      return NextResponse.json({ success: false, error: 'Data pendaftar tidak ditemukan' }, { status: 404 });
    }

    // Upload file ke Google Drive
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const folderId = process.env.GOOGLE_DRIVE_OLIMPIADE_FOLDER_ID || '1XMpQqdTzx0i_WaD79AHdgzhRUUmgQX6z';
    const cleanNomor = stripInvisible(nomorPeserta).replace(/_FINAL$/i, '');
    const res = await uploadFileToDrive(buffer, `BayarFinal_${cleanNomor}_${file.name}`, file.type, folderId);
    const buktiUrl = res.webViewLink || '';

    if (!buktiUrl) throw new Error('Gagal mengunggah file ke Google Drive');

    // Update metadata peserta: tandai pembayaran Babak Final
    const nowIso = new Date().toISOString();
    const newMetadata = {
      ...(pendaftar.metadata as object),
      STATUS_BAYAR_FINAL: 'Menunggu Verifikasi',
      BUKTI_BAYAR_FINAL_URL: buktiUrl,
      WAKTU_BAYAR_FINAL: nowIso
    };

    const { error: errUpdate } = await supabase
      .from('data_olimpiade_seni')
      .update({ 
        metadata: newMetadata,
        // Simpan juga sebagai fallback jika belum pernah ada bukti pembayaran
        bukti_pembayaran_url: pendaftar.bukti_pembayaran_url || buktiUrl
      })
      .eq('id', pendaftar.id);

    if (errUpdate) throw errUpdate;

    return NextResponse.json({ 
      success: true, 
      message: 'Bukti pembayaran Babak Final berhasil diunggah. Menunggu verifikasi panitia.',
      bukti_url: buktiUrl,
      status: 'Menunggu Verifikasi',
      waktu_bayar: nowIso
    });
  } catch (error: any) {
    console.error('Error bayar CBT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
