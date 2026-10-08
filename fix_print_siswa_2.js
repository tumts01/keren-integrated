const fs = require('fs');
let content = fs.readFileSync('src/app/siswa/page.tsx', 'utf8');

// Replace angkatan title
const regexAngkatan = /<div className="doc-title">Daftar Siswa [^<]* Kelas \{rombel\}<\/div>/;
const newAngkatanTitle = `<div className="doc-title">{customJudul ? \`\${customJudul.toUpperCase()} KELAS \${rombel}\` : \`DAFTAR SISWA - KELAS \${rombel}\`}</div>`;
content = content.replace(regexAngkatan, newAngkatanTitle);

// Replace kelas title
const regexKelas = /<div className="doc-title">Daftar Siswa [^<]* Kelas \{kelas\}<\/div>/;
const newKelasTitle = `<div className="doc-title">{customJudul ? \`\${customJudul.toUpperCase()} KELAS \${kelas}\` : \`DAFTAR SISWA - KELAS \${kelas}\`}</div>`;
content = content.replace(regexKelas, newKelasTitle);

// Replace manual title (Wait, what is the title for manual mode?)
const regexManual = /<div className="doc-title">Daftar Siswa [^<]* Manual<\/div>/;
// Wait, I need to see what the title is for manual. Let's check.
fs.writeFileSync('src/app/siswa/page.tsx', content);
console.log('Success titles');
