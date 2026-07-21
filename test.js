const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');

async function main() {
  const creds = JSON.parse(fs.readFileSync('./google-credentials.json', 'utf8'));
  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const doc = new GoogleSpreadsheet('1j2Miz37WpXt91kFNx93jII9lzklRscFU1S_bb5C21OY', auth);
  await doc.loadInfo();
  
  const sheet = doc.sheetsByTitle['MASTER TEMPLATE JADWAL'];
  await sheet.loadCells({ startRowIndex: 0, endRowIndex: sheet.rowCount, startColumnIndex: 0, endColumnIndex: sheet.columnCount });
  
  const days = [
    { name: 'SENIN', r: 4, c: 3 },
    { name: 'SELASA', r: 17, c: 3 },
    { name: 'RABU', r: 30, c: 3 },
    { name: 'KAMIS', r: 4, c: 31 },
    { name: 'JUMAT', r: 17, c: 31 }, // wait, maybe JUMAT is actually here? I didn't find JUMAT here because maybe the text is missing or weird?
    { name: 'SABTU', r: 30, c: 31 }
  ];

  // Let's check what is actually at (Row 17, Col 31)
  console.log('Text at Row 17, Col 31:', sheet.getCell(17, 31).value);

  // Let's check JUMAT specifically
  console.log('Text at Row 32, Col 60:', sheet.getCell(32, 60).value);
}
main().catch(console.error);
