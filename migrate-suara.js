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

const docId = '1cfMdNVk0iOKNq1MV05UJ07vXH0JTvhIYh_StZuNZd-4';

async function migrate() {
  console.log('Menghubungkan ke Google Sheets...');
  const doc = new GoogleSpreadsheet(docId, auth);
  await doc.loadInfo();
  
  const sheet = doc.sheetsByTitle['Suara Osim'];
  if (!sheet) {
    console.log('Tidak ada sheet Suara Osim atau masih kosong.');
    return;
  }
  
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  console.log('Ditemukan ' + rows.length + ' suara di Google Sheets.');
  
  const payload = rows.map(r => ({
    waktu: r.get('Waktu') || '',
    nama_pemilih: (r.get('Nama Pemilih') || '').trim(),
    nama_paslon: (r.get('Nama Paslon') || '').trim()
  })).filter(k => k.nama_pemilih && k.nama_paslon);

  if (payload.length === 0) {
    console.log('Tidak ada data yang perlu dikirim.');
    return;
  }

  console.log('Mengirim ' + payload.length + ' suara ke Supabase...');
  
  const { data, error } = await supabase.from('suara_osim').insert(payload);
  
  if (error) console.error('Error saat insert:', error);
  else console.log('BERHASIL! Data suara pindah ke Supabase.');
}

migrate();
