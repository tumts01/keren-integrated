const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const creds = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
const auth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const docId = '13HF086UNQcIxjwi8Adpow-n_qKbgOtX1SiXTe-JgTOY';

function parseRow(r, headers) {
  const metadata = {};
  headers.forEach(h => {
    try { 
      let val = r.get(h) || '';
      if (typeof val === 'string') val = val.replace(/\0/g, '');
      metadata[h] = val; 
    } catch(e) {}
  });
  return metadata;
}

const config = [
  { sheet: 'SD/MI', table: 'data_sd', map: (r, h) => ({ nama: r.get('NAMA SEKOLAH') || '', npsn: r.get('NPSN') || '', metadata: parseRow(r, h) }) },
  { sheet: 'PROFIL LEMBAGA', table: 'profil_lembaga', map: (r, h) => ({ jenis: r.get('JENIS DATA') || '', isi: r.get('ISI') || '', metadata: parseRow(r, h) }) },
  { sheet: 'SPMB', table: 'data_spmb', map: (r, h) => ({ nama: r.get('Nama Lengkap') || '', nisn: r.get('NISN') || '', metadata: parseRow(r, h) }) },
  { sheet: 'Absen_GTK', table: 'absen_gtk', map: (r, h) => ({ nama: r.get('Nama') || '', tanggal: r.get('tanggal') || '', metadata: parseRow(r, h) }) },
  { sheet: 'Libur_GTK', table: 'libur_gtk', map: (r, h) => ({ tanggal: r.get('tanggal') || '', keterangan: r.get('keterangan') || '', metadata: parseRow(r, h) }) },
  { sheet: 'JadwalMengajar', table: 'jadwal_mengajar', map: (r, h) => ({ nama_guru: r.get('namaGuru') || '', mapel: r.get('mataPelajaran') || '', metadata: parseRow(r, h) }) },
  { sheet: 'MataPelajaran', table: 'mata_pelajaran', map: (r, h) => ({ nama: r.get('namaMapel') || '', metadata: parseRow(r, h) }) },
  { sheet: 'Data_EMIS', table: 'data_emis', map: (r, h) => ({ nisn: r.get('NISN') || '', nama: r.get('Nama') || '', metadata: parseRow(r, h) }) },
  { sheet: 'NamaEmis', table: 'nama_emis', map: (r, h) => ({ nisn: r.get('NISN') || '', nama: r.get('NAMA') || '', metadata: parseRow(r, h) }) },
];

async function migrate() {
  console.log('Menghubungkan ke Google Sheets...');
  const doc = new GoogleSpreadsheet(docId, auth);
  await doc.loadInfo();
  
  for (const cfg of config) {
    console.log('--- Migrasi ' + cfg.sheet + ' ---');
    const sheet = doc.sheetsByTitle[cfg.sheet];
    if (!sheet) {
      console.log('TIDAK DITEMUKAN: ' + cfg.sheet);
      continue;
    }
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const headers = sheet.headerValues;
    const payload = rows.map(r => cfg.map(r, headers));
    
    if (payload.length > 0) {
      await supabase.from(cfg.table).delete().gt('id', 0); // clear
      
      const chunkSize = 500;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error } = await supabase.from(cfg.table).insert(chunk);
        if (error) console.error('Error insert chunk:', error);
      }
      console.log('Berhasil insert ' + payload.length + ' data ke ' + cfg.table);
    } else {
      console.log('Kosong.');
    }
  }

  // Khusus LINK (karena tidak ada header, kita jadikan array jsonb)
  console.log('--- Migrasi LINK ---');
  const sheetLink = doc.sheetsByTitle['LINK'];
  if (sheetLink) {
    await sheetLink.loadCells('A1:C100'); // Load everything roughly
    let rowIdx = 0;
    const links = [];
    while (true) {
      const cell1 = sheetLink.getCell(rowIdx, 0).value;
      if (!cell1) break;
      links.push({
        metadata: {
          col1: cell1,
          col2: sheetLink.getCell(rowIdx, 1).value || '',
          col3: sheetLink.getCell(rowIdx, 2).value || '',
        }
      });
      rowIdx++;
    }
    if (links.length > 0) {
      await supabase.from('data_link').delete().gt('id', 0);
      await supabase.from('data_link').insert(links);
      console.log('Berhasil insert ' + links.length + ' data ke data_link');
    }
  }

  console.log('SEMUA SELESAI!');
}

migrate();
