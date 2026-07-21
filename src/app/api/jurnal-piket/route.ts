import { NextResponse } from 'next/server';
import { getPresensiDoc } from '@/lib/google-sheets';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      tanggal, 
      petugasPiket, 
      guruIzin, 
      alasanIzin, 
      kelasDitinggalkan, 
      materi, 
      guruPengganti, 
      guruDispo 
    } = body;

    if (!tanggal || !petugasPiket) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap. Tanggal dan Petugas Piket wajib diisi.' }, { status: 400 });
    }

    const doc = await getPresensiDoc();
    const sheet = doc.sheetsByTitle['JURNAL PIKET'];
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab JURNAL PIKET tidak ditemukan di Google Sheets.' }, { status: 404 });
    }

    // Set header jika belum ada
    try {
      await sheet.loadHeaderRow();
    } catch (e) {
      // Jika error karena sheet kosong, set header
      await sheet.setHeaderRow([
        'ID',
        'TIMESTAMP',
        'TANGGAL',
        'PETUGAS PIKET',
        'GURU IZIN',
        'ALASAN IZIN',
        'KELAS DITINGGALKAN',
        'MATERI',
        'GURU PENGGANTI',
        'GURU DISPO'
      ]);
    }

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const id = crypto.randomUUID().substring(0, 8);

    await sheet.addRow({
      'ID': id,
      'TIMESTAMP': timestamp,
      'TANGGAL': tanggal,
      'PETUGAS PIKET': petugasPiket,
      'GURU IZIN': guruIzin || '-',
      'ALASAN IZIN': alasanIzin || '-',
      'KELAS DITINGGALKAN': kelasDitinggalkan || '-',
      'MATERI': materi || '-',
      'GURU PENGGANTI': guruPengganti || '-',
      'GURU DISPO': guruDispo || '-'
    }, { raw: true });

    return NextResponse.json({ success: true, message: 'Jurnal Piket berhasil disimpan' });
  } catch (error: any) {
    console.error('Submit Jurnal Piket Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
