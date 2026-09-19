const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const creds = require('./google-credentials.json');

async function main() {
  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet('1B-7CQCmGg8r7eAXGV-__dtCOdoIbiDK705vSTB3SMBc', serviceAccountAuth);
  await doc.loadInfo();
  
  const sheet = doc.sheetsByTitle['CAMPURADUK'];
  
  // get raw cells directly
  await sheet.loadCells('A1:N15');
  for (let r = 0; r < 10; r++) {
    const rowData = [];
    for (let c = 0; c < 14; c++) {
      const cell = sheet.getCell(r, c);
      rowData.push(cell.value);
    }
    console.log(`Row ${r+1}:`, rowData);
  }
}
main().catch(console.error);
