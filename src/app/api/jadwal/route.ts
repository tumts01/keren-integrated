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

export async function GET() {
  try {
    const doc = await getIndukDoc();
    let sheet = doc.sheetsByTitle[SHEET_TITLE];
    if (!sheet) {
      sheet = await doc.addSheet({ headerValues: EXPECTED_HEADERS, title: SHEET_TITLE });
    } else {
      try {
        await sheet.loadHeaderRow();
        if (!sheet.headerValues || sheet.headerValues.length === 0) {
          await sheet.setHeaderRow(EXPECTED_HEADERS);
        }
      } catch {
        await sheet.setHeaderRow(EXPECTED_HEADERS);
      }
    }

    const rows = await sheet.getRows();
    const data = rows.map(r => {
      const rowData: Record<string, any> = {};
      EXPECTED_HEADERS.forEach(header => {
        rowData[header] = r.get(header) || '';
      });
      return rowData;
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching Jadwal Mengajar:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data jadwal mengajar' }, { status: 500 });
  }
}
