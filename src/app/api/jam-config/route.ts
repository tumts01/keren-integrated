import { NextResponse } from 'next/server';
import { getPresensiDoc } from '@/lib/google-sheets';

// GET: ambil konfigurasi jam per tanggal
// Query: ?tanggal=2026-08-13  → cari config untuk tanggal tsb
// Tanpa param → ambil semua
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get('tanggal');

    const doc = await getPresensiDoc();

    // Auto-create sheet JamConfig jika belum ada
    let sheet = doc.sheetsByTitle['JamConfig'];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: 'JamConfig',
        headerValues: ['Tanggal', 'JamTersedia', 'Keterangan', 'UpdatedAt']
      });
    }

    const rows = await sheet.getRows();
    const data = rows.map(r => ({
      tanggal: r.get('Tanggal') || '',
      jamTersedia: r.get('JamTersedia') || '',
      keterangan: r.get('Keterangan') || '',
      updatedAt: r.get('UpdatedAt') || '',
    })).filter(r => r.tanggal);

    if (tanggal) {
      const found = data.find(r => r.tanggal === tanggal);
      // Kalau tidak ada config → semua jam (1–10) tersedia
      if (!found) {
        return NextResponse.json({ success: true, jamTersedia: [1,2,3,4,5,6,7,8,9,10], keterangan: '' });
      }
      const jams = found.jamTersedia.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n));
      return NextResponse.json({ success: true, jamTersedia: jams, keterangan: found.keterangan });
    }

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: simpan / update konfigurasi jam untuk tanggal tertentu
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, jamTersedia, keterangan } = body;

    if (!tanggal || !Array.isArray(jamTersedia)) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const doc = await getPresensiDoc();
    let sheet = doc.sheetsByTitle['JamConfig'];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: 'JamConfig',
        headerValues: ['Tanggal', 'JamTersedia', 'Keterangan', 'UpdatedAt']
      });
    }

    const rows = await sheet.getRows();
    const existingRow = rows.find(r => r.get('Tanggal') === tanggal);
    const jamStr = jamTersedia.sort((a: number, b: number) => a - b).join(',');
    const updatedAt = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    if (existingRow) {
      existingRow.set('JamTersedia', jamStr);
      existingRow.set('Keterangan', keterangan || '');
      existingRow.set('UpdatedAt', updatedAt);
      await existingRow.save();
    } else {
      await sheet.addRow({
        Tanggal: tanggal,
        JamTersedia: jamStr,
        Keterangan: keterangan || '',
        UpdatedAt: updatedAt,
      });
    }

    return NextResponse.json({ success: true, message: 'Konfigurasi jam berhasil disimpan' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: reset config untuk tanggal tertentu (kembali ke semua jam)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get('tanggal');
    if (!tanggal) return NextResponse.json({ success: false, error: 'Tanggal wajib diisi' }, { status: 400 });

    const doc = await getPresensiDoc();
    const sheet = doc.sheetsByTitle['JamConfig'];
    if (!sheet) return NextResponse.json({ success: true, message: 'Tidak ada konfigurasi' });

    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('Tanggal') === tanggal);
    if (row) await row.delete();

    return NextResponse.json({ success: true, message: 'Konfigurasi jam direset' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
