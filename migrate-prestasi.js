const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const creds = require('./google-credentials.json');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet('1B-7CQCmGg8r7eAXGV-__dtCOdoIbiDK705vSTB3SMBc', serviceAccountAuth);
  await doc.loadInfo();
  
  const sheet = doc.sheetsByTitle['CAMPURADUK'];
  
  await sheet.loadCells(`A6:N${sheet.rowCount}`);
  
  const payloads = [];
  for (let r = 6; r < sheet.rowCount; r++) {
    let nama = '';
    try {
      nama = sheet.getCell(r, 3).value;
    } catch(e) {
      continue;
    }
    if (!nama) continue; // Skip empty rows

    const tanggal = sheet.getCell(r, 2).value;
    const no = sheet.getCell(r, 0).value;
    const tahunPelajaran = sheet.getCell(r, 1).value; 
    
    const kelas = sheet.getCell(r, 4).value || '';
    const namaLomba = sheet.getCell(r, 5).value || '';
    const penyelenggara = sheet.getCell(r, 6).value || '';
    const peringkat = sheet.getCell(r, 7).value || '';
    const tingkat = sheet.getCell(r, 8).value || '';
    const linkSertifikat = sheet.getCell(r, 9).value || '';
    const induk = sheet.getCell(r, 11).value || '';
    const sertifikatFisik = sheet.getCell(r, 12).value || '';
    const emis = sheet.getCell(r, 13).value || '';

    const metadata = {
      no: no || '',
      tahun_pelajaran: tahunPelajaran || '',
      tanggal: tanggal || '',
      nama: nama || '',
      kelas: kelas || '',
      nama_lomba: namaLomba || '',
      penyelenggara: penyelenggara || '',
      peringkat: peringkat || '',
      tingkat: tingkat || '',
      link_sertifikat: linkSertifikat || '',
      induk: induk || '',
      sertifikat_fisik: sertifikatFisik || '',
      emis: emis || ''
    };

    payloads.push({ metadata });
  }

  console.log(`Found ${payloads.length} records. Uploading to Supabase...`);
  
  // Clear existing data to avoid duplicates
  console.log('Clearing existing data...');
  await supabase.from('data_prestasi').delete().neq('id', 0);

  // Insert in chunks of 100 to avoid request size limits
  console.log('Inserting new data in chunks...');
  for (let i = 0; i < payloads.length; i += 100) {
    const chunk = payloads.slice(i, i + 100);
    const { error } = await supabase.from('data_prestasi').insert(chunk);
    if (error) {
      console.error(`Migration failed at chunk ${i}:`, error);
      return;
    }
  }
  
  console.log('Migration successful!');
}

main().catch(console.error);
