const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');

async function main() {
  const creds = JSON.parse(fs.readFileSync('./google-credentials.json', 'utf8'));
  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet('1j2Miz37WpXt91kFNx93jII9lzklRscFU1S_bb5C21OY', auth);
  await doc.loadInfo();
  
  const sheet = doc.sheetsByTitle['PRESENSI SISWA'];
  const headers = ['ID', 'TIMESTAMP', 'TANGGAL', 'TAHUN AJARAN', 'KELAS', 'JAM KE', 'MAPEL', 'NAMA SISWA', 'NISN', 'KEHADIRAN'];
  await sheet.setHeaderRow(headers);
  console.log('Headers updated successfully!');
}

main().catch(console.error);
