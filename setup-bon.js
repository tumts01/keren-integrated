const { GoogleAuth } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');

async function main() {
  const auth = new GoogleAuth({
    keyFile: './google-credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const doc = new GoogleSpreadsheet('19o1NSoihfs4O6GlXbp4aaBM0la932qsxFP6wntlN54w', auth);
  await doc.loadInfo();

  // ========== FIX BonData headers ===========
  const bonSheet = doc.sheetsByTitle['BonData'];
  await bonSheet.loadCells('A1:P1');
  
  // Set header row manually to add new columns
  const newBonHeaders = [
    'NoBon', 'ID', 'TahunAjaran', 'Tanggal', 'Nama', 'Jabatan',
    'Keperluan', 'JumlahDiminta', 'Terbilang', 'RincianJSON',
    'Keterangan', 'Timestamp', 'Status'
  ];
  
  // Check if NoBon already exists
  const cell0 = bonSheet.getCell(0, 0);
  if (cell0.value !== 'NoBon') {
    // Need to insert column - we'll do it by setting header row
    await bonSheet.setHeaderRow(newBonHeaders);
    console.log('BonData headers updated:', newBonHeaders);
  } else {
    console.log('BonData headers already up to date');
  }

  // ========== FIX BelanjaBukti headers ===========
  const buktiSheet = doc.sheetsByTitle['BelanjaBukti'];
  const newBuktiHeaders = [
    'ID', 'BonID', 'NoBon', 'TanggalBelanja', 'RincianJSON',
    'JumlahDiminta', 'JumlahRealisasi', 'SisaUang',
    'URLBuktiNota', 'URLBuktiFoto', 'Keterangan', 'Timestamp'
  ];
  await buktiSheet.setHeaderRow(newBuktiHeaders);
  console.log('BelanjaBukti headers updated:', newBuktiHeaders);

  // ========== INSERT DUMMY DATA ===========
  const now = new Date();
  const tahunAjaran = '2026/2027';
  
  const dummy1 = {
    NoBon: 'BON-2026/07-001/Faisal',
    ID: 'BON-2026/07-001/Faisal',
    TahunAjaran: tahunAjaran,
    Tanggal: '2026-07-14',
    Nama: 'M. FAISAL ABDA\'U',
    Jabatan: 'Ka. Tata Usaha',
    Keperluan: 'Belanja ATK untuk Keperluan Administrasi',
    JumlahDiminta: '5000000',
    Terbilang: 'Lima Juta Rupiah',
    RincianJSON: JSON.stringify([
      { barang: 'Beli ATK', qty: 2, satuan: 'BOX', harga: 520000 },
      { barang: 'Beli Cilok', qty: 1, satuan: 'BKS', harga: 360000 },
      { barang: 'Beli Kopi', qty: 1, satuan: 'SAK', harga: 650000 },
      { barang: 'Beli Ikan', qty: 7, satuan: 'EKOR', harga: 150000 }
    ]),
    Keterangan: 'Keperluan kantor rutin',
    Timestamp: '14/7/2026, 08.00.00',
    Status: 'Selesai'
  };

  const dummy2 = {
    NoBon: 'BON-2026/07-002/Faisal',
    ID: 'BON-2026/07-002/Faisal',
    TahunAjaran: tahunAjaran,
    Tanggal: '2026-07-19',
    Nama: 'M. FAISAL ABDA\'U',
    Jabatan: 'Ka. Tata Usaha',
    Keperluan: 'Pembelian Perlengkapan MOS/MPLS',
    JumlahDiminta: '3500000',
    Terbilang: 'Tiga Juta Lima Ratus Ribu Rupiah',
    RincianJSON: JSON.stringify([
      { barang: 'Spanduk MPLS', qty: 2, satuan: 'LEMBAR', harga: 250000 },
      { barang: 'Snack Peserta', qty: 200, satuan: 'PCS', harga: 7500 },
      { barang: 'ID Card', qty: 200, satuan: 'PCS', harga: 2500 },
      { barang: 'Bolpoin', qty: 1, satuan: 'BOX', harga: 50000 },
    ]),
    Keterangan: '',
    Timestamp: '19/7/2026, 09.00.00',
    Status: 'Draft'
  };

  await bonSheet.addRow(dummy1);
  console.log('Dummy 1 added:', dummy1.NoBon);
  
  await bonSheet.addRow(dummy2);
  console.log('Dummy 2 added:', dummy2.NoBon);

  // Add realisasi for dummy1
  await buktiSheet.addRow({
    ID: 'BKT-2026/07-001',
    BonID: 'BON-2026/07-001/Faisal',
    NoBon: 'BON-2026/07-001/Faisal',
    TanggalBelanja: '2026-07-15',
    RincianJSON: JSON.stringify([
      { barang: 'Beli ATK', qty: 2, satuan: 'BOX', harga: 520000 },
      { barang: 'Beli Cilok', qty: 1, satuan: 'BKS', harga: 360000 },
      { barang: 'Beli Kopi', qty: 1, satuan: 'SAK', harga: 650000 },
      { barang: 'Beli Ikan', qty: 7, satuan: 'EKOR', harga: 150000 }
    ]),
    JumlahDiminta: '5000000',
    JumlahRealisasi: '3100000',
    SisaUang: '1900000',
    URLBuktiNota: '',
    URLBuktiFoto: '',
    Keterangan: 'Sisa uang dikembalikan ke bendahara',
    Timestamp: '15/7/2026, 14.00.00'
  });
  console.log('Dummy realisasi added for dummy1');

  console.log('\nDone! Spreadsheet ready.');
}

main().catch(console.error);
