const fs = require('fs');
let content = fs.readFileSync('src/app/siswa/page.tsx', 'utf8');

const oldCode = `    const matchAsalSekolah = selectedAsalSekolah === 'Semua' ? true : asalSekolah.toLowerCase().includes(selectedAsalSekolah.toLowerCase());
    return matchSearch && matchTahun && matchTingkat && matchRombel && matchDomisili && matchAsalSekolah;
  });`;

const newCode = `    const matchAsalSekolah = selectedAsalSekolah === 'Semua' ? true : asalSekolah.toLowerCase().includes(selectedAsalSekolah.toLowerCase());
    return matchSearch && matchTahun && matchTingkat && matchRombel && matchDomisili && matchAsalSekolah;
  });

  // Urutkan berdasarkan rombel lalu nama
  filteredData.sort((a, b) => {
    const rombelA = (a.rombel || '').trim();
    const rombelB = (b.rombel || '').trim();
    
    // Jika rombel berbeda, urutkan secara alfanumerik (7A, 7B, 8A, dst)
    if (rombelA !== rombelB) {
      return rombelA.localeCompare(rombelB, undefined, { numeric: true });
    }
    
    // Jika rombel sama, urutkan berdasarkan nama
    return (a.nama || '').localeCompare(b.nama || '');
  });`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync('src/app/siswa/page.tsx', content);
  console.log('Fixed siswa sorting');
} else {
  console.log('Could not find old code block');
}
