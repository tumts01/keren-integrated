import { NextResponse } from 'next/server';
import { getSiswaDoc } from '@/lib/google-sheets';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = (searchParams.get('search') || '').toLowerCase();

    const doc = await getSiswaDoc();
    const sheet = doc.sheetsByIndex[0]; // Assuming first sheet contains Data Siswa
    const rows = await sheet.getRows();

    let data = rows.map(row => row.toObject());

    // Basic search by NAMA or NISN
    if (search) {
      data = data.filter(item => {
        const name = (item['NAMA'] || item['Nama'] || item['NAMA SISWA'] || '').toLowerCase();
        const nisn = (item['NISN'] || '').toLowerCase();
        return name.includes(search) || nisn.includes(search);
      });
    }

    const total = data.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedData = data.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages
      }
    });

  } catch (error: any) {
    console.error('Error fetching Siswa Data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
