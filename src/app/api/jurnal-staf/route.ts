import { NextResponse } from 'next/server';
import { getJurnalStafDoc } from '@/lib/google-sheets';

export async function GET() {
  try {
    const doc = await getJurnalStafDoc();
    const sheet = doc.sheetsByTitle['Form Responses 1'];
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab Form Responses 1 tidak ditemukan' }, { status: 404 });
    }

    const rows = await sheet.getRows();
    
    // Parse the date to sort descending, or just reverse the array
    const data = rows.map((row) => ({
      timestamp: row.get('Timestamp') || '',
      namaStaf: row.get('NAMA STAF') || '',
      kegiatan: row.get('KEGIATAN') || '',
      tanggal: row.get('TANGGAL') || '',
      mulaiDari: row.get('MULAI DARI') || '',
      sampaiDengan: row.get('SAMPAI DENGAN') || '',
      keterangan: row.get('KETERANGAN') || '',
      fotoKegiatan: row.get('FOTO KEGIATAN') || '',
    })).reverse(); // terbaru di atas

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'no-store, no-cache' }
    });
  } catch (error: any) {
    console.error('Fetch Jurnal Staf Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data dari Database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      namaStaf,
      kegiatan,
      tanggal,
      mulaiDari,
      sampaiDengan,
      keterangan,
      fotoKegiatan
    } = body;

    const doc = await getJurnalStafDoc();
    const sheet = doc.sheetsByTitle['Form Responses 1'];
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab Form Responses 1 tidak ditemukan' }, { status: 404 });
    }

    const now = new Date();
    // Format timestamp DD/MM/YYYY HH:MM:SS
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    await sheet.addRow({
      'Timestamp': timestamp,
      'NAMA STAF': namaStaf,
      'KEGIATAN': kegiatan,
      'TANGGAL': tanggal,
      'MULAI DARI': mulaiDari,
      'SAMPAI DENGAN': sampaiDengan,
      'KETERANGAN': keterangan,
      'FOTO KEGIATAN': fotoKegiatan || ''
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Submit Jurnal Staf Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan data ke Database' }, { status: 500 });
  }
}
