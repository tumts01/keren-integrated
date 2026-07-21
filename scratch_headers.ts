import { getIndukDoc } from './src/lib/google-sheets';

async function main() {
  try {
    const doc = await getIndukDoc();
    const sheetGtk = doc.sheetsByTitle['db_GTK'];
    if (sheetGtk) {
      await sheetGtk.loadHeaderRow();
      console.log('db_GTK headers:', sheetGtk.headerValues);
    } else {
      console.log('db_GTK not found');
    }

    const sheetJadwal = doc.sheetsByTitle['JadwalMengajar'];
    if (sheetJadwal) {
      await sheetJadwal.loadHeaderRow();
      console.log('JadwalMengajar headers:', sheetJadwal.headerValues);
    } else {
      console.log('JadwalMengajar not found');
    }

    const sheetSiswa = doc.sheetsByTitle['DATABASE'];
    if (sheetSiswa) {
      await sheetSiswa.loadHeaderRow();
      console.log('DATABASE headers:', sheetSiswa.headerValues);
    } else {
      console.log('DATABASE not found');
    }
  } catch (err) {
    console.error(err);
  }
}
main();
