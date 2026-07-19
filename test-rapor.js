const { GoogleAuth } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');

async function main() {
  const auth = new GoogleAuth({
    keyFile: './google-credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const doc = new GoogleSpreadsheet('162tUNu2WOxcQdM_Q_HGwQXpJDFctQVNUnwy7w2OUIls', auth);
  await doc.loadInfo();
  console.log('Tabs:', Object.keys(doc.sheetsByTitle));
  
  const sheet = doc.sheetsByIndex[0];
  await sheet.loadHeaderRow();
  console.log('Headers (Tab 0):', sheet.headerValues);
}
main();
