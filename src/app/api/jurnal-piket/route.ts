import { NextResponse } from 'next/server';
import { getPresensiDoc } from '@/lib/google-sheets';
import crypto from 'crypto';

export async function GET() {
  try {
    const doc = await getPresensiDoc();
    const sheet = doc.sheetsByTitle['JURNAL PIKET'];
    if (!sheet) return NextResponse.json({ success: false, error: 'Sheet JURNAL PIKET tidak ditemukan' }, { status: 404 });

    const rows = await sheet.getRows();
    const data = rows.map(row => ({
      id: row.get('ID') || '',
      timestamp: row.get('TIMESTAMP') || '',
      tanggal: row.get('TANGGAL') || '',
      petugasPiket: row.get('PETUGAS PIKET') || '',
      guruIzin: row.get('GURU IZIN') || '',
      alasanIzin: row.get('ALASAN IZIN') || '',
      kelasDitinggalkan: row.get('KELAS DITINGGALKAN') || '',
      materi: row.get('MATERI') || '',
      guruPengganti: row.get('GURU PENGGANTI') || '',
      guruDispo: row.get('GURU DISPO') || '',
    })).filter(r => r.tanggal || r.petugasPiket).reverse();

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('GET Jurnal Piket Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tanggal, 
      petugasPiket, 
      guruDispo,
      entries
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
    
    if (!entries || entries.length === 0) {
      // Jika tidak ada data guru yang izin, tetap simpan satu baris laporan piket nihil
      const id = crypto.randomUUID().substring(0, 8);
      await sheet.addRow({
        'ID': id,
        'TIMESTAMP': timestamp,
        'TANGGAL': tanggal,
        'PETUGAS PIKET': petugasPiket,
        'GURU IZIN': 'NIHIL',
        'ALASAN IZIN': '-',
        'KELAS DITINGGALKAN': '-',
        'MATERI': '-',
        'GURU PENGGANTI': '-',
        'GURU DISPO': guruDispo || '-'
      }, { raw: true });
    } else {
      // Gabungkan semua entri guru izin menjadi 1 baris (pemisah ' | ')
      const id = crypto.randomUUID().substring(0, 8);
      const guruIzinArr = entries.map((e: any) => e.guruIzin || '-');
      const alasanArr = entries.map((e: any) => e.alasanIzin || '-');
      const kelasArr = entries.map((e: any) => e.kelasDitinggalkan || '-');
      const materiArr = entries.map((e: any) => e.materi || '-');
      const penggantiArr = entries.map((e: any) => e.guruPengganti || '-');

      await sheet.addRow({
        'ID': id,
        'TIMESTAMP': timestamp,
        'TANGGAL': tanggal,
        'PETUGAS PIKET': petugasPiket,
        'GURU IZIN': guruIzinArr.join(' | '),
        'ALASAN IZIN': alasanArr.join(' | '),
        'KELAS DITINGGALKAN': kelasArr.join(' | '),
        'MATERI': materiArr.join(' | '),
        'GURU PENGGANTI': penggantiArr.join(' | '),
        'GURU DISPO': guruDispo || '-'
      }, { raw: true });
    }

    return NextResponse.json({ success: true, message: 'Jurnal Piket berhasil disimpan' });
  } catch (error: any) {
    console.error('Submit Jurnal Piket Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
