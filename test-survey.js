const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');

async function run() {
  try {
    const credsPath = './google-credentials.json';
    const credJson = fs.readFileSync(credsPath, 'utf8');
    const credentials = JSON.parse(credJson);
    
    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetId = '1j2Miz37WpXt91kFNx93jII9lzklRscFU1S_bb5C21OY'; // SURVEY_SHEET_ID
    const doc = new GoogleSpreadsheet(sheetId, auth);
    
    console.log('Loading doc info...');
    await doc.loadInfo();
    console.log('Doc title:', doc.title);
    
    const sheetTitles = ['Survey_Wali_Murid', 'Survey_Siswa', 'Survey_Kepuasan_Ortu'];
    for (let title of sheetTitles) {
      const sheet = doc.sheetsByTitle[title];
      if (sheet) {
        console.log(`Sheet ${title} exists.`);
        const rows = await sheet.getRows();
        console.log(`- Total rows: ${rows.length}`);
      } else {
        console.log(`Sheet ${title} DOES NOT EXIST!`);
      }
    }
  } catch(e) {
    console.error('ERROR:', e);
  }
}
run();
