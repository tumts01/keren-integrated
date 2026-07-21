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
    if (sheetSiswa) {
      await sheetSiswa.loadHeaderRow();
      siswaHeaders = sheetSiswa.headerValues;
    }

    return NextResponse.json({
      gtkHeaders,
      jadwalHeaders,
      siswaHeaders
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
