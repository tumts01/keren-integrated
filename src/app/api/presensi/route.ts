import { NextResponse } from 'next/server';
import { getPresensiDoc } from '@/lib/google-sheets';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterTanggal = searchParams.get('tanggal');

    const doc = await getPresensiDoc();
    const sheet = doc.sheetsByTitle['PRESENSI SISWA'];
    if (!sheet) return NextResponse.json({ success: false, error: 'Sheet PRESENSI SISWA tidak ditemukan' }, { status: 404 });

    const rows = await sheet.getRows();
    let data = rows.map(r => ({
      id: r.get('ID') || '',
      tanggal: (r.get('TANGGAL') || '').trim(),
      tahunAjaran: (r.get('TAHUN AJARAN') || '').trim(),
      kelas: (r.get('KELAS') || '').trim(),
      jamKe: (r.get('JAM KE') || '').trim(),
      mapel: (r.get('MAPEL') || '').trim(),
      guruPenginput: (r.get('GURU PENGINPUT') || '').trim(),
      namaSiswa: (r.get('NAMA SISWA') || '').trim(),
      nisn: (r.get('NISN') || '').trim(),
      kehadiran: (r.get('KEHADIRAN') || '').trim(),
    })).filter(r => r.namaSiswa && r.kehadiran);

    if (filterTanggal) {
      data = data.filter(r => r.tanggal === filterTanggal);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('GET Presensi Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Retry dengan exponential backoff — penting untuk handle quota 429
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 4, baseDelayMs = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const is429 = err?.message?.includes('429') || err?.status === 429 || err?.code === 429;
      if (i < maxRetries - 1 && is429) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = baseDelayMs * Math.pow(2, i);
        console.log(`Quota exceeded, retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      } else if (!is429) {
        throw err; // Error bukan 429, langsung lempar
      }
    }
  }
  throw lastError;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, jamKe, kelas, mapel, guru, tahunAjaran, presensi, siswaList } = body;

    if (!tanggal || !jamKe || !kelas || !mapel || !presensi || !siswaList) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const doc = await withRetry(() => getPresensiDoc());
    const sheet = doc.sheetsByTitle['PRESENSI SISWA'];

    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab PRESENSI SISWA tidak ditemukan' }, { status: 404 });
    }

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const batchId = crypto.randomUUID().substring(0, 8);

    const allRows = await withRetry(() => sheet.getRows());
    const existingRecords = allRows.filter(r => 
      r.get('TANGGAL') === tanggal && 
      r.get('KELAS') === kelas &&
      r.get('JAM KE') === jamKe &&
      r.get('MAPEL') === mapel
    );

    // Hanya simpan data S, I, A — Hadir tidak perlu dicatat
    const rowsToAdd: any[] = [];
    for (const siswa of siswaList) {
      const status = presensi[siswa.id] || 'H';
      
      const existingStudentRows = existingRecords.filter(r => r.get('NISN') === siswa.nisn || r.get('NAMA SISWA') === siswa.nama);

      if (existingStudentRows.length > 0) {
        if (status === 'H') {
          // Hapus semua record duplikat jika sekarang diset Hadir
          for (const row of existingStudentRows) {
            await withRetry(() => row.delete());
          }
        } else {
          // Update record pertama, hapus sisanya (duplikat)
          const [firstRow, ...restRows] = existingStudentRows;
          if (firstRow.get('KEHADIRAN') !== status) {
            firstRow.assign({
              'KEHADIRAN': status,
              'TIMESTAMP': timestamp,
              'GURU PENGINPUT': guru || 'Unknown'
            });
            await withRetry(() => firstRow.save());
          }
          for (const row of restRows) {
            await withRetry(() => row.delete());
          }
        }
      } else {
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
    }

    if (rowsToAdd.length > 0) {
      await withRetry(() => sheet.addRows(rowsToAdd));
    }

    return NextResponse.json({
      success: true,
      message: 'Presensi berhasil disimpan',
      totalSaved: rowsToAdd.length
    });

  } catch (error: any) {
    console.error('Save Presensi Error:', error);
    const isQuota = error?.message?.includes('429') || error?.message?.includes('Quota');
    return NextResponse.json({
      success: false,
      error: isQuota
        ? 'Server sedang sibuk (limit Google API). Coba lagi dalam 1-2 menit.'
        : (error.message || 'Terjadi kesalahan')
    }, { status: isQuota ? 429 : 500 });
  }
}
