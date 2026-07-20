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

// PATCH: Fix baris "Unknown" dengan cross-reference ke JadwalMengajar
export async function PATCH() {
  try {
    const presensiDoc = await getPresensiDoc();
    const jurnalSheet = presensiDoc.sheetsByTitle['JURNAL MENGAJAR'];
    if (!jurnalSheet) return NextResponse.json({ success: false, error: 'Sheet JURNAL MENGAJAR tidak ditemukan' }, { status: 404 });

    const jurnalRows = await jurnalSheet.getRows();
    const unknownRows = jurnalRows.filter(r => {
      const guru = (r.get('NAMA GURU') || '').trim().toLowerCase();
      return guru === 'unknown' || guru === '';
    });

    if (unknownRows.length === 0) {
      return NextResponse.json({ success: true, message: 'Tidak ada baris Unknown', fixed: 0, ambiguous: [], notFound: [] });
    }

    // Load jadwal mengajar dari doc induk
    const indukDoc = await getIndukDoc();
    const jadwalSheet = indukDoc.sheetsByTitle['JadwalMengajar'];
    if (!jadwalSheet) return NextResponse.json({ success: false, error: 'Sheet JadwalMengajar tidak ditemukan' }, { status: 404 });

    const jadwalRows = await jadwalSheet.getRows();
    // Bangun map: { kelas_col: { mapel_lower: [namaGuru, ...] } }
    const jadwalMap: Record<string, Record<string, string[]>> = {};
    const kelasCols = [
      'VII_A','VII_B','VII_C','VII_D','VII_E','VII_F','VII_G','VII_H','VII_I',
      'VIII_A','VIII_B','VIII_C','VIII_D','VIII_E','VIII_F','VIII_G','VIII_H','VIII_I',
      'IX_A','IX_B','IX_C','IX_D','IX_E','IX_F','IX_G','IX_H','IX_I',
    ];
    for (const jRow of jadwalRows) {
      const namaGuru = (jRow.get('namaGuru') || '').trim();
      const mapel = (jRow.get('mataPelajaran') || '').trim().toLowerCase();
      if (!namaGuru || !mapel) continue;
      for (const col of kelasCols) {
        const val = (jRow.get(col) || '').trim();
        if (val && val !== '0' && val !== '-') {
          if (!jadwalMap[col]) jadwalMap[col] = {};
          if (!jadwalMap[col][mapel]) jadwalMap[col][mapel] = [];
          if (!jadwalMap[col][mapel].includes(namaGuru)) jadwalMap[col][mapel].push(namaGuru);
        }
      }
    }

    let fixedCount = 0;
    const ambiguous: any[] = [];
    const notFound: any[] = [];

    for (const row of unknownRows) {
      const kelas = (row.get('KELAS') || '').trim();
      const mapel = (row.get('MAPEL') || '').trim().toLowerCase();
      const tanggal = row.get('TANGGAL') || '';
      const col = kelasToJadwalCol(kelas);

      if (!col) { notFound.push({ kelas, mapel, tanggal, reason: 'Format kelas tidak dikenali' }); continue; }

      // Exact match mapel dulu
      let candidates: string[] = jadwalMap[col]?.[mapel] || [];
      // Fallback: partial match
      if (candidates.length === 0) {
        for (const [mapelKey, gurus] of Object.entries(jadwalMap[col] || {})) {
          if (mapelKey.includes(mapel) || mapel.includes(mapelKey)) {
            candidates = [...new Set([...candidates, ...gurus])];
          }
        }
      }

      if (candidates.length === 1) {
        row.set('NAMA GURU', candidates[0]);
        await row.save();
        fixedCount++;
      } else if (candidates.length > 1) {
        ambiguous.push({ kelas, mapel, tanggal, candidates });
      } else {
        notFound.push({ kelas, mapel, tanggal, col, reason: 'Tidak ditemukan di jadwal' });
      }
    }

    return NextResponse.json({
      success: true,
      totalUnknown: unknownRows.length,
      fixed: fixedCount,
      ambiguous,
      notFound,
      message: `Berhasil fix ${fixedCount} dari ${unknownRows.length} baris Unknown`
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
