import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    let rowsSiswa: any[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase.from('data_induk').select('*').range(page * 1000, (page + 1) * 1000 - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      rowsSiswa = rowsSiswa.concat(data);
      if (data.length < 1000) break;
      page++;
    }
    
    const { data: rowsKelas, error: errKelas } = await supabase.from('data_kelas').select('*');
    if (errKelas) throw errKelas;

    // Map Wali Kelas
    const waliMap: Record<string, string> = {};
    (rowsKelas || []).forEach((r: any) => {
      const rombel = r.metadata?.['ROMBEL'];
      if (rombel) {
        waliMap[rombel.trim().toUpperCase()] = r.metadata?.['WALI KELAS'] || '';
      }
    });

    // Grouping and aggregating Siswa data
    const rombelStats: Record<string, {
      rombel: string,
      tingkat: string,
      tahunAjaran: string,
      lakiAktif: number,
      perempuanAktif: number,
      totalAktif: number
    }> = {};

    rowsSiswa.forEach((rawR: any) => {
      const r = { get: (k: string) => rawR.metadata ? (rawR.metadata[k] || '') : '' };
      const status = (r.get('STATUS SISWA') || '').toLowerCase().trim();
      const jk = (r.get('JENIS KELAMIN') || '').toLowerCase();
      
      const records = [];
      const ta7 = (r.get('TA KELAS 7') || '').trim();
      const rombel7 = (r.get('ROMBEL KELAS 7') || '').trim();
      if (ta7 && rombel7) records.push({ ta: ta7, rombel: rombel7 });

      const ta8 = (r.get('TA KELAS 8') || '').trim();
      const rombel8 = (r.get('ROMBEL KELAS 8') || '').trim();
      if (ta8 && rombel8) records.push({ ta: ta8, rombel: rombel8 });

      const ta9 = (r.get('TA KELAS 9') || '').trim();
      const rombel9 = (r.get('ROMBEL KELAS 9') || '').trim();
      if (ta9 && rombel9) records.push({ ta: ta9, rombel: rombel9 });

      if (records.length === 0) {
        const taMain = (r.get('TAHUN AJARAN') || '').trim();
        const rombelMain = (r.get('ROMBEL') || '').trim();
        if (taMain && rombelMain) records.push({ ta: taMain, rombel: rombelMain });
      }

      records.forEach(rec => {
        const rombel = rec.rombel.toUpperCase();
        const tahunAjaran = rec.ta;
        
        if (!rombel || !tahunAjaran) return;
        
        const key = `${tahunAjaran}__${rombel}`;
        
        // Init rombel if not exists
        if (!rombelStats[key]) {
          let tingkat = 'Lainnya';
          if (rombel.startsWith('7')) tingkat = '7';
          else if (rombel.startsWith('8')) tingkat = '8';
          else if (rombel.startsWith('9')) tingkat = '9';

          rombelStats[key] = {
            rombel,
            tingkat,
            tahunAjaran,
            lakiAktif: 0,
            perempuanAktif: 0,
            totalAktif: 0
          };
        }

        // Check active
        const isAktif = ['aktif', 'lulus'].includes(status);
        if (isAktif) {
          rombelStats[key].totalAktif++;
          if (jk.includes('laki')) rombelStats[key].lakiAktif++;
          if (jk.includes('perempuan')) rombelStats[key].perempuanAktif++;
        }
      });
    });

    // Format to array and attach Wali Kelas
    const data = Object.values(rombelStats)
      .filter(r => r.totalAktif > 0)
      .map(r => ({
        ...r,
        waliKelas: waliMap[r.rombel] || ''
      }));

    // Sort alphabetically by rombel
    data.sort((a, b) => a.rombel.localeCompare(b.rombel));

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });

  } catch (error: any) {
    console.error('Kelas Fetch Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat data kelas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rombel, waliKelas } = body;

    if (!rombel) {
      return NextResponse.json({ success: false, error: 'Rombel wajib diisi' }, { status: 400 });
    }

    const { data: rowsKelas, error: errKelas } = await supabase.from('data_kelas').select('*');
    if (errKelas) throw errKelas;

    let foundRow = null;
    if (rowsKelas) {
      for (const r of rowsKelas) {
        if ((r.metadata?.['ROMBEL'] || '').trim().toUpperCase() === rombel.trim().toUpperCase()) {
          foundRow = r;
          break;
        }
      }
    }

    if (foundRow) {
      const { error } = await supabase.from('data_kelas').update({
        metadata: { ...foundRow.metadata, 'WALI KELAS': waliKelas }
      }).eq('id', foundRow.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('data_kelas').insert([{
        metadata: {
          'ROMBEL': rombel.trim().toUpperCase(),
          'WALI KELAS': waliKelas
        }
      }]);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'Data kelas berhasil disimpan' });

  } catch (error: any) {
    console.error('POST Kelas Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan data kelas' }, { status: 500 });
  }
}
