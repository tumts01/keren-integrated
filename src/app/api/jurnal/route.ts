import { NextResponse } from 'next/server';
import { getPresensiDoc } from '@/lib/google-sheets';
import crypto from 'crypto';

export async function GET() {
  try {
    const doc = await getPresensiDoc();
    const sheet = doc.sheetsByTitle['JURNAL MENGAJAR'];
    if (!sheet) return NextResponse.json({ success: false, error: 'Sheet JURNAL MENGAJAR tidak ditemukan' }, { status: 404 });

    const rows = await sheet.getRows();
    const data = rows.map(row => ({
      id: row.get('ID') || '',
      timestamp: row.get('TIMESTAMP') || '',
      tanggal: row.get('TANGGAL') || '',
      jamKe: row.get('JAM KE') || '',
      tahunAjaran: row.get('TAHUN AJARAN') || '',
      kelas: row.get('KELAS') || '',
      mapel: row.get('MAPEL') || '',
      namaGuru: row.get('NAMA GURU') || '',
      materi: row.get('MATERI') || '',
    })).filter(r => r.tanggal || r.materi).reverse(); // terbaru dulu

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('GET Jurnal Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

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
