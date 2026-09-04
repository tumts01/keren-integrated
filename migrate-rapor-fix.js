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
  const d = new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
  return d.toISOString(); 
}

function parseStringDate(str) {
  if (!str) return null;
  try {
    const cleanStr = str.replace(',', '').trim(); 
    const [datePart, timePart] = cleanStr.split(' ');
    if (datePart && timePart) {
       const [d, m, y] = datePart.split('/');
       const [hh, mm, ss] = timePart.split('.');
       const date = new Date(Date.UTC(y, m-1, d, hh, mm, ss || 0));
       // We subtract 7 hours so when it converts to local it matches WIB. Actually, Date.UTC assumes it's UTC. 
       // If the string is 11.14.21 WIB, we want it to be stored properly. 
       // Date.UTC(y,m,d,h,m,s) gives the UTC timestamp.
       // Let's just create a string that PG accepts directly like 'YYYY-MM-DD HH:mm:ss+07:00'
       return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss || 0).padStart(2, '0')}+07:00`;
    }
  } catch (e) {
    console.log('Failed to parse date:', str);
  }
  return null;
}

async function run() {
  console.log('Connecting to Google Sheets...');
  const auth = buildAuth(getCredentialsJson());
  const doc = new GoogleSpreadsheet('162tUNu2WOxcQdM_Q_HGwQXpJDFctQVNUnwy7w2OUIls', auth);
  await doc.loadInfo();
  
  console.log('Cleaning existing data in rapor_pengembalian...');
  const { error: delErr } = await supabase.from('rapor_pengembalian').delete().neq('id', -1);
  if (delErr) {
    console.error('Error deleting existing data:', delErr);
    return;
  }
  
  console.log('Migrating BALEKNO...');
  const baleknoSheet = doc.sheetsByTitle['BALEKNO'];
  
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
        if (emptyCount > 10) break;
        continue;
      }
      emptyCount = 0;
      
      let jsWaktu = null;
      if (typeof scanTime === 'number') {
        jsWaktu = excelDateToJSDate(scanTime);
      } else if (typeof scanTime === 'string') {
        jsWaktu = parseStringDate(scanTime);
      }
      
      batch.push({
        scan_data: String(scanData),
        waktu: jsWaktu
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
