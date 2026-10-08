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

    const INDUK_ID = '13HF086UNQcIxjwi8Adpow-n_qKbgOtX1SiXTe-JgTOY';
    const doc = new GoogleSpreadsheet(INDUK_ID, auth);
    await doc.loadInfo();

    const dbSheet = doc.sheetsByTitle['DATABASE'];
    const dbRows = await dbSheet.getRows();

    console.log("Sample 5 DATABASE Rows:");
    for(let i = 0; i < 5; i++) {
      const r = dbRows[i];
      console.log(`Row ${i}: NISN='${r.get('NISN')}' ID SISWA='${r.get('ID SISWA')}' NAMA='${r.get('NAMA')}'`);
    }

    console.log("\nSearching for name 'ACHMAD ASYROFIL LABIB AZ-ZAKI':");
    dbRows.forEach(r => {
      const nama = r.get('NAMA') || '';
      if (nama.includes('ACHMAD ASYROFIL LABIB AZ-ZAKI')) {
        console.log(`Found: NISN='${r.get('NISN')}' ID SISWA='${r.get('ID SISWA')}' NAMA='${r.get('NAMA')}'`);
      }
    });

  } catch (error) {
    console.error(error);
  }
}
run();
