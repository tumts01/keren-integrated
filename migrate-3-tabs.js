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

async function migrate() {
  console.log('Menghubungkan ke Google Sheets...');
  const doc = new GoogleSpreadsheet(docId, auth);
  await doc.loadInfo();
  
  // 1. GURU
  console.log('--- Migrasi Guru ---');
  let sheet = doc.sheetsByTitle['db_GTK'];
  await sheet.loadHeaderRow();
  let rows = await sheet.getRows();
  let headers = sheet.headerValues;
  let payload = rows.map(r => {
    return {
      nama: (r.get('Nama') || '').trim().replace(/\0/g, ''),
      nomor_induk: (r.get('Nomor Induk Pegawai') || '').trim(),
      metadata: parseRow(r, headers)
    };
  }).filter(k => k.nama);
  await supabase.from('data_guru').delete().gt('id', 0);
  let { error } = await supabase.from('data_guru').insert(payload);
  if (error) console.error('Error Guru:', error);
  else console.log('Berhasil memindahkan ' + payload.length + ' Guru.');

  // 2. KELAS
  console.log('--- Migrasi Kelas ---');
  sheet = doc.sheetsByTitle['db_Kelas'];
  await sheet.loadHeaderRow();
  rows = await sheet.getRows();
  headers = sheet.headerValues;
  payload = rows.map(r => {
    return {
      rombel: (r.get('ROMBEL') || '').trim().replace(/\0/g, ''),
      wali_kelas: (r.get('WALI KELAS') || '').trim(),
      metadata: parseRow(r, headers)
    };
  }).filter(k => k.rombel);
  await supabase.from('data_kelas').delete().gt('id', 0);
  ({ error } = await supabase.from('data_kelas').insert(payload));
  if (error) console.error('Error Kelas:', error);
  else console.log('Berhasil memindahkan ' + payload.length + ' Kelas.');

  // 3. USERS
  console.log('--- Migrasi Users ---');
  sheet = doc.sheetsByTitle['Users'];
  await sheet.loadHeaderRow();
  rows = await sheet.getRows();
  headers = sheet.headerValues;
  payload = rows.map(r => {
    return {
      username: (r.get('Username') || '').trim().replace(/\0/g, ''),
      nama: (r.get('Nama') || '').trim(),
      role: (r.get('Role') || '').trim(),
      metadata: parseRow(r, headers)
    };
  }).filter(k => k.username);
  await supabase.from('data_users').delete().gt('id', 0);
  ({ error } = await supabase.from('data_users').insert(payload));
  if (error) console.error('Error Users:', error);
  else console.log('Berhasil memindahkan ' + payload.length + ' Users.');

  console.log('SEMUA SELESAI!');
}

migrate();
