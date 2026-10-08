const fs = require('fs');
let content = fs.readFileSync('src/app/jurnal/page.tsx', 'utf8');

const oldFilter = `    // Filter rekap
    const filtered = rekapData.filter(r => {
      if (!isAdmin && r.namaGuru !== currentUsername) return false;
      if (filterGuru && r.namaGuru !== filterGuru) return false;
      if (filterFrom && r.tanggal < filterFrom) return false;
      if (filterTo && r.tanggal > filterTo) return false;
      return true;
    });`;

const newFilter = `    // Filter rekap
    const matchName = (a: string, b: string) => {
      if (!a || !b) return false;
      return a.trim().toLowerCase() === b.trim().toLowerCase();
    };

    const filtered = rekapData.filter(r => {
      if (!isAdmin && !matchName(r.namaGuru, currentUsername)) return false;
      if (filterGuru && !matchName(r.namaGuru, filterGuru)) return false;
      if (filterFrom && r.tanggal < filterFrom) return false;
      if (filterTo && r.tanggal > filterTo) return false;
      return true;
    });`;

if (content.includes(oldFilter)) {
  content = content.replace(oldFilter, newFilter);
  fs.writeFileSync('src/app/jurnal/page.tsx', content);
  console.log('Fixed Jurnal filter in page.tsx');
} else {
  console.log('Could not find old filter block');
}
