import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periode = searchParams.get('periode');
    
    if (!periode) return NextResponse.json({ success: false, error: 'Periode diperlukan' }, { status: 400 });

    const { data: records, error } = await supabase
      .from('penilaian_karakter')
      .select('*')
      .eq('periode', periode);
      
    if (error) throw error;

    // Get all siswa
    const semuaSiswa = await getAllCachedDataInduk();
    const siswaAktif: any[] = [];
    
    for (const row of semuaSiswa) {
      const meta = row.metadata || {};
      const status = (meta['STATUS SISWA'] || '').toUpperCase().trim();
      if (!status.includes('AKTIF')) continue;

      let rombel = (meta['ROMBEL KELAS 9'] || '').trim();
      if (!rombel) rombel = (meta['ROMBEL KELAS 8'] || '').trim();
      if (!rombel) rombel = (meta['ROMBEL KELAS 7'] || '').trim();
      if (!rombel) rombel = (meta['ROMBEL'] || '').trim();

      const nisn = (meta['NISN'] || '').trim();
      const nis = (meta['ID SISWA'] || row.id_siswa || '').trim();
      const id = nisn || nis;

      siswaAktif.push({
        id,
        nisn: id,
        nis,
        nama: row.nama || meta['NAMA'] || '',
        rombel,
      });
    }

    // Initialize scores: { nisn/id: { religius: 0, disiplin: 0, ... } }
    const scores: Record<string, Record<string, number>> = {};
    siswaAktif.forEach(s => {
      const initScores = {
        religius: 0, disiplin: 0, demokratis: 0, kreatif: 0,
        mandiri: 0, kritis: 0, responsif: 0, nasionalis: 0,
        toleran: 0, peduli: 0, leadership: 0, jujur: 0
      };
      scores[s.id] = { ...initScores };
      if (s.nisn) scores[s.nisn] = scores[s.id];
      if (s.nis) scores[s.nis] = scores[s.id];
    });

    const traits = ['religius', 'disiplin', 'demokratis', 'kreatif', 'mandiri', 'kritis', 'responsif', 'nasionalis', 'toleran', 'peduli', 'leadership', 'jujur'];

    // Process each submission
    records?.forEach(r => {
      // 1. Penilaian Diri (Siswa)
      if (r.penilai_role === 'siswa' && r.data_diri && scores[r.penilai_id]) {
        traits.forEach(t => {
          // If they chose option A (the positive one), they get 1 point
          if (r.data_diri[t]?.jawaban === 'A') {
            scores[r.penilai_id][t] += 1;
          }
        });
      }

      // 2. Penilaian Teman (Siswa)
      if (r.penilai_role === 'siswa' && r.data_teman) {
        traits.forEach(t => {
          const chosenNisn = r.data_teman[t]?.nisn;
          if (chosenNisn && scores[chosenNisn]) {
            scores[chosenNisn][t] += 1;
          }
        });
      }

      // 3. Penilaian Guru
      if (r.penilai_role === 'guru' && r.data_guru) {
        traits.forEach(t => {
          const chosenNisn = r.data_guru[t]?.nisn;
          if (chosenNisn && scores[chosenNisn]) {
            scores[chosenNisn][t] += 1;
          }
        });
      }
    });

    // Format output
    const seen = new Set();
    const rekapData: any[] = [];
    for (const s of siswaAktif) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      const sScores = scores[s.id] || {};
      const total = Object.values(sScores).reduce((a, b) => a + b, 0);
      rekapData.push({
        nisn: s.nisn,
        nama: s.nama,
        kelas: s.rombel,
        scores: sScores,
        total
      });
    }

    return NextResponse.json({ success: true, data: rekapData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
