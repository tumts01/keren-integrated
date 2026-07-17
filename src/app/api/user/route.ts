import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function GET() {
  try {
    const doc = await getIndukDoc();
    let sheet = doc.sheetsByTitle['Users'];
    
    if (!sheet) {
      sheet = doc.sheetsByIndex[0];
    }

    const rows = await sheet.getRows();
    
    const users = rows.map((row) => ({
      nama: row.get('Nama') || '',
      username: row.get('Username') || '',
      rule: row.get('Rule') || 'Staf',
    })).filter(u => u.nama); // Filter out empty rows

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Fetch Users Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data user dari Spreadsheet.' }, { status: 500 });
  }
}
