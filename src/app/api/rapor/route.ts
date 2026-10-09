import { NextResponse } from 'next/server';
import { unstable_cache, revalidateTag } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

const getCachedRaporData = unstable_cache(async () => {
    let rawSiswa = await getAllCachedDataInduk();
    
    const activeStudents = (rawSiswa || []).map((row: any) => {
        let rombel = (row.metadata?.['ROMBEL KELAS 9'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL KELAS 8'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL KELAS 7'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL'] || '').trim();

        return {
           nis: row.metadata?.['ID SISWA'] || row.id_siswa || '',
           nama: row.metadata?.['NAMA'] || row.nama || '',
           kelas: rombel,
           status: (row.metadata?.['STATUS SISWA'] || '').toLowerCase().trim()
        }
    }).filter((s: any) => s.status === 'aktif' && s.kelas && s.nis);

    const configRes = await supabase.from('rapor_config').select('*');
    
    let returnedResData: any[] = [];
    let rPage = 0;
    while (true) {
      const { data, error } = await supabase.from('rapor_pengembalian').select('*').range(rPage * 1000, (rPage + 1) * 1000 - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      returnedResData.push(...data);
      if (data.length < 1000) break;
      rPage++;
    }

    let startDate = '', endDate = '';
    if (configRes.data) {
      const startRow = configRes.data.find(r => r.key === 'StartDate');
      const endRow = configRes.data.find(r => r.key === 'EndDate');
      if (startRow) startDate = startRow.value || '';
      if (endRow) endDate = endRow.value || '';
    }

    let returnedNis = new Set<string>();
    if (returnedResData.length > 0) {
      returnedResData.forEach(r => {
        const scanData = (r.scan_data || '').trim();
        const nis = scanData.split(' ')[0]; 
        
        let isValidDate = true;
        if (startDate || endDate) {
          if (r.waktu) {
            const jsDate = new Date(r.waktu);
            const yyyy = jsDate.getUTCFullYear();
            const mm = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(jsDate.getUTCDate()).padStart(2, '0');
            const yyyymmdd = `${yyyy}-${mm}-${dd}`;
            
            if (startDate && yyyymmdd < startDate) isValidDate = false;
            if (endDate && yyyymmdd > endDate) isValidDate = false;
          } else {
            isValidDate = false; 
          }
        }
        
        if (nis && isValidDate) {
          returnedNis.add(nis);
        }
      });
    }

    const missingStudents = activeStudents.filter((s: any) => !returnedNis.has(s.nis));
    
    const rekap: Record<string, {total: number, missing: number}> = {};
    for (const s of activeStudents) {
      if (!rekap[s.kelas]) {
        rekap[s.kelas] = { total: 0, missing: 0 };
      }
      rekap[s.kelas].total += 1;
    }
    
    for (const s of missingStudents) {
      if (rekap[s.kelas]) {
        rekap[s.kelas].missing += 1;
      }
    }

    const rekapArray = Object.keys(rekap).map(k => ({
      kelas: k,
      total: rekap[k].total,
      missing: rekap[k].missing,
      returned: rekap[k].total - rekap[k].missing
    })).sort((a, b) => a.kelas.localeCompare(b.kelas));

    return { startDate, endDate, rekap: rekapArray, missingList: missingStudents, allActive: activeStudents };
}, ['rapor-data-all'], { tags: ['rapor'], revalidate: 3600 });

export async function GET() {
  try {
    const data = await getCachedRaporData();
    return NextResponse.json({ success: true, ...data });

  } catch (error: any) {
    console.error('Rapor GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { nis, nama, kelas } = await request.json();
    if (!nis || !nama) return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });

    const scan_data = `${nis} ${nama} ${kelas}`;
    const waktu = new Date().toISOString();

    const { error } = await supabase.from('rapor_pengembalian').insert([{ scan_data, waktu }]);
    if (error) throw error;

    revalidateTag('rapor', {});
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { startDate, endDate } = await request.json();
    
    const configData = [];
    if (startDate !== undefined) configData.push({ key: 'StartDate', value: startDate });
    if (endDate !== undefined) configData.push({ key: 'EndDate', value: endDate });

    if (configData.length > 0) {
      const { error } = await supabase.from('rapor_config').upsert(configData, { onConflict: 'key' });
      if (error) throw error;
    }

    revalidateTag('rapor', {});
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
