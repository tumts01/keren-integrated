const { GoogleAuth } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');

async function main() {
  const auth = new GoogleAuth({
    keyFile: './google-credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const doc = new GoogleSpreadsheet('19o1NSoihfs4O6GlXbp4aaBM0la932qsxFP6wntlN54w', auth);
  await doc.loadInfo();

  // ===== BonData: tambah kolom PenerimaJSON =====
  const bonSheet = doc.sheetsByTitle['BonData'];
  const newBonHeaders = [
    'NoBon', 'ID', 'TahunAjaran', 'Tanggal', 'Nama', 'Jabatan',
    'Keperluan', 'JumlahDiminta', 'Terbilang', 'RincianJSON',
    'PenerimaJSON', 'Keterangan', 'Timestamp', 'Status'
  ];
  await bonSheet.setHeaderRow(newBonHeaders);
  console.log('BonData headers updated with PenerimaJSON');

  // ===== BelanjaBukti: tambah kolom PenerimaJSON =====
  const buktiSheet = doc.sheetsByTitle['BelanjaBukti'];
  const newBuktiHeaders = [
    'ID', 'BonID', 'NoBon', 'TanggalBelanja', 'RincianJSON',
    'JumlahDiminta', 'JumlahRealisasi', 'SisaUang',
    'PenerimaJSON', 'URLBuktiNota', 'URLBuktiFoto', 'Keterangan', 'Timestamp'
  ];
  await buktiSheet.setHeaderRow(newBuktiHeaders);
  console.log('BelanjaBukti headers updated with PenerimaJSON');

  console.log('Done!');
}

main().catch(console.error);
