import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { unstable_cache } from 'next/cache';

// Ambil hanya 3 kolom yang diperlukan
const getCachedSekolah = unstable_cache(
  async () => {
    const sekolahMap = new Map<string, { alamat: string, npsn: string }>();
    let page = 0;
    const PAGE_SIZE = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('data_induk')
        .select('metadata')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      data.forEach((r: any) => {
        const meta = r.metadata || {};
        const namaSekolah = (meta['SD/MI'] || '').toString().trim();
        const alamatSekolah = (meta['ALAMAT SD/MI'] || '').toString().trim();
        const npsn = (meta['NPSN SD/MI'] || '').toString().trim();
        if (namaSekolah && !sekolahMap.has(namaSekolah)) {
          sekolahMap.set(namaSekolah, { alamat: alamatSekolah, npsn });
        }
      });

      if (data.length < PAGE_SIZE) break;
      page++;
    }

    return Array.from(sekolahMap.entries())
      .map(([nama, val]) => ({ nama, alamat: val.alamat, npsn: val.npsn }))
      .sort((a, b) => a.nama.localeCompare(b.nama));
  },
  ['spmb_sekolah'],
  { revalidate: 86400, tags: ['spmb_sekolah'] } // Cache 24 jam — data sekolah jarang berubah
);

export async function GET() {
  try {
    const data = await getCachedSekolah();
    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
    });
  } catch (error: any) {
    console.error('API Sekolah error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
