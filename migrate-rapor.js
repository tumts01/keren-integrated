import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function buildAuth(credJson) {
  const credentials = JSON.parse(credJson);
  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getCredentialsJson() {
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json';
  return fs.readFileSync(path.resolve(credsPath), 'utf8');
}

// Convert Google Sheets serial date to JS Date
function excelDateToJSDate(serial) {
  if (!serial) return null;
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  // This is UTC, we might need to adjust timezone if the spreadsheet is in GMT+7
  const d = new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
  // Subtract 7 hours because Google Sheets returns local time as serial but JS treats the components as local
  return d.toISOString(); 
}

async function run() {
  console.log('Connecting to Google Sheets...');
  const auth = buildAuth(getCredentialsJson());
  const doc = new GoogleSpreadsheet('162tUNu2WOxcQdM_Q_HGwQXpJDFctQVNUnwy7w2OUIls', auth);
  await doc.loadInfo();
  
  // 1. Migrate CONFIG
  console.log('Migrating CONFIG...');
  const configSheet = doc.sheetsByTitle['CONFIG'];
  await configSheet.loadCells('A1:B20');
  
  const configData = [];
  for (let r = 1; r < configSheet.rowCount; r++) {
    const key = configSheet.getCell(r, 0).value;
    const value = configSheet.getCell(r, 1).value;
    if (key) {
      configData.push({ key: String(key), value: String(value || '') });
    } else {
      break;
    }
  }
  
  if (configData.length > 0) {
    const { error: errConfig } = await supabase.from('rapor_config').upsert(configData, { onConflict: 'key' });
    if (errConfig) console.error('Error inserting config:', errConfig);
    else console.log(`Inserted ${configData.length} config rows.`);
  }

  // 2. Migrate BALEKNO
  console.log('Migrating BALEKNO...');
  const baleknoSheet = doc.sheetsByTitle['BALEKNO'];
  
  // BALEKNO can be very large. We'll read in batches.
  const batchSize = 1000;
  let totalMigrated = 0;
  let emptyCount = 0;
  
  for (let startRow = 1; startRow < baleknoSheet.rowCount; startRow += batchSize) {
    const endRow = Math.min(startRow + batchSize - 1, baleknoSheet.rowCount - 1);
    await baleknoSheet.loadCells(`B${startRow + 1}:C${endRow + 1}`);
    
    const batch = [];
    for (let r = startRow; r <= endRow; r++) {
      const scanData = baleknoSheet.getCell(r, 1).value;
      const scanTime = baleknoSheet.getCell(r, 2).value;
      
      if (!scanData) {
        emptyCount++;
        if (emptyCount > 10) break; // stop if we hit many empty rows
        continue;
      }
      emptyCount = 0;
      
      batch.push({
        scan_data: String(scanData),
        waktu: typeof scanTime === 'number' ? excelDateToJSDate(scanTime) : null
      });
    }
    
    if (batch.length > 0) {
      const { error: errBatch } = await supabase.from('rapor_pengembalian').insert(batch);
      if (errBatch) {
        console.error('Error inserting batch:', errBatch);
      } else {
        totalMigrated += batch.length;
        console.log(`Inserted ${totalMigrated} rows so far...`);
      }
    }
    
    if (emptyCount > 10) break;
  }
  
  console.log(`Migration completed! Total BALEKNO records migrated: ${totalMigrated}`);
}

run().catch(console.error);
