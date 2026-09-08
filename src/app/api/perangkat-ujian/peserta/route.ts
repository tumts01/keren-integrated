import { NextResponse } from 'next/server';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nisns } = body;

    if (!nisns || !Array.isArray(nisns)) {
      return NextResponse.json({ success: false, error: 'Invalid nisns array' }, { status: 400 });
    }

    // Ambil data siswa yang ter-cache
    const allData = await getAllCachedDataInduk();
    
    // Konversi nisns ke Set untuk lookup O(1)
    const nisnSet = new Set(nisns);
    const matchedData: Record<string, { nama: string; rombel: string; foto: string }> = {};

    for (const row of allData) {
      if (!row.metadata) continue;
      const rowNisn = String(row.metadata['NISN'] || '').trim();
      
      if (nisnSet.has(rowNisn)) {
        matchedData[rowNisn] = {
          nama: row.metadata['NAMA'] || '',
          rombel: row.metadata['ROMBEL'] || '',
          foto: row.metadata['LINK FOTO TERBARU'] || row.metadata['LINK URL FOTO 1'] || ''
        };
      }
    }

    return NextResponse.json({ success: true, data: matchedData });
  } catch (error: any) {
    console.error('API Peserta Ujian Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch peserta data' }, { status: 500 });
  }
}
