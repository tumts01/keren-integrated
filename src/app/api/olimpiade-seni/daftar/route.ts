import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadFileToDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const jenisPendaftaran = formData.get('jenisPendaftaran') as string;
    
    // Bukti Pembayaran
    const buktiFile = formData.get('buktiPembayaran') as File | null;
    let buktiUrl = '';

    // Folder ID Google Drive
    const folderId = process.env.GOOGLE_DRIVE_OLIMPIADE_FOLDER_ID || '1XMpQqdTzx0i_WaD79AHdgzhRUUmgQX6z';

    if (buktiFile) {
      const arrayBuffer = await buktiFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const res = await uploadFileToDrive(buffer, buktiFile.name, buktiFile.type, folderId);
      buktiUrl = res.webViewLink || '';
    } else {
      return NextResponse.json({ success: false, error: 'Bukti pembayaran wajib dilampirkan' }, { status: 400 });
    }

    let fileExcelUrl = '';
    let metadata: any = {};

    if (jenisPendaftaran === 'kolektif') {
      const excelFile = formData.get('fileExcel') as File | null;
      if (!excelFile) {
        return NextResponse.json({ success: false, error: 'File Excel wajib dilampirkan untuk pendaftaran kolektif' }, { status: 400 });
      }
      
      const arrayBuffer = await excelFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const res = await uploadFileToDrive(buffer, excelFile.name, excelFile.type, folderId);
      fileExcelUrl = res.webViewLink || '';
      
      metadata = {
        'ASAL_SEKOLAH': formData.get('namaSekolah') || '',
        'LOMBA_DIPILIH': formData.get('detailLomba') || '',
        'WAKTU_DAFTAR': new Date().toISOString(),
        'REKAP_PESERTA': JSON.parse((formData.get('rekapPesertaExcel') as string) || '{}')
      };
      
    } else if (jenisPendaftaran === 'individu') {
      metadata = {
        'NAMA': formData.get('nama') || '',
        'NISN': formData.get('nisn') || '',
        'KELAS': formData.get('kelas') || '',
        'ASAL_SEKOLAH': formData.get('namaSekolah') || '',
        'NPSN': formData.get('npsn') || '',
        'KATEGORI': formData.get('kategori') || '',
        'LOMBA_DIPILIH': formData.get('lombaDipilih') || '',
        'NAMA_REGU': formData.get('namaRegu') || '',
        'NO_HP': formData.get('noHp') || '',
        'WAKTU_DAFTAR': new Date().toISOString()
      };
    } else {
      return NextResponse.json({ success: false, error: 'Jenis pendaftaran tidak valid' }, { status: 400 });
    }

    // Insert ke Supabase
    const { data, error } = await supabase.from('data_olimpiade_seni').insert([{
      jenis_pendaftaran: jenisPendaftaran,
      bukti_pembayaran_url: buktiUrl,
      file_excel_url: fileExcelUrl || null,
      metadata
    }]);

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Pendaftaran berhasil disimpan!' });

  } catch (error: any) {
    console.error('POST Pendaftaran Olimpiade Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan sistem: ' + error.message }, { status: 500 });
  }
}
