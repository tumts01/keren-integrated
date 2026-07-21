const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2];
  return acc;
}, {});

async function main() {
  const creds = JSON.parse(fs.readFileSync('./google-credentials.json', 'utf8'));
  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const doc = new GoogleSpreadsheet(env.GOOGLE_SHEET_PRESENSI_ID, auth);
  await doc.loadInfo();
  
  const sheet = doc.sheetsByTitle['MASTER TEMPLATE JADWAL'];
  if (!sheet) {
    console.log("Sheet not found!");
    return;
  }
  
  await sheet.loadHeaderRow(1);
  console.log("Headers:", sheet.headerValues);
  
  const rows = await sheet.getRows({ limit: 5 });
  console.log("Sample Row 1:", rows[0].toObject());
}
main().catch(console.error);
