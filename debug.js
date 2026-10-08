const { GoogleAuth } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs');

const envConfig = fs.readFileSync('.env.local', 'utf8');
envConfig.split(/\r?\n/).forEach(line => { 
  const [k, ...v] = line.split('='); 
  if (k && v.length) process.env[k.trim()] = v.join('=').trim(); 
});

async function main() {
  try {
    const auth = new GoogleAuth({
      keyFile: './google-credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const indukDoc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_SISWA_ID, auth);
    await indukDoc.loadInfo();
    console.log("Loaded Induk Doc");
    
    const raporDoc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_RAPOR_ID, auth);
    await raporDoc.loadInfo();
    console.log("Loaded Rapor Doc");

    const sheetSiswa = indukDoc.sheetsByTitle['DATABASE'];
    const rowsSiswa = await sheetSiswa.getRows();
    console.log("Loaded Siswa Rows:", rowsSiswa.length);
    
    const sheetBalekno = raporDoc.sheetsByTitle['BALEKNO'];
    const rowsBalekno = await sheetBalekno.getRows();
    console.log("Loaded Balekno Rows:", rowsBalekno.length);
    
    // Test date parsing for the first few balekno rows
    for (let i = 0; i < 5; i++) {
       const row = rowsBalekno[i];
       const tglVal = row.get('TANGGAL');
       console.log("TglVal:", tglVal);
    }
  } catch(e) {
    console.error("DEBUG ERROR:", e);
  }
}

main();
