import { NextResponse } from 'next/server';
import { getPresensiDoc } from '@/lib/google-sheets';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, jamKe, kelas, mapel, guru, tahunAjaran, presensi, siswaList } = body;

    if (!tanggal || !jamKe || !kelas || !mapel || !presensi || !siswaList) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const doc = await getPresensiDoc();
    const sheet = doc.sheetsByTitle['PRESENSI SISWA'];
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab PRESENSI SISWA tidak ditemukan' }, { status: 404 });
    }

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const batchId = crypto.randomUUID().substring(0, 8); // Optional: to group submissions together

    // Filter only S, I, A as requested by user
    // "nanti data yang dikirim ke sheet hanya yang SIA"
    const rowsToAdd = [];
    
    for (const siswa of siswaList) {
      const status = presensi[siswa.nisn] || 'H';
      if (status !== 'H') {
        rowsToAdd.push({
          'ID': `${batchId}-${siswa.nisn}`,
          'TIMESTAMP': timestamp,
          'TANGGAL': tanggal,
          'TAHUN AJARAN': tahunAjaran || '',
          'KELAS': kelas,
          'JAM KE': jamKe,
          'MAPEL': mapel,
          'GURU PENGINPUT': guru || 'Unknown',
          'NAMA SISWA': siswa.nama,
          'NISN': siswa.nisn,
          'KEHADIRAN': status
        });
      }
    }

    if (rowsToAdd.length > 0) {
      await sheet.addRows(rowsToAdd);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Presensi berhasil disimpan', 
      totalSaved: rowsToAdd.length 
    });
  } catch (error: any) {
    console.error('Save Presensi Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan' }, { status: 500 });
  }
}
