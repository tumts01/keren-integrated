import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: rows, error } = await supabase.from('data_induk').select('*');
    if (error) throw error;
    
    const sekolahMap = new Map<string, string>();
    
    (rows || []).forEach((r: any) => {
      const namaSekolah = (r.metadata?.['SD/MI'] || '').toString().trim();
      const alamatSekolah = (r.metadata?.['ALAMAT SD/MI'] || '').toString().trim();
      
      if (namaSekolah && !sekolahMap.has(namaSekolah)) {
        sekolahMap.set(namaSekolah, alamatSekolah);
      }
    });

    const data = Array.from(sekolahMap.entries()).map(([nama, alamat]) => ({ nama, alamat }));
    // Sort alphabetically
    data.sort((a, b) => a.nama.localeCompare(b.nama));

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });
  } catch (error: any) {
    console.error('API Sekolah error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
