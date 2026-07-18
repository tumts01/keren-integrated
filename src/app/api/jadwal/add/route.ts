import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

const SHEET_TITLE = 'JadwalMengajar';
const EXPECTED_HEADERS = [
  'id', 'kodeGuru', 'namaGuru', 'statusGuru', 'mataPelajaran',
  'VII_A', 'VII_B', 'VII_C', 'VII_D', 'VII_E', 'VII_F', 'VII_G', 'VII_H', 'VII_I',
  'VIII_A', 'VIII_B', 'VIII_C', 'VIII_D', 'VIII_E', 'VIII_F', 'VIII_G', 'VIII_H', 'VIII_I',
  'IX_A', 'IX_B', 'IX_C', 'IX_D', 'IX_E', 'IX_F', 'IX_G', 'IX_H', 'IX_I',
  'totalJam', 'keterangan'
];

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.kodeGuru || !data.namaGuru || !data.mataPelajaran) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap (Kode Guru, Nama, dan Mapel wajib diisi)' }, { status: 400 });
    }

    const doc = await getIndukDoc();
    let sheet = doc.sheetsByTitle[SHEET_TITLE];
    if (!sheet) {
      sheet = await doc.addSheet({ headerValues: EXPECTED_HEADERS, title: SHEET_TITLE });
    } else {
      try { await sheet.loadHeaderRow(); } catch (e) {}
      await sheet.setHeaderRow(EXPECTED_HEADERS);
    }

    const rows = await sheet.getRows();

    // Data payload from frontend might contain 'id' if it's an edit
    if (data.id) {
      const row = rows.find(r => r.get('id') === data.id);
      if (row) {
        EXPECTED_HEADERS.forEach(header => {
          if (header !== 'id' && data[header] !== undefined) {
            row.set(header, data[header]);
          }
        });
        await row.save();
        return NextResponse.json({ success: true, message: 'Jadwal berhasil diperbarui' });
      }
    }

    // Add new
    const newId = `JDWL-${Date.now()}`;
    const rowData: Record<string, any> = { id: newId };
    EXPECTED_HEADERS.forEach(header => {
      if (header !== 'id') {
        rowData[header] = data[header] || '';
      }
    });

    await sheet.addRow(rowData);
    return NextResponse.json({ success: true, message: 'Jadwal berhasil ditambahkan' });

  } catch (error) {
    console.error('Error adding Jadwal Mengajar:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan data jadwal mengajar' }, { status: 500 });
  }
}
