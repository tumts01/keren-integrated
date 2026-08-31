const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const creds = JSON.parse(fs.readFileSync('D:/keren-integrated/' + process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
const auth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const docId = process.env.GOOGLE_SHEET_PRESENSI_ID;

function parseRow(r, headers) {
  const metadata = {};
  headers.forEach(h => {
    try { 
      let val = r.get(h) || '';
      if (typeof val === 'string') val = val.replace(/\\0/g, '');
      metadata[h] = val; 
    } catch(e) {}
  });
  return metadata;
}

const config = [
  { sheet: 'PRESENSI SISWA', table: 'data_presensi_siswa', map: (r, h) => ({ tanggal: r.get('TANGGAL') || '', kelas: r.get('KELAS') || '', metadata: parseRow(r, h) }) },
  { sheet: 'JURNAL MENGAJAR', table: 'data_jurnal_mengajar', map: (r, h) => ({ tanggal: r.get('TANGGAL') || '', kelas: r.get('KELAS') || '', metadata: parseRow(r, h) }) },
  { sheet: 'JURNAL PIKET', table: 'data_jurnal_piket', map: (r, h) => ({ tanggal: r.get('TANGGAL') || '', metadata: parseRow(r, h) }) },
  { sheet: 'DISPO SISWA', table: 'data_dispo_siswa', map: (r, h) => ({ tanggal: r.get('TANGGAL') || '', metadata: parseRow(r, h) }) },
  { sheet: 'PENGUMUMAN', table: 'data_pengumuman', map: (r, h) => ({ tanggal: r.get('Tanggal') || '', metadata: parseRow(r, h) }) },
  { sheet: 'JamConfig', table: 'data_jam_config', map: (r, h) => ({ tanggal: r.get('Tanggal') || '', metadata: parseRow(r, h) }) },
  { sheet: 'Survey_Wali_Murid', table: 'data_survey', map: (r, h) => ({ tipe_survey: 'wali_murid', metadata: parseRow(r, h) }) },
  { sheet: 'Survey_Siswa', table: 'data_survey', map: (r, h) => ({ tipe_survey: 'siswa', metadata: parseRow(r, h) }) },
  { sheet: 'Survey_Kepuasan_Ortu', table: 'data_survey', map: (r, h) => ({ tipe_survey: 'kepuasan_ortu', metadata: parseRow(r, h) }) },
];

async function migrate() {
  console.log('Menghubungkan ke Google Sheets Presensi...');
  const doc = new GoogleSpreadsheet(docId, auth);
  await doc.loadInfo();
  
  for (const cfg of config) {
    console.log('--- Migrasi ' + cfg.sheet + ' ---');
    const sheet = doc.sheetsByTitle[cfg.sheet];
    if (!sheet) {
      console.log('Skip: Sheet tidak ditemukan.');
      continue;
    }

    await sheet.loadHeaderRow().catch(() => {});
    const headers = sheet.headerValues;
    if (!headers || headers.length === 0) {
      console.log('Skip: Tidak ada header.');
      continue;
    }

    console.log('Membaca data dari Google Sheets...');
    const rows = await sheet.getRows();
    console.log('Ditemukan ' + rows.length + ' baris.');

    const payload = rows.map(r => cfg.map(r, headers));

    const chunkSize = 500;
    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      const { error } = await supabase.from(cfg.table).insert(chunk);
      if (error) {
        console.error('Error insert chunk ' + i + ':', error.message);
      } else {
        console.log('Berhasil insert baris ' + i + ' sampai ' + (i + chunk.length));
      }
    }
    console.log('Selesai migrasi ' + cfg.sheet);
  }

  // Khusus MASTER TEMPLATE JADWAL (tanpa header jelas)
  console.log('--- Migrasi MASTER TEMPLATE JADWAL ---');
  const sheetMaster = doc.sheetsByTitle['MASTER TEMPLATE JADWAL'];
  if (sheetMaster) {
    await sheetMaster.loadCells('A1:Z100'); // Load everything
    const rawData = [];
    for (let i = 0; i < sheetMaster.rowCount && i < 100; i++) {
      const rowArr = [];
      for (let j = 0; j < 26; j++) { // A to Z
        const cell = sheetMaster.getCell(i, j);
        rowArr.push(cell.value || '');
      }
      if (rowArr.some(v => v !== '')) {
        rawData.push(rowArr);
      }
    }
    const { error } = await supabase.from('data_master_jadwal').insert([{ metadata: { rows: rawData } }]);
    if (error) console.error('Error insert master jadwal:', error.message);
    else console.log('Berhasil migrasi MASTER TEMPLATE JADWAL');
  }

  console.log('MIGRASI PRESENSI SELESAI!');
}

migrate();
