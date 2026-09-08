import { NextResponse } from 'next/server';
import { getNilaiSiswaDoc } from '@/lib/google-sheets';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const kelas = searchParams.get('kelas');
    const mapel = searchParams.get('mapel');
    const tahunAjaran = searchParams.get('tahunAjaran');

    if (!kelas || !mapel || !tahunAjaran) {
      return NextResponse.json({ success: false, error: 'Kelas, Mapel, dan Tahun Ajaran wajib diisi' }, { status: 400 });
    }

    // 1. Fetch Students from Supabase
    const rowsDb = await getAllCachedDataInduk();
    
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

      const currentTa = (getVal('TAHUN AJARAN') || '').trim();
      const currentRombel = (getVal('ROMBEL') || '').trim();
      if (currentTa && currentRombel) records.push({ ...baseStudent, tahunAjaran: currentTa, rombel: currentRombel });

      records.forEach(rec => {
        if (rec.tahunAjaran === tahunAjaran && rec.rombel === kelas) {
          siswas.push(rec);
        }
      });
    });

    const activeSiswa = siswas;

    // 2. Fetch Grades from NilaiSiswaDoc
    const docNilai = await getNilaiSiswaDoc();
    const sheetName = `${kelas}_${mapel}`;
    let sheetNilai = docNilai.sheetsByTitle[sheetName];

    let nilaiMap: Record<string, Record<string, string>> = {};

    if (sheetNilai) {
      await sheetNilai.loadCells({
        startRowIndex: 8,
        endRowIndex: sheetNilai.rowCount,
        startColumnIndex: 0,
        endColumnIndex: 29 // 0 to 28
      });

      for (let i = 8; i < sheetNilai.rowCount; i++) {
        const idSiswa = sheetNilai.getCell(i, 2).value;
        if (idSiswa) {
          const key = idSiswa.toString().trim();
          const getVal = (c: number) => (sheetNilai.getCell(i, c).value || '').toString();
          nilaiMap[key] = {
            m1s1: getVal(8), m1s2: getVal(9), m1s3: getVal(10),
            m2s1: getVal(11), m2s2: getVal(12), m2s3: getVal(13),
            m3s1: getVal(14), m3s2: getVal(15), m3s3: getVal(16),
            m4s1: getVal(17), m4s2: getVal(18), m4s3: getVal(19),
            m5s1: getVal(20), m5s2: getVal(21), m5s3: getVal(22),
            m6s1: getVal(23), m6s2: getVal(24), m6s3: getVal(25),
            sts: getVal(26),
            sas: getVal(27),
            rata: getVal(28)
          };
        }
      }
    }

    const emptyScores = {
      m1s1: '', m1s2: '', m1s3: '',
      m2s1: '', m2s2: '', m2s3: '',
      m3s1: '', m3s2: '', m3s3: '',
      m4s1: '', m4s2: '', m4s3: '',
      m5s1: '', m5s2: '', m5s3: '',
      m6s1: '', m6s2: '', m6s3: '',
      sts: '', sas: '', rata: ''
    };

    const data = activeSiswa.map((s, index) => ({
      no: index + 1,
      induk: s.induk,
      nama: s.nama,
      jk: s.jk,
      scores: nilaiMap[s.induk] || emptyScores
    }));

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });

  } catch (error: any) {
    console.error('API Nilai PK Rekap GET Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil rekap data' }, { status: 500 });
  }
}
