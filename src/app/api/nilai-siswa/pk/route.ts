import { NextResponse } from 'next/server';
import { getNilaiSiswaDoc } from '@/lib/google-sheets';
import { supabase } from '@/lib/supabase';

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

    // 1. Fetch Students from Supabase
    const { data: rowsDb, error } = await supabase.from('data_induk').select('*');
    if (error) throw error;
    
    const siswas: any[] = [];
    (rowsDb || []).forEach((r: any) => {
      const getVal = (k: string) => k === 'ID SISWA' ? r.id_siswa : k === 'NAMA' ? r.nama : (r.metadata?.[k] || '');
      
      const baseStudent = {
        induk: getVal('ID SISWA') || '',
        nama: getVal('NAMA') || '',
        jk: getVal('JENIS KELAMIN') || '',
      };

      const records = [];
      const ta7 = (getVal('TA KELAS 7') || '').trim();
      const rombel7 = (getVal('ROMBEL KELAS 7') || '').trim();
      if (ta7 && rombel7) records.push({ ...baseStudent, tahunAjaran: ta7, rombel: rombel7 });

      const ta8 = (getVal('TA KELAS 8') || '').trim();
      const rombel8 = (getVal('ROMBEL KELAS 8') || '').trim();
      if (ta8 && rombel8) records.push({ ...baseStudent, tahunAjaran: ta8, rombel: rombel8 });

      const ta9 = (getVal('TA KELAS 9') || '').trim();
      const rombel9 = (getVal('ROMBEL KELAS 9') || '').trim();
      if (ta9 && rombel9) records.push({ ...baseStudent, tahunAjaran: ta9, rombel: rombel9 });

      if (records.length === 0) {
        records.push({
          ...baseStudent,
          tahunAjaran: (getVal('TAHUN AJARAN') || '').trim(),
          rombel: (getVal('ROMBEL') || '').trim()
        });
      }

      records.forEach(rec => siswas.push(rec));
    });

    const activeSiswa = siswas.filter(s => s.tahunAjaran === tahunAjaran && s.rombel === kelas);

    // 2. Fetch Grades from NilaiSiswaDoc
    const docNilai = await getNilaiSiswaDoc();
    const sheetName = `${kelas}_${mapel}`;
    let sheetNilai = docNilai.sheetsByTitle[sheetName];

    let nilaiMap: Record<string, string> = {};

    if (sheetNilai && tipe) {
      const colIndex = getColumnIndex(tipe, materi || undefined, sub || undefined);
      
      await sheetNilai.loadCells({
        startRowIndex: 8,
        endRowIndex: sheetNilai.rowCount,
        startColumnIndex: 0,
        endColumnIndex: colIndex + 1
      });

      for (let i = 8; i < sheetNilai.rowCount; i++) {
        const idSiswa = sheetNilai.getCell(i, 2).value;
        if (idSiswa) {
          const val = sheetNilai.getCell(i, colIndex).value;
          nilaiMap[idSiswa.toString().trim()] = val ? val.toString() : '';
        }
      }
    }

    const data = activeSiswa.map((s, index) => ({
      no: index + 1,
      induk: s.induk,
      nama: s.nama,
      jk: s.jk,
      nilai: nilaiMap[s.induk] || ''
    }));

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('API Nilai PK GET Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { kelas, mapel, tipe, materi, sub, data, tahunAjaran } = await req.json();

    if (!kelas || !mapel || !tipe || !data || !Array.isArray(data)) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const docNilai = await getNilaiSiswaDoc();
    const sheetName = `${kelas}_${mapel}`;
    let sheetNilai = docNilai.sheetsByTitle[sheetName];

    if (!sheetNilai) {
      return NextResponse.json({ success: false, error: 'Format master nilai untuk kelas/mapel ini belum dibuat' }, { status: 404 });
    }

    const colIndex = getColumnIndex(tipe, materi, sub);

    await sheetNilai.loadCells({
      startRowIndex: 8,
      endRowIndex: sheetNilai.rowCount,
      startColumnIndex: 0,
      endColumnIndex: colIndex + 1
    });

    for (const item of data) {
      let rowIndex = -1;
      for (let i = 8; i < sheetNilai.rowCount; i++) {
        const cellVal = sheetNilai.getCell(i, 2).value;
        if (cellVal && cellVal.toString().trim() === item.induk.toString().trim()) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex !== -1) {
        const cell = sheetNilai.getCell(rowIndex, colIndex);
        if (item.nilai === '' || item.nilai === null) {
          cell.value = null; // Clear if empty
        } else {
          cell.value = Number(item.nilai);
        }
      }
    }

    await sheetNilai.saveUpdatedCells();
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('API Nilai PK POST Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan nilai' }, { status: 500 });
  }
}
