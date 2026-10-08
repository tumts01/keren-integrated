const fs = require('fs');
const path = 'src/app/nilai-siswa/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove the button
content = content.replace(
  /<button className=\{\`\$\{styles\.tabBtn\} \$\{subTab === 'cetak' \? styles\.activeTab : ''\}\`\} onClick=\{\(\) => setSubTab\('cetak'\)\}>\s*<i className="fas fa-print"><\/i> Cetak Rapor\s*<\/button>/g,
  ''
);

// 2. Remove the section
content = content.replace(
  /\{subTab === 'cetak' && \(\s*<div style=\{\{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' \}\}>\s*<i className="fas fa-print" style=\{\{ fontSize: '3rem', color: '#94a3b8', marginBottom: '1rem' \}\}><\/i>\s*<h2 style=\{\{ color: '#475569', marginBottom: '0\.5rem' \}\}>Cetak Rapor Program Khusus<\/h2>\s*<p style=\{\{ color: '#64748b' \}\}>Fitur cetak rapor sedang dalam tahap pengembangan\.<\/p>\s*<\/div>\s*\)\}/g,
  ''
);

fs.writeFileSync(path, content);
console.log('done');
