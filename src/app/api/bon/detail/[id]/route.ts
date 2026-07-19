import { NextResponse } from 'next/server';
import { getBontuDoc } from '@/lib/google-sheets';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);

    const doc = await getBontuDoc();
    const sheet = doc.sheetsByTitle['BonData'];
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('NoBon') === decodedId || r.get('ID') === decodedId);

    if (!row) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });

    const bon = row.toObject();

    // Also get realisasi if exists
    const buktiSheet = doc.sheetsByTitle['BelanjaBukti'];
    const buktiRows = await buktiSheet.getRows();
    const realisasi = buktiRows
      .map(r => r.toObject())
      .find(r => r['NoBon'] === decodedId || r['BonID'] === decodedId);

    return NextResponse.json({ success: true, bon, realisasi: realisasi || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
