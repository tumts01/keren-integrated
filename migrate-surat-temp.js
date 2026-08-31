const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: 'D:\\keren-integrated\\.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  const credsPath = 'D:\\keren-integrated\\google-credentials.json';
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet('1nZINEbfTS48NS3AGMbmyxmUiP8jTdpJOhkjDtgBc9SY', auth);
  await doc.loadInfo();
  console.log('Connected to Google Sheets:', doc.title);

  const parseRow = (r, headers) => {
    const meta = {};
    headers.forEach(h => {
      try {
        let val = r.get(h) || '';
        if (typeof val === 'string') val = val.replace(/\\0/g, ''); // strip null bytes
        meta[h] = val;
      } catch (e) {}
    });
    return meta;
  };

  // Helper for batch inserting
  const insertInBatches = async (table, payload) => {
    const chunkSize = 500;
    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      const { error } = await supabase.from(table).insert(chunk);
      if (error) {
        console.error(`Error inserting into ${table} at chunk ${i}:`, error.message);
      } else {
        console.log(`Inserted rows ${i} to ${i + chunk.length} into ${table}`);
      }
    }
  };

  // 1. NO SURAT KELUAR -> data_surat_keluar
  const sheetKeluar = doc.sheetsByTitle['NO SURAT KELUAR'];
  if (sheetKeluar) {
    await sheetKeluar.loadHeaderRow().catch(() => {});
    const headers = sheetKeluar.headerValues;
    const rows = await sheetKeluar.getRows();
    const payload = rows.map(r => ({ metadata: parseRow(r, headers) }));
    console.log(`Migrating ${payload.length} rows to data_surat_keluar...`);
    await insertInBatches('data_surat_keluar', payload);
  }

  // 2. ARSIP SURAT MASUK -> data_surat_masuk
  const sheetMasuk = doc.sheetsByTitle['ARSIP SURAT MASUK'];
  if (sheetMasuk) {
    await sheetMasuk.loadHeaderRow().catch(() => {});
    const headers = sheetMasuk.headerValues;
    const rows = await sheetMasuk.getRows();
    const payload = rows.map(r => ({ metadata: parseRow(r, headers) }));
    console.log(`Migrating ${payload.length} rows to data_surat_masuk...`);
    await insertInBatches('data_surat_masuk', payload);
  }

  // 3. KODE SURAT -> data_kode_surat
  const sheetKode = doc.sheetsByTitle['KODE SURAT'];
  if (sheetKode) {
    await sheetKode.loadCells('A1:B1000');
    const payload = [];
    for (let i = 2; i < 1000; i++) {
      try {
        const kodeVal = sheetKode.getCell(i, 0).value;
        const topikVal = sheetKode.getCell(i, 1).value;
        if (kodeVal && topikVal) {
          payload.push({ kode: kodeVal.toString().trim(), topik: topikVal.toString().trim() });
        }
      } catch (e) {
        // Stop if cell doesn't exist
        break;
      }
    }
    console.log(`Migrating ${payload.length} rows to data_kode_surat...`);
    if (payload.length > 0) {
      const { error } = await supabase.from('data_kode_surat').insert(payload);
      if (error) console.error(error.message);
    }
  }

  // 4. RIWAYAT_CETAK -> data_riwayat_cetak_surat
  const sheetRiwayat = doc.sheetsByTitle['RIWAYAT_CETAK'];
  if (sheetRiwayat) {
    await sheetRiwayat.loadHeaderRow().catch(() => {});
    const rows = await sheetRiwayat.getRows();
    const payload = [];
    rows.forEach(r => {
      try {
        const val = r.get('DataJSON') || '';
        if (val) {
          payload.push({ data_json: JSON.parse(val) });
        }
      } catch (e) {}
    });
    console.log(`Migrating ${payload.length} rows to data_riwayat_cetak_surat...`);
    await insertInBatches('data_riwayat_cetak_surat', payload);
  }

  // 5. notulen -> data_notulen
  const sheetNotulen = doc.sheetsByTitle['notulen'];
  if (sheetNotulen) {
    await sheetNotulen.loadHeaderRow().catch(() => {});
    const headers = sheetNotulen.headerValues;
    const rows = await sheetNotulen.getRows();
    const payload = rows.map(r => ({ metadata: parseRow(r, headers) }));
    console.log(`Migrating ${payload.length} rows to data_notulen...`);
    await insertInBatches('data_notulen', payload);
  }

  // 6. lpj kegiatan -> data_lpj_kegiatan
  const sheetLpj = doc.sheetsByTitle['lpj kegiatan'];
  if (sheetLpj) {
    await sheetLpj.loadHeaderRow().catch(() => {});
    const headers = sheetLpj.headerValues;
    const rows = await sheetLpj.getRows();
    const payload = rows.map(r => ({ metadata: parseRow(r, headers) }));
    console.log(`Migrating ${payload.length} rows to data_lpj_kegiatan...`);
    await insertInBatches('data_lpj_kegiatan', payload);
  }

  console.log('Migration completed!');
}

migrate();
