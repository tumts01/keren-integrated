import { NextResponse } from 'next/server';
import { getBontuDoc } from '@/lib/google-sheets';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').toLowerCase();

    const doc = await getBontuDoc();
    const sheet = doc.sheetsByTitle['BonData'] || doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    let data = rows.map(row => row.toObject());

    // Order by newest first (assuming Timestamp is at the end or we reverse)
    data = data.reverse();

    if (search) {
      data = data.filter(item => {
        const name = (item['Nama'] || '').toLowerCase();
        const id = (item['ID'] || '').toLowerCase();
        const tgl = (item['Tanggal'] || '').toLowerCase();
        return name.includes(search) || id.includes(search) || tgl.includes(search);
      });
    }

    return NextResponse.json({
      data,
      meta: {
        total: data.length
      }
    });

  } catch (error: any) {
    console.error('Error fetching BON Data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
