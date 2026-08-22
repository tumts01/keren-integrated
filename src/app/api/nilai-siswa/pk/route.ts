import { NextResponse } from 'next/server';
import { getNilaiSiswaDoc, getIndukDoc } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

function getColumnIndex(tipe: string, materi?: string, sub?: string) {
  if (tipe === 'sts') return 26;
  if (tipe === 'sas') return 27;
  if (tipe === 'materi_harian') {
    const mMatch = (materi || '').match(/\d+/);
    const m = mMatch ? parseInt(mMatch[0]) : 1;
    const sMatch = (sub || '').match(/\d+/);
    const s = sMatch ? parseInt(sMatch[0]) : 1;
    return 8 + (m - 1) * 3 + (s - 1);
  }
  return 8;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const kelas = searchParams.get('kelas');
    const mapel = searchParams.get('mapel');
    const tipe = searchParams.get('tipe');
    const materi = searchParams.get('materi');
    const sub = searchParams.get('sub');
    const tahunAjaran = searchParams.get('tahunAjaran');

    if (!kelas || !mapel || !tahunAjaran) {
      return NextResponse.json({ success: false, error: 'Kelas, Mapel, dan Tahun Ajaran wajib diisi' }, { status: 400 });
    }

    // 1. Fetch Students
    const docInduk = await getIndukDoc();
    const sheetDb = docInduk.sheetsByTitle['DATABASE'];
    const rowsDb = await sheetDb.getRows();
    
    const siswas: any[] = [];
    rowsDb.forEach(r => {
      const baseStudent = {
        induk: r.get('ID SISWA') || '',
        nama: r.get('NAMA') || '',
        jk: r.get('JENIS KELAMIN') || '',
      };

      const records = [];
      const ta7 = (r.get('TA KELAS 7') || '').trim();
      const rombel7 = (r.get('ROMBEL KELAS 7') || '').trim();
      if (ta7 && rombel7) records.push({ ...baseStudent, tahunAjaran: ta7, rombel: rombel7 });

      const ta8 = (r.get('TA KELAS 8') || '').trim();
      const rombel8 = (r.get('ROMBEL KELAS 8') || '').trim();
      if (ta8 && rombel8) records.push({ ...baseStudent, tahunAjaran: ta8, rombel: rombel8 });

      const ta9 = (r.get('TA KELAS 9') || '').trim();
      const rombel9 = (r.get('ROMBEL KELAS 9') || '').trim();
      if (ta9 && rombel9) records.push({ ...baseStudent, tahunAjaran: ta9, rombel: rombel9 });

      const currentTa = (r.get('TAHUN AJARAN') || '').trim();
      const currentRombel = (r.get('ROMBEL') || '').trim();
      if (currentTa && currentRombel) records.push({ ...baseStudent, tahunAjaran: currentTa, rombel: currentRombel });

      records.forEach(rec => {
        if (rec.tahunAjaran === tahunAjaran && rec.rombel === kelas) {
          siswas.push(rec);
        }
      });
    });

    const uniqueSiswas = Array.from(new Map(siswas.map(s => [s.induk, s])).values());

    if (uniqueSiswas.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 2. Fetch PK scores
    const docNilai = await getNilaiSiswaDoc();
    const sheetPK = docNilai.sheetsByTitle['PK'];
    // Assuming max 1000 rows is enough
    await sheetPK.loadCells('A1:AD1000');

    const existingMap = new Map();
    for (let i = 1; i < 1000; i++) {
      const rowInduk = sheetPK.getCell(i, 1).value as string;
      const rowMapel = sheetPK.getCell(i, 6).value as string;
      if (!rowInduk) break;
      if (rowMapel === mapel) {
        existingMap.set(rowInduk, i);
      }
    }

    let colIdx = 8;
    if (tipe) {
      colIdx = getColumnIndex(tipe, materi || '', sub || '');
    }

    const data = uniqueSiswas.map(s => {
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
    const { kelas, mapel, tipe, materi, sub, data, guru, tahunAjaran } = body;

    if (!kelas || !mapel || !tipe || !data || !Array.isArray(data) || !tahunAjaran) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const docNilai = await getNilaiSiswaDoc();
    const sheetPK = docNilai.sheetsByTitle['PK'];
    await sheetPK.loadCells('A1:AD1000');

    const existingMap = new Map();
    let maxRow = 1;
    for (let i = 1; i < 1000; i++) {
      const rowInduk = sheetPK.getCell(i, 1).value as string;
      const rowMapel = sheetPK.getCell(i, 6).value as string;
      const rowTa = sheetPK.getCell(i, 29).value as string;
      
      if (!rowInduk) {
        if (i > maxRow) maxRow = i;
        break;
      }
      if (rowMapel === mapel && rowTa === tahunAjaran) {
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
        sheetPK.getCell(rowIdx, 3).value = kelas; // Kelas 
        sheetPK.getCell(rowIdx, 4).value = student.jk;
        sheetPK.getCell(rowIdx, 5).value = guru || '';
        sheetPK.getCell(rowIdx, 6).value = mapel;
        sheetPK.getCell(rowIdx, 29).value = tahunAjaran;
      }
      
      // Update cell if score is provided, otherwise leave as is or null
      if (student.score !== undefined && student.score !== '') {
        sheetPK.getCell(rowIdx, colIdx).value = Number(student.score) || student.score;
      } else {
        sheetPK.getCell(rowIdx, colIdx).value = null;
      }
      
      // Update 'Materi' column if it's materi harian just to keep track
      if (tipe === 'materi_harian' && materi) {
        sheetPK.getCell(rowIdx, 7).value = materi;
      }
    }

    await sheetPK.saveUpdatedCells();

    return NextResponse.json({ success: true, message: 'Nilai berhasil disimpan' });
  } catch (err: any) {
    console.error('Error POST PK Nilai:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
