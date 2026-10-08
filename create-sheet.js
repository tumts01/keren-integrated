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
  console.log('Loaded doc:', doc.title);
  
  const headers = ['ID', 'TIMESTAMP', 'TANGGAL', 'TAHUN AJARAN', 'KELAS', 'MAPEL', 'NAMA SISWA', 'NISN', 'KEHADIRAN'];
  try {
    const sheet = await doc.addSheet({ title: 'PRESENSI SISWA', headerValues: headers });
    console.log('Sheet PRESENSI SISWA created with ID:', sheet.sheetId);
  } catch(e) {
    console.error('Error creating sheet (maybe it already exists?):', e.message);
  }
}

main().catch(console.error);
