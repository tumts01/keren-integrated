import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function POST(request: Request) {
  try {
    const { tanggal, keterangan } = await request.json(); // tanggal format: DD/MM/YYYY

    if (!tanggal || !keterangan) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const doc = await getIndukDoc();
    const liburExpectedHeaders = ['tanggal', 'keterangan'];
    let sheet = doc.sheetsByTitle['Libur_GTK'];
    if (!sheet) {
      sheet = await doc.addSheet({ headerValues: liburExpectedHeaders, title: 'Libur_GTK' });
    } else {
      try { await sheet.loadHeaderRow(); } catch(e) {}
      await sheet.setHeaderRow(liburExpectedHeaders);
    }

    const rows = await sheet.getRows();
    const existing = rows.find(r => r.get('tanggal') === tanggal);

    if (existing) {
      existing.set('keterangan', keterangan);
      await existing.save();
    } else {
      await sheet.addRow({ tanggal, keterangan });
    }

    return NextResponse.json({ success: true, message: 'Hari libur berhasil disimpan' });

  } catch (error) {
    console.error('Libur POST error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses data libur' }, { status: 500 });
  }
}
