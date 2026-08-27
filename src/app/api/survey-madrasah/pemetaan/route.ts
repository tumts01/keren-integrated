import { NextResponse } from 'next/server';
import { getEVotingDoc } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const doc = await getEVotingDoc();
    const sheet = doc.sheetsByTitle['LATAR BELAKANG'];
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Sheet LATAR BELAKANG tidak ditemukan' }, { status: 404 });
    }

    const rows = await sheet.getRows();
    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;
    
    const data = rows.map((r, i) => {
      const rowData: Record<string, string> = { _rowIndex: String(r.rowNumber) };
      for (const h of headers) {
        rowData[h] = r.get(h) || '';
      }
      return rowData;
    });

    return NextResponse.json({ success: true, data: data.reverse() }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });
  } catch (error: any) {
    console.error('API Survey Pemetaan Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data pemetaan: ' + error.message }, { status: 500 });
  }
}
