import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function GET() {
  try {
    const doc = await getIndukDoc();
    const sheetGtk = doc.sheetsByTitle['db_GTK'];
    let gtkHeaders: string[] = [];
    if (sheetGtk) {
      await sheetGtk.loadHeaderRow();
      gtkHeaders = sheetGtk.headerValues;
    }

    const sheetJadwal = doc.sheetsByTitle['JadwalMengajar'];
    let jadwalHeaders: string[] = [];
    if (sheetJadwal) {
      await sheetJadwal.loadHeaderRow();
      jadwalHeaders = sheetJadwal.headerValues;
    }

    const sheetSiswa = doc.sheetsByTitle['DATABASE'];
    let siswaHeaders: string[] = [];
    let domisiliSample: Record<string, number> = {};
    let headerKolom10 = '';
    if (sheetSiswa) {
      await sheetSiswa.loadHeaderRow();
      siswaHeaders = sheetSiswa.headerValues;
      headerKolom10 = siswaHeaders[10] || '(kosong)';

      // Ambil nilai unik kolom domisili (index 10)
      const rows = await sheetSiswa.getRows();
      rows.forEach((r: any) => {
        const val = (r.get(headerKolom10) || '').toString().trim();
        domisiliSample[val] = (domisiliSample[val] || 0) + 1;
      });
    }

    return NextResponse.json({
      gtkHeaders,
      jadwalHeaders,
      siswaHeaders,
      debug_domisili: {
        headerKolom10,
        nilaiUnik: domisiliSample
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
