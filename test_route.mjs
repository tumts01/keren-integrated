import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

async function run() {
  let wb = xlsx.utils.book_new();
  let sheetData = [
    ['LEGGER EKSTRAKURIKULER'],
    ['Kelas:', '7G', '', 'Semester:', 'Ganjil'],
    ['Madrasah:', 'MTs', '', 'Tahun Ajaran:', '2024/2025'],
    [],
    [],
    ['No', 'NIS', 'Nisn', 'Nama', 'JK', 'JENIS EKSTRA', 'NILAI'],
    [, 2, '3123573383', 'ADINDA A', 'PEREMPUAN', 'CLUB MATEMATIKA', 'SANGAT BAIK'],
    [, 3, '3126062158', 'AFIKA', 'PEREMPUAN', 'CLUB MATEMATIKA', 'SANGAT BAIK']
  ];
  const sheet = xlsx.utils.aoa_to_sheet(sheetData);
  xlsx.utils.book_append_sheet(wb, sheet, 'Sheet1');
  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync('D:/keren-integrated/test.xlsx', buf);

  // Directly parse like the route does
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const rowStr = (data[i] || []).join(' ').toLowerCase();
    if (rowStr.includes('nis') && rowStr.includes('nama') && rowStr.includes('nilai')) {
      headerRowIdx = i;
    }
  }

  const startIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 6;
  let nisCol = 1, namaCol = 3, ekstraCol = 5, nilaiCol = 6;
  if (headerRowIdx !== -1) {
     const headers = data[headerRowIdx].map(h => String(h || '').toLowerCase().trim());
     const findCol = (name) => headers.findIndex(h => h.includes(name));
     nisCol = findCol('nis') > -1 ? findCol('nis') : 1;
     namaCol = findCol('nama') > -1 ? findCol('nama') : 3;
     ekstraCol = findCol('jenis ekstra') > -1 ? findCol('jenis ekstra') : 5;
     nilaiCol = findCol('nilai') > -1 ? findCol('nilai') : 6;
  }
  
  const dataEkstra = [];
  for (let i = startIdx; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    let nis = String(row[nisCol] || '').trim();
    let nama = String(row[namaCol] || '').trim();
    let jenisEkstra = String(row[ekstraCol] || '').trim();
    let nilai = String(row[nilaiCol] || '').trim();
    
    if (!nis || !nama || nis === 'undefined' || nama === 'undefined') continue;

    if (jenisEkstra && nilai && jenisEkstra !== 'undefined' && nilai !== 'undefined') {
      dataEkstra.push({ nis, nama, jenis_ekstra: jenisEkstra, nilai });
    }
  }

  console.log({ headerRowIdx, startIdx, nisCol, namaCol, ekstraCol, nilaiCol, dataEkstra });
}

run();
