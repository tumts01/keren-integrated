import { NextResponse } from 'next/server';
import { getPresensiDoc, getIndukDoc } from '@/lib/google-sheets';
import crypto from 'crypto';

// Convert kelas format "7A" → "VII_A" untuk lookup di jadwal
function kelasToJadwalCol(kelas: string): string {
  const match = kelas.trim().match(/^(\d+)([A-Za-z]+)$/);
  if (!match) return '';
  const num = parseInt(match[1]);
  const suffix = match[2].toUpperCase();
  const roman: Record<number, string> = { 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII' };
  const r = roman[num] || '';
  return r ? `${r}_${suffix}` : '';
}

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
    })).filter(r => r.tanggal || r.materi).reverse();

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('GET Jurnal Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH: Fix baris "Unknown" — jadwal data dikirim dari client untuk hemat quota
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { jadwalData } = body; // Array dari /api/jadwal, dikirim oleh client
    if (!jadwalData || !Array.isArray(jadwalData)) {
      return NextResponse.json({ success: false, error: 'jadwalData wajib dikirim dari client' }, { status: 400 });
    }

    // Buka hanya 1 spreadsheet (presensiDoc) → hemat quota
    const presensiDoc = await getPresensiDoc();
    const jurnalSheet = presensiDoc.sheetsByTitle['JURNAL MENGAJAR'];
    if (!jurnalSheet) return NextResponse.json({ success: false, error: 'Sheet JURNAL MENGAJAR tidak ditemukan' }, { status: 404 });

    const jurnalRows = await jurnalSheet.getRows();

    // Cari baris Unknown beserta row number-nya
    const unknownInfos: { rowNumber: number; kelas: string; mapel: string; tanggal: string }[] = [];
    for (const row of jurnalRows) {
      const guru = (row.get('NAMA GURU') || '').trim().toLowerCase();
      if (guru === 'unknown' || guru === '') {
        unknownInfos.push({
          rowNumber: row.rowNumber,
          kelas: (row.get('KELAS') || '').trim(),
          mapel: (row.get('MAPEL') || '').trim().toLowerCase(),
          tanggal: row.get('TANGGAL') || '',
        });
      }
    }

    if (unknownInfos.length === 0) {
      return NextResponse.json({ success: true, message: 'Tidak ada baris Unknown', fixed: 0, ambiguous: [], notFound: [] });
    }

    // Bangun jadwalMap dari data yang dikirim client (tidak perlu buka spreadsheet kedua)
    const kelasCols = [
      'VII_A','VII_B','VII_C','VII_D','VII_E','VII_F','VII_G','VII_H','VII_I',
      'VIII_A','VIII_B','VIII_C','VIII_D','VIII_E','VIII_F','VIII_G','VIII_H','VIII_I',
      'IX_A','IX_B','IX_C','IX_D','IX_E','IX_F','IX_G','IX_H','IX_I',
    ];
    const jadwalMap: Record<string, Record<string, string[]>> = {};
    for (const jRow of jadwalData) {
      const namaGuru = (jRow.namaGuru || '').trim();
      const mapel = (jRow.mataPelajaran || '').trim().toLowerCase();
      if (!namaGuru || !mapel) continue;
      for (const col of kelasCols) {
        const val = (jRow[col] || '').trim();
        if (val && val !== '0' && val !== '-') {
          if (!jadwalMap[col]) jadwalMap[col] = {};
          if (!jadwalMap[col][mapel]) jadwalMap[col][mapel] = [];
          if (!jadwalMap[col][mapel].includes(namaGuru)) jadwalMap[col][mapel].push(namaGuru);
        }
      }
    }

    // Tentukan fix
    const fixes: { rowNumber: number; namaGuru: string }[] = [];
    const ambiguous: any[] = [];
    const notFound: any[] = [];

    for (const info of unknownInfos) {
      const col = kelasToJadwalCol(info.kelas);
      if (!col) { notFound.push({ ...info, reason: 'Format kelas tidak dikenali' }); continue; }

      let candidates: string[] = jadwalMap[col]?.[info.mapel] || [];
      if (candidates.length === 0) {
        for (const [mapelKey, gurus] of Object.entries(jadwalMap[col] || {})) {
          if (mapelKey.includes(info.mapel) || info.mapel.includes(mapelKey)) {
            candidates = [...new Set([...candidates, ...gurus])];
          }
        }
      }

      if (candidates.length === 1) {
        fixes.push({ rowNumber: info.rowNumber, namaGuru: candidates[0] });
      } else if (candidates.length > 1) {
        ambiguous.push({ ...info, candidates });
      } else {
        notFound.push({ ...info, col, reason: 'Tidak ditemukan di jadwal' });
      }
    }

    // Terapkan fix via cells API
    if (fixes.length > 0) {
      const maxRow = Math.max(...fixes.map(f => f.rowNumber));
      await jurnalSheet.loadCells(`H1:H${maxRow}`);
      for (const fix of fixes) {
        const cell = jurnalSheet.getCell(fix.rowNumber - 1, 7); // kolom H = index 7
        cell.value = fix.namaGuru;
      }
      await jurnalSheet.saveUpdatedCells();
    }

    return NextResponse.json({
      success: true,
      totalUnknown: unknownInfos.length,
      fixed: fixes.length,
      ambiguous,
      notFound,
      message: `Berhasil fix ${fixes.length} dari ${unknownInfos.length} baris Unknown`
    });
  } catch (error: any) {
    console.error('PATCH Fix Unknown Error:', error);
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
    if (!sheet) return NextResponse.json({ success: false, error: 'Tab JURNAL MENGAJAR tidak ditemukan' }, { status: 404 });

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
