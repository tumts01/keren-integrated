import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

const SHEET_TITLE = 'MataPelajaran';
const EXPECTED_HEADERS = ['id', 'namaMapel'];

export async function GET() {
  try {
    const doc = await getIndukDoc();
    let sheet = doc.sheetsByTitle[SHEET_TITLE];
    if (!sheet) {
      sheet = await doc.addSheet({ headerValues: EXPECTED_HEADERS, title: SHEET_TITLE });
    } else {
      try { await sheet.loadHeaderRow(); } catch (e) {}
      await sheet.setHeaderRow(EXPECTED_HEADERS);
    }

    const rows = await sheet.getRows();
    const data = rows.map(r => ({
      id: r.get('id'),
      namaMapel: r.get('namaMapel')
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching Mata Pelajaran:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data mata pelajaran' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, namaMapel } = body;

    const doc = await getIndukDoc();
    let sheet = doc.sheetsByTitle[SHEET_TITLE];
    if (!sheet) {
      sheet = await doc.addSheet({ headerValues: EXPECTED_HEADERS, title: SHEET_TITLE });
    }

    const rows = await sheet.getRows();

    if (action === 'add') {
      if (!namaMapel) return NextResponse.json({ success: false, error: 'Nama Mapel harus diisi' }, { status: 400 });
      const newId = `MP-${Date.now()}`;
      await sheet.addRow({
        id: newId,
        namaMapel
      });
      return NextResponse.json({ success: true, message: 'Mata pelajaran berhasil ditambahkan' });
    } else if (action === 'edit') {
      if (!id || !namaMapel) return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
      const row = rows.find(r => r.get('id') === id);
      if (!row) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
      row.set('namaMapel', namaMapel);
      await row.save();
      return NextResponse.json({ success: true, message: 'Mata pelajaran berhasil diperbarui' });
    } else if (action === 'delete') {
      if (!id) return NextResponse.json({ success: false, error: 'ID tidak ditemukan' }, { status: 400 });
      const row = rows.find(r => r.get('id') === id);
      if (!row) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
      await row.delete();
      return NextResponse.json({ success: true, message: 'Mata pelajaran berhasil dihapus' });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });

  } catch (error) {
    console.error('Error modifying Mata Pelajaran:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan data mata pelajaran' }, { status: 500 });
  }
}
