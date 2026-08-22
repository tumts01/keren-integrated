import { NextResponse } from 'next/server';
import { getNilaiSiswaDoc, getIndukDoc } from '@/lib/google-sheets';

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
      const rowTa = sheetPK.getCell(i, 29).value as string;
      if (!rowInduk) break;
      if (rowMapel === mapel && rowTa === tahunAjaran) {
        existingMap.set(rowInduk, i);
      }
    }

    const data = uniqueSiswas.map(s => {
      const rowIdx = existingMap.get(s.induk);
      const scores = {
        m1s1: '', m1s2: '', m1s3: '',
        m2s1: '', m2s2: '', m2s3: '',
        m3s1: '', m3s2: '', m3s3: '',
        m4s1: '', m4s2: '', m4s3: '',
        m5s1: '', m5s2: '', m5s3: '',
        m6s1: '', m6s2: '', m6s3: '',
        sts: '', sas: '', rata: ''
      };

      if (rowIdx != null) {
        // Read all 18 materi harian + sts + sas + rata
        const getStr = (idx: number) => {
          const val = sheetPK.getCell(rowIdx, idx).value;
          return val != null ? String(val) : '';
        };

        scores.m1s1 = getStr(8);
        scores.m1s2 = getStr(9);
        scores.m1s3 = getStr(10);
        
        scores.m2s1 = getStr(11);
        scores.m2s2 = getStr(12);
        scores.m2s3 = getStr(13);

        scores.m3s1 = getStr(14);
        scores.m3s2 = getStr(15);
        scores.m3s3 = getStr(16);

        scores.m4s1 = getStr(17);
        scores.m4s2 = getStr(18);
        scores.m4s3 = getStr(19);

        scores.m5s1 = getStr(20);
        scores.m5s2 = getStr(21);
        scores.m5s3 = getStr(22);

        scores.m6s1 = getStr(23);
        scores.m6s2 = getStr(24);
        scores.m6s3 = getStr(25);

        scores.sts = getStr(26);
        scores.sas = getStr(27);
        scores.rata = getStr(28);
      }
      return { ...s, scores };
    });

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=0, stale-while-revalidate=5' }
    });
  } catch (err: any) {
    console.error('Error GET PK Rekap:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
