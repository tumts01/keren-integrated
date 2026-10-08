const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const creds = require('./google-credentials.json');

async function main() {
  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const doc = new GoogleSpreadsheet('1B-7CQCmGg8r7eAXGV-__dtCOdoIbiDK705vSTB3SMBc', serviceAccountAuth);
  await doc.loadInfo();
  console.log('Doc title:', doc.title);
  const sheet = doc.sheetsByTitle['CAMPURADUK'];
  if (!sheet) {
    console.log('Sheet CAMPURADUK not found');
    return;
  }
  await sheet.loadHeaderRow();
  console.log('Headers:', sheet.headerValues);
  
  const rows = await sheet.getRows({ limit: 3 });
  rows.forEach(r => console.log(r._rawData));
}
main().catch(console.error);
