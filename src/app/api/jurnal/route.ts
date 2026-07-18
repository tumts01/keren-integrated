import { NextResponse } from 'next/server';
import { getPresensiDoc } from '@/lib/google-sheets';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, jamKe, kelas, mapel, guru, materi, tahunAjaran } = body;

    if (!tanggal || !jamKe || !kelas || !mapel || !materi) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const doc = await getPresensiDoc();
    const sheet = doc.sheetsByTitle['JURNAL MENGAJAR'];
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab JURNAL MENGAJAR tidak ditemukan di Spreadsheet' }, { status: 404 });
    }

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const id = crypto.randomUUID().substring(0, 8);

    await sheet.addRow({
      'ID': id,
      'TIMESTAMP': timestamp,
      'TANGGAL': tanggal,
      'JAM KE': jamKe,
      'TAHUN AJARAN': tahunAjaran || '-',
      'KELAS': kelas,
      'MAPEL': mapel,
      'NAMA GURU': guru || 'Unknown',
      'MATERI': materi
    });

    return NextResponse.json({ success: true, message: 'Jurnal berhasil disimpan' });
  } catch (error: any) {
    console.error('Submit Jurnal Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
