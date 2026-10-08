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

const docId = '1cfMdNVk0iOKNq1MV05UJ07vXH0JTvhIYh_StZuNZd-4'; // spreadsheet Pemetaan / E-Voting

async function migrate() {
  console.log('Menghubungkan ke Google Sheets...');
  const doc = new GoogleSpreadsheet(docId, auth);
  await doc.loadInfo();
  
  const sheet = doc.sheetsByTitle['Kandidat Osim'];
  if (!sheet) {
    console.error('Sheet Kandidat Osim tidak ditemukan!');
    return;
  }
  
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  console.log('Ditemukan ' + rows.length + ' data paslon di Google Sheets.');
  
  const payload = rows.map(r => ({
    nomor_urut: r.get('Nomor Urut') || '',
    nama_paslon: (r.get('Nama Paslon') || '').trim(),
    visi: r.get('Visi') || '',
    misi: r.get('Misi') || '',
    foto_ketua: r.get('Link Foto Ketua') || r.get('Link Foto') || '',
    foto_wakil: r.get('Link Foto Wakil') || ''
  })).filter(k => k.nama_paslon); // Hanya ambil yang ada namanya

  console.log('Mengirim ' + payload.length + ' data ke Supabase...');
  
  const { data, error } = await supabase.from('kandidat_osim').insert(payload);
  
  if (error) console.error('Error saat insert:', error);
  else console.log('BERHASIL! Data kandidat pindah ke Supabase.');
}

migrate();
