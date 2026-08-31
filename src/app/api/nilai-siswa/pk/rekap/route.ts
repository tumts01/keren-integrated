import { NextResponse } from 'next/server';
import { getNilaiSiswaDoc } from '@/lib/google-sheets';
import { supabase } from '@/lib/supabase';

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

    let nilaiMap: Record<string, { mh1: string, mh2: string, mh3: string, mh4: string, mh5: string, mh6: string, sts: string, sas: string }> = {};

    if (sheetNilai) {
      await sheetNilai.loadCells({
        startRowIndex: 8,
        endRowIndex: sheetNilai.rowCount,
        startColumnIndex: 0,
        endColumnIndex: 28 // 0 to 27
      });

      for (let i = 8; i < sheetNilai.rowCount; i++) {
        const idSiswa = sheetNilai.getCell(i, 2).value;
        if (idSiswa) {
          const key = idSiswa.toString().trim();
          nilaiMap[key] = {
            mh1: (sheetNilai.getCell(i, 8).value || '').toString(),
            mh2: (sheetNilai.getCell(i, 11).value || '').toString(),
            mh3: (sheetNilai.getCell(i, 14).value || '').toString(),
            mh4: (sheetNilai.getCell(i, 17).value || '').toString(),
            mh5: (sheetNilai.getCell(i, 20).value || '').toString(),
            mh6: (sheetNilai.getCell(i, 23).value || '').toString(),
            sts: (sheetNilai.getCell(i, 26).value || '').toString(),
            sas: (sheetNilai.getCell(i, 27).value || '').toString()
          };
        }
      }
    }

    const data = activeSiswa.map((s, index) => ({
      no: index + 1,
      induk: s.induk,
      nama: s.nama,
      jk: s.jk,
      nilai: nilaiMap[s.induk] || { mh1: '', mh2: '', mh3: '', mh4: '', mh5: '', mh6: '', sts: '', sas: '' }
    }));

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('API Nilai PK Rekap GET Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil rekap data' }, { status: 500 });
  }
}
