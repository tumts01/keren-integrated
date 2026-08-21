import { NextResponse } from 'next/server';
import { getNilaiSiswaDoc, getIndukDoc } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

function getColumnIndex(tipe: string, materi?: string, sub?: string) {
  if (tipe === 'sts') return 25;
  if (tipe === 'sas') return 26;
  if (tipe === 'materi_harian') {
    const mMatch = (materi || '').match(/\d+/);
    const m = mMatch ? parseInt(mMatch[0]) : 1;
    const sMatch = (sub || '').match(/\d+/);
    const s = sMatch ? parseInt(sMatch[0]) : 1;
    return 7 + (m - 1) * 3 + (s - 1);
  }
  return 7;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const kelas = searchParams.get('kelas');
    const mapel = searchParams.get('mapel');
    const tipe = searchParams.get('tipe');
    const materi = searchParams.get('materi');
    const sub = searchParams.get('sub');

    if (!kelas || !mapel) {
      return NextResponse.json({ success: false, error: 'Kelas dan Mapel wajib diisi' }, { status: 400 });
    }

    // 1. Fetch Students
    const docInduk = await getIndukDoc();
    const sheetDb = docInduk.sheetsByTitle['DATABASE'];
    const rowsDb = await sheetDb.getRows();
    const siswas = rowsDb
      .map(r => ({
        induk: r.get('NO INDUK') || '',
        nama: r.get('NAMA LENGKAP') || '',
        jk: r.get('JENIS KELAMIN') || '',
        kelas: r.get('KELAS') || '',
        rombel: r.get('ROMBEL') || ''
      }))
      .filter(s => s.rombel === kelas || s.kelas === kelas);

    if (siswas.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 2. Fetch PK scores
    const docNilai = await getNilaiSiswaDoc();
    const sheetPK = docNilai.sheetsByTitle['PK'];
    // Assuming max 1000 rows is enough
    await sheetPK.loadCells('A1:AC1000');

    const existingMap = new Map();
    for (let i = 2; i < 1000; i++) {
      const rowInduk = sheetPK.getCell(i, 1).value as string;
      const rowMapel = sheetPK.getCell(i, 5).value as string;
      if (!rowInduk) break;
      if (rowMapel === mapel) {
        existingMap.set(rowInduk, i);
      }
    }

    let colIdx = 7;
    if (tipe) {
      colIdx = getColumnIndex(tipe, materi || '', sub || '');
    }

    const data = siswas.map(s => {
      const rowIdx = existingMap.get(s.induk);
      let score = '';
      if (rowIdx != null && tipe) {
        const val = sheetPK.getCell(rowIdx, colIdx).value;
        score = val != null ? String(val) : '';
      }
      return { ...s, score };
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Error GET PK Nilai:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { kelas, mapel, tipe, materi, sub, data, guru } = body;

    if (!kelas || !mapel || !tipe || !data || !Array.isArray(data)) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const docNilai = await getNilaiSiswaDoc();
    const sheetPK = docNilai.sheetsByTitle['PK'];
    await sheetPK.loadCells('A1:AC1000');

    const existingMap = new Map();
    let maxRow = 1;
    for (let i = 2; i < 1000; i++) {
      const rowInduk = sheetPK.getCell(i, 1).value as string;
      const rowMapel = sheetPK.getCell(i, 5).value as string;
      if (!rowInduk) {
        if (i > maxRow) maxRow = i;
        break;
      }
      if (rowMapel === mapel) {
        existingMap.set(rowInduk, i);
      }
    }

    let nextEmpty = maxRow;
    const colIdx = getColumnIndex(tipe, materi, sub);

    for (const student of data) {
      let rowIdx = existingMap.get(student.induk);
      if (rowIdx == null) {
        rowIdx = nextEmpty++;
        sheetPK.getCell(rowIdx, 0).value = rowIdx - 1; // No
        sheetPK.getCell(rowIdx, 1).value = student.induk;
        sheetPK.getCell(rowIdx, 2).value = student.nama;
        sheetPK.getCell(rowIdx, 3).value = student.jk;
        sheetPK.getCell(rowIdx, 4).value = guru || '';
        sheetPK.getCell(rowIdx, 5).value = mapel;
      }
      
      // Update cell if score is provided, otherwise leave as is or null
      if (student.score !== undefined && student.score !== '') {
        sheetPK.getCell(rowIdx, colIdx).value = Number(student.score) || student.score;
      } else {
        sheetPK.getCell(rowIdx, colIdx).value = null;
      }
      
      // Update 'Materi' column if it's materi harian just to keep track
      if (tipe === 'materi_harian' && materi) {
        sheetPK.getCell(rowIdx, 6).value = materi;
      }
    }

    await sheetPK.saveUpdatedCells();

    return NextResponse.json({ success: true, message: 'Nilai berhasil disimpan' });
  } catch (err: any) {
    console.error('Error POST PK Nilai:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
