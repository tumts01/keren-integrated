import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

// Sheet asli di spreadsheet bernama 'Mapel' dengan kolom tunggal 'MataPelajaran'
// Fallback ke 'MataPelajaran' jika pernah dibuat oleh kode lama
const SHEET_TITLES = ['Mapel', 'MataPelajaran'];

async function getMapelSheet(doc: any) {
  // Coba cari sheet dengan nama-nama yang mungkin
  for (const title of SHEET_TITLES) {
    if (doc.sheetsByTitle[title]) return { sheet: doc.sheetsByTitle[title], title };
  }
  // Tidak ada — buat baru dengan nama 'Mapel' sesuai sheet asli
  const sheet = await doc.addSheet({ title: 'Mapel' });
  await sheet.setHeaderRow(['MataPelajaran']);
  return { sheet, title: 'Mapel' };
}

export async function GET() {
  try {
    const doc = await getIndukDoc();
    const { sheet } = await getMapelSheet(doc);

    await sheet.loadHeaderRow();
    const headers: string[] = sheet.headerValues || [];

    // Cari kolom nama mapel secara fleksibel
    const mapelColKey = headers.find(h => {
      const lower = h.toLowerCase().replace(/[\s_]/g, '');
      return lower === 'namamapel' || lower === 'mapel' || lower === 'matapelajaran'
        || lower === 'pelajaran' || lower === 'namapelajaran';
    }) || headers[0] || 'MataPelajaran'; // fallback ke kolom pertama

    const rows = await sheet.getRows();
    const data = rows
      .map((r: any, i: number) => ({
        id: r.get('id') || r.get('ID') || `row-${i}`,
        namaMapel: (r.get(mapelColKey) || '').trim()
      }))
      .filter((r: any) => r.namaMapel);

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
    const { sheet } = await getMapelSheet(doc);

    await sheet.loadHeaderRow();
    const headers: string[] = sheet.headerValues || [];

    const mapelColKey = headers.find(h => {
      const lower = h.toLowerCase().replace(/[\s_]/g, '');
      return lower === 'namamapel' || lower === 'mapel' || lower === 'matapelajaran'
        || lower === 'pelajaran' || lower === 'namapelajaran';
    }) || headers[0] || 'MataPelajaran';

    const rows = await sheet.getRows();

    if (action === 'add') {
      if (!namaMapel) return NextResponse.json({ success: false, error: 'Nama Mapel harus diisi' }, { status: 400 });
      const newRow: any = {};
      newRow[mapelColKey] = namaMapel;
      await sheet.addRow(newRow);
      return NextResponse.json({ success: true, message: 'Mata pelajaran berhasil ditambahkan' });

    } else if (action === 'edit') {
      if (!namaMapel) return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
      // Cari berdasarkan id atau nilai yang sama
      const row = rows.find((r: any) =>
        r.get('id') === id || r.get('ID') === id || r.get(mapelColKey) === id
      );
      if (!row) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
      row.set(mapelColKey, namaMapel);
      await row.save();
      return NextResponse.json({ success: true, message: 'Mata pelajaran berhasil diperbarui' });

    } else if (action === 'delete') {
      if (!id) return NextResponse.json({ success: false, error: 'ID tidak ditemukan' }, { status: 400 });
      const row = rows.find((r: any) =>
        r.get('id') === id || r.get('ID') === id || r.get(mapelColKey) === id
      );
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
