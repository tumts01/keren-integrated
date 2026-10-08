const fs = require('fs');
let content = fs.readFileSync('src/app/siswa/page.tsx', 'utf8');

// The first title block is for angkatan
const regexAngkatan = /<div className="doc-title">Daftar Siswa [^<]* Kelas \{rombel\}<\/div>/;
const newAngkatanTitle = `<div className="doc-title">{customJudul ? \`\${customJudul.toUpperCase()} \${rombel}\` : \`DAFTAR SISWA - KELAS \${rombel}\`}</div>`;
content = content.replace(regexAngkatan, newAngkatanTitle);

// The second title block is for single kelas AND manual
const regexSingle = /<div className="doc-title">Daftar Siswa [^<]* Kelas \{kelas\}<\/div>/;
const newSingleTitle = `<div className="doc-title">{customJudul ? \`\${customJudul.toUpperCase()} \${mode === 'kelas' ? kelas : ''}\` : \`DAFTAR SISWA \${mode === 'kelas' ? '- KELAS ' + kelas : '(MANUAL)'}\`}</div>`;
content = content.replace(regexSingle, newSingleTitle);

fs.writeFileSync('src/app/siswa/page.tsx', content);
console.log('Success titles');
