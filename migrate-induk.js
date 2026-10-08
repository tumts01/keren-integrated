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

async function migrate() {
  console.log('Menghubungkan ke Google Sheets Data Induk...');
  const doc = new GoogleSpreadsheet(docId, auth);
  await doc.loadInfo();
  
  const sheet = doc.sheetsByTitle['DATABASE'];
  
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  console.log('Ditemukan ' + rows.length + ' data siswa di Google Sheets.');
  
  const headers = sheet.headerValues;

  const payload = rows.map(r => {
    const metadata = {};
    headers.forEach(h => {
      try { 
        let val = r.get(h) || '';
        if (typeof val === 'string') val = val.replace(/\0/g, '');
        metadata[h] = val; 
      } catch(e) {}
    });

    return {
      id_siswa: r.get('ID SISWA') || '',
      nama: (r.get('NAMA') || '').trim().replace(/\0/g, ''),
      metadata
    };
  }).filter(k => k.nama && k.id_siswa);

  console.log('Mengirim ' + payload.length + ' data ke Supabase...');
  
  const chunkSize = 200;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const { error } = await supabase.from('data_induk').insert(chunk);
    if (error) {
      console.error('Error saat insert chunk ' + i + ':', error);
    } else {
      console.log('Berhasil insert ' + (i + chunk.length) + ' data...');
    }
  }
  
  console.log('SELESAI! Data Induk pindah ke Supabase.');
}

migrate();
