import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

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

async function run() {
  const auth = buildAuth(getCredentialsJson());
  const doc = new GoogleSpreadsheet('162tUNu2WOxcQdM_Q_HGwQXpJDFctQVNUnwy7w2OUIls', auth);
  await doc.loadInfo();
  
  const sheet = doc.sheetsByTitle['BALEKNO'];
  await sheet.loadCells('A1:C10');
  
  for (let r = 0; r < 10; r++) {
    console.log(`Row ${r}:`, 
      sheet.getCell(r, 0).value,
      sheet.getCell(r, 1).value,
      sheet.getCell(r, 2).value
    );
  }
}

run().catch(console.error);
