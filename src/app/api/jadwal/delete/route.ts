import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

const SHEET_TITLE = 'JadwalMengajar';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID tidak ditemukan' }, { status: 400 });
    }

    const doc = await getIndukDoc();
    const sheet = doc.sheetsByTitle[SHEET_TITLE];
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tabel jadwal belum dibuat' }, { status: 404 });
    }

    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('id') === id);
    
    if (!row) {
      return NextResponse.json({ success: false, error: 'Data jadwal tidak ditemukan' }, { status: 404 });
    }

    await row.delete();
    return NextResponse.json({ success: true, message: 'Jadwal berhasil dihapus' });

  } catch (error) {
    console.error('Error deleting Jadwal Mengajar:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus jadwal mengajar' }, { status: 500 });
  }
}
