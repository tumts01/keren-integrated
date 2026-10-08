const { createClient } = require('@supabase/supabase-js');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs');
require('dotenv').config({ path: 'D:\\keren-integrated\\.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching data_induk from Supabase...');
  const { data: rows, error } = await supabase.from('data_induk').select('*');
  
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  
  console.log(`Found ${rows.length} rows.`);

  // Load Google Sheet
  let sheet;
  try {
    const creds = require('D:\\keren-integrated\\google-credentials.json');
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_INDUK_ID);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    sheet = doc.sheetsByTitle['DATABASE'];
    console.log('Google Sheet loaded.');
  } catch (err) {
    console.log('Could not load Google Sheet (maybe not needed):', err.message);
  }

  let sheetRows = [];
  if (sheet) {
    sheetRows = await sheet.getRows();
  }

  let updatedCount = 0;

  for (const row of rows) {
    if (!row.metadata) continue;
    let metadata = { ...row.metadata };
    let changed = false;

    const domisili = (metadata['DOMISILI'] || '').trim().toLowerCase();
    
    // Rule 1: Rumah
    if (domisili.includes('rumah')) {
      if (!metadata['JARAK TEMPAT TINGGAL - MADRASAH/SEKOLAH']?.trim()) {
        metadata['JARAK TEMPAT TINGGAL - MADRASAH/SEKOLAH'] = '-+ 10Km';
        changed = true;
      }
      if (!metadata['TRANSPORTASI KE SEKOLAH']?.trim()) {
        metadata['TRANSPORTASI KE SEKOLAH'] = 'Sepeda Motor';
        changed = true;
      }
      if (!metadata['WAKTU TEMPUH']?.trim()) {
        metadata['WAKTU TEMPUH'] = '-+ 20 Menit';
        changed = true;
      }
    } 
    // Rule 2: Pesantren (Anything other than Rumah, as long as it's not empty)
    else if (domisili !== '') {
      if (!metadata['JARAK TEMPAT TINGGAL - MADRASAH/SEKOLAH']?.trim()) {
        metadata['JARAK TEMPAT TINGGAL - MADRASAH/SEKOLAH'] = '-+ 1Km';
        changed = true;
      }
      if (!metadata['TRANSPORTASI KE SEKOLAH']?.trim()) {
        metadata['TRANSPORTASI KE SEKOLAH'] = 'Jalan Kaki';
        changed = true;
      }
      if (!metadata['WAKTU TEMPUH']?.trim()) {
        metadata['WAKTU TEMPUH'] = '-+ 10 Menit';
        changed = true;
      }
    }

    if (changed) {
      // 1. Update Supabase
      const { error: updateError } = await supabase
        .from('data_induk')
        .update({ metadata })
        .eq('id', row.id);
        
      if (updateError) {
        console.error(`Error updating row ID ${row.id}:`, updateError);
        continue;
      }
      
      // 2. Update Google Sheet
      if (sheet && sheetRows.length > 0) {
        const nis = metadata['ID SISWA'];
        const sRow = sheetRows.find(r => r['ID SISWA'] === nis || r['NISN'] === metadata['NISN']);
        if (sRow) {
          sRow['JARAK TEMPAT TINGGAL - MADRASAH/SEKOLAH'] = metadata['JARAK TEMPAT TINGGAL - MADRASAH/SEKOLAH'];
          sRow['TRANSPORTASI KE SEKOLAH'] = metadata['TRANSPORTASI KE SEKOLAH'];
          sRow['WAKTU TEMPUH'] = metadata['WAKTU TEMPUH'];
          await sRow.save();
        }
      }

      updatedCount++;
      process.stdout.write(`Updated ${metadata['NAMA']}... \n`);
    }
  }

  console.log(`\nFinished! Total records updated: ${updatedCount}`);
}

run();
