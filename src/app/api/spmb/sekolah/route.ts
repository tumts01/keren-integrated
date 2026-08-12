import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function GET() {
  try {
    const doc = await getIndukDoc();
    const sheet = doc.sheetsByTitle['DATABASE'];
    if (!sheet) return NextResponse.json({ success: false, error: 'Tab DATABASE tidak ditemukan' }, { status: 404 });

    const rows = await sheet.getRows();
    const sekolahMap = new Map<string, string>();
    
    rows.forEach(r => {
      // Kolom AY = index 50
      const namaSekolah = (r._rawData[50] || r.get('SD/MI') || '').toString().trim();
      const alamatSekolah = (r.get('ALAMAT SD/MI') || '').toString().trim();
      
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
