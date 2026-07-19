import { NextResponse } from 'next/server';
import { getBontuDoc } from '@/lib/google-sheets';

export async function GET() {
  try {
    const doc = await getBontuDoc();
    const sheet = doc.sheetsByTitle['MasterToko'];
    const rows = await sheet.getRows();
    const data = rows.map(r => r.toObject()).filter(r => r['NamaToko']);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { namaToko, alamat, jenis } = body;
    if (!namaToko) return NextResponse.json({ success: false, error: 'Nama toko wajib diisi' }, { status: 400 });

    const doc = await getBontuDoc();
    const sheet = doc.sheetsByTitle['MasterToko'];
    const rows = await sheet.getRows();
    const id = `TKO-${Date.now()}`;

    await sheet.addRow({ ID: id, NamaToko: namaToko, Alamat: alamat || '', Jenis: jenis || 'Penyedia' });
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const doc = await getBontuDoc();
    const sheet = doc.sheetsByTitle['MasterToko'];
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('ID') === id);
    if (row) await row.delete();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
