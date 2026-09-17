import { NextResponse } from 'next/server';
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

    // 2. Fetch Grades from Supabase nilai_pk
    const { data: pkData, error } = await supabase
      .from('nilai_pk')
      .select('*')
      .eq('tahun_ajaran', tahunAjaran)
      .eq('kelas', kelas)
      .eq('mata_pelajaran', mapel);

    const emptyScores = {
      m1s1: '', m1s2: '', m1s3: '',
      m2s1: '', m2s2: '', m2s3: '',
      m3s1: '', m3s2: '', m3s3: '',
      m4s1: '', m4s2: '', m4s3: '',
      m5s1: '', m5s2: '', m5s3: '',
      m6s1: '', m6s2: '', m6s3: '',
      sts: '', sas: '', rata: ''
    };

    let globalNilaiMap: Record<string, Record<string, string>> = {};
    activeSiswa.forEach(s => {
      globalNilaiMap[s.induk] = { ...emptyScores };
    });

    if (pkData && pkData.length > 0) {
      for (const row of pkData) {
        if (!row.data_nilai || !Array.isArray(row.data_nilai)) continue;

        let scoreKey = '';
        if (row.tipe === 'sts') scoreKey = 'sts';
        else if (row.tipe === 'sas') scoreKey = 'sas';
        else if (row.tipe === 'materi_harian') {
          const mMatch = (row.materi || '').match(/\d+/);
          const m = mMatch ? parseInt(mMatch[0]) : 1;
          const sMatch = (row.sub_materi || '').match(/\d+/);
          const s = sMatch ? parseInt(sMatch[0]) : 1;
          scoreKey = `m${m}s${s}`;
        }

        if (scoreKey) {
          row.data_nilai.forEach((item: any) => {
            if (globalNilaiMap[item.induk]) {
              globalNilaiMap[item.induk][scoreKey] = item.nilai?.toString() || '';
            }
          });
        }
      }
    }

    // Calculate Rata-rata
    for (const induk in globalNilaiMap) {
      const scores = globalNilaiMap[induk];
      let totalHarian = 0; let countHarian = 0;
      ['m1s1','m1s2','m1s3','m2s1','m2s2','m2s3','m3s1','m3s2','m3s3','m4s1','m4s2','m4s3','m5s1','m5s2','m5s3','m6s1','m6s2','m6s3'].forEach(k => {
        if (scores[k]) { totalHarian += Number(scores[k]); countHarian++; }
      });
      let rataHarian = countHarian > 0 ? totalHarian / countHarian : 0;
      
      let finalTotal = 0;
      let finalDiv = 0;
      if (rataHarian > 0) { finalTotal += rataHarian; finalDiv++; }
      if (scores.sts) { finalTotal += Number(scores.sts); finalDiv++; }
      if (scores.sas) { finalTotal += Number(scores.sas); finalDiv++; }
      
      if (finalDiv > 0) {
        scores.rata = Math.round(finalTotal / finalDiv).toString();
      }
    }

    const data = activeSiswa.map((s, index) => ({
      no: index + 1,
      induk: s.induk,
      nama: s.nama,
      jk: s.jk,
      scores: globalNilaiMap[s.induk] || { ...emptyScores }
    }));

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });

  } catch (error: any) {
    console.error('API Nilai PK Rekap GET Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil rekap data' }, { status: 500 });
  }
}
