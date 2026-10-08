const fs = require('fs');
let content = fs.readFileSync('src/app/jurnal/page.tsx', 'utf8');

const oldFilter = `    // Filter rekap
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

const newFilter = `    // Filter rekap
    const matchName = (a: string, b: string) => {
      if (!a || !b) return false;
      return a.trim().toLowerCase() === b.trim().toLowerCase();
    };

    let filtered = rekapData.filter(r => {
      if (!isAdmin && !matchName(r.namaGuru, currentUsername)) return false;
      if (filterGuru && !matchName(r.namaGuru, filterGuru)) return false;
      if (filterFrom && r.tanggal < filterFrom) return false;
      if (filterTo && r.tanggal > filterTo) return false;
      return true;
    });

    // Urutkan berdasarkan tanggal (terbaru ke terlama) lalu jam ke (awal ke akhir)
    filtered.sort((a, b) => {
      if (a.tanggal > b.tanggal) return -1;
      if (a.tanggal < b.tanggal) return 1;
      
      const jamA = parseInt(a.jamKe.split(',')[0]) || 0;
      const jamB = parseInt(b.jamKe.split(',')[0]) || 0;
      return jamA - jamB;
    });`;

if (content.includes(oldFilter)) {
  content = content.replace(oldFilter, newFilter);
  fs.writeFileSync('src/app/jurnal/page.tsx', content);
  console.log('Successfully added sort logic.');
} else {
  // If it can't find oldFilter because of slight differences, fallback to regex
  const regex = /const filtered = rekapData\.filter\([\s\S]*?\}\);/;
  if (regex.test(content)) {
    content = content.replace(regex, `let filtered = rekapData.filter(r => {
      if (!isAdmin && r.namaGuru?.trim().toLowerCase() !== currentUsername?.trim().toLowerCase()) return false;
      if (filterGuru && r.namaGuru?.trim().toLowerCase() !== filterGuru?.trim().toLowerCase()) return false;
      if (filterFrom && r.tanggal < filterFrom) return false;
      if (filterTo && r.tanggal > filterTo) return false;
      return true;
    });

    // Urutkan berdasarkan tanggal (terbaru ke terlama) lalu jam ke (awal ke akhir)
    filtered.sort((a, b) => {
      if (a.tanggal > b.tanggal) return -1;
      if (a.tanggal < b.tanggal) return 1;
      
      const jamA = parseInt(a.jamKe.split(',')[0]) || 0;
      const jamB = parseInt(b.jamKe.split(',')[0]) || 0;
      return jamA - jamB;
    });`);
    fs.writeFileSync('src/app/jurnal/page.tsx', content);
    console.log('Successfully added sort logic via regex.');
  } else {
    console.log('Could not find filter logic to replace.');
  }
}
