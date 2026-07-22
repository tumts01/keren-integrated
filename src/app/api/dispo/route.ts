import { NextResponse } from 'next/server';
import { getPresensiDoc } from '@/lib/google-sheets';
import crypto from 'crypto';

export async function GET() {
  try {
    const doc = await getPresensiDoc();
    const sheet = doc.sheetsByTitle['DISPO SISWA'];
    if (!sheet) return NextResponse.json({ success: false, error: 'Sheet DISPO SISWA tidak ditemukan' }, { status: 404 });

    const rows = await sheet.getRows();
    const data = rows.map(row => ({
      id: row.get('ID') || '',
      timestamp: row.get('TIMESTAMP') || '',
      tanggal: row.get('TANGGAL') || '',
      jamKedatangan: row.get('JAM KEDATANGAN') || '',
      kelas: row.get('KELAS') || '',
      namaSiswa: row.get('NAMA SISWA') || '',
      alasanTerlambat: row.get('ALASAN TERLAMBAT') || '',
      petugasDispo: row.get('PETUGAS DISPO') || ''
    })).filter(r => r.tanggal).reverse();

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('GET Dispo Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, jamKedatangan, kelas, namaSiswa, alasanTerlambat, petugasDispo } = body;

    if (!tanggal || !jamKedatangan || !kelas || !namaSiswa || !alasanTerlambat) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const doc = await getPresensiDoc();
    const sheet = doc.sheetsByTitle['DISPO SISWA'];
    if (!sheet) return NextResponse.json({ success: false, error: 'Tab DISPO SISWA tidak ditemukan' }, { status: 404 });

    // Set headers if empty
    await sheet.loadHeaderRow().catch(async () => {
      await sheet.setHeaderRow([
        'ID', 'TIMESTAMP', 'TANGGAL', 'JAM KEDATANGAN', 'KELAS', 'NAMA SISWA', 'ALASAN TERLAMBAT', 'PETUGAS DISPO'
      ]);
    });

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const id = crypto.randomUUID().substring(0, 8);

    await sheet.addRow({
      'ID': id,
      'TIMESTAMP': timestamp,
      'TANGGAL': tanggal,
      'JAM KEDATANGAN': jamKedatangan,
      'KELAS': kelas,
      'NAMA SISWA': namaSiswa,
      'ALASAN TERLAMBAT': alasanTerlambat,
      'PETUGAS DISPO': petugasDispo || 'Unknown'
    }, { raw: true });

    return NextResponse.json({ success: true, message: 'Dispo berhasil disimpan' });
  } catch (error: any) {
    console.error('Submit Dispo Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
