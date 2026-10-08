const fs = require('fs');
const envConfig = fs.readFileSync('.env.local', 'utf8');
envConfig.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
});
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function main() {
  const creds = JSON.parse(fs.readFileSync('./google-credentials.json', 'utf8'));
  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_PRESENSI_ID, serviceAccountAuth);
  await doc.loadInfo();
  console.log('Loaded doc:', doc.title);

  let sheet = doc.sheetsByTitle['JURNAL MENGAJAR'];
  if (!sheet) {
    sheet = await doc.addSheet({ title: 'JURNAL MENGAJAR' });
    console.log('Created sheet JURNAL MENGAJAR');
  } else {
    console.log('Sheet JURNAL MENGAJAR already exists');
  }

  await sheet.setHeaderRow([
    'ID',
    'TIMESTAMP',
    'TANGGAL',
    'JAM KE',
    'TAHUN AJARAN',
    'KELAS',
    'MAPEL',
    'NAMA GURU',
    'MATERI'
  ]);
  console.log('Headers set successfully.');
}

main().catch(console.error);
