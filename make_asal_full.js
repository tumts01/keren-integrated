const fs = require('fs');
const path = 'src/app/olimpiade-seni/pendaftaran/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the div containing Asal Sekolah with one that spans full width
content = content.replace(
  /<div>\s*<label style=\{\{ display: 'block', fontSize: '0\.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' \}\}>Asal Sekolah \(SD\/MI\)/,
  `<div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Asal Sekolah (SD/MI)`
);

fs.writeFileSync(path, content);
console.log('done2');
