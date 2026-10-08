const fs = require('fs');
const path = 'src/app/olimpiade-seni/pendaftaran/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove npsn from initial state
content = content.replace(/\s*npsn:\s*'',/g, '');

// Remove the input field block in the JSX
content = content.replace(
  /<div>\s*<label style=\{\{ display: 'block', fontSize: '0\.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' \}\}>NPSN Sekolah <span style=\{\{ color: 'red' \}\}>\*<\/span><\/label>\s*<input\s*type="text" required value=\{form\.npsn\} onChange=\{e => setForm\(\{\.\.\.form, npsn: e\.target\.value\}\)\}\s*style=\{\{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' \}\}\s*placeholder="Contoh: 20500000"\s*\/>\s*<\/div>/g,
  ''
);

// We should also check if it modifies the Grid layout (since it was next to Asal Sekolah).
// The parent container is likely a grid.
// Let's check how the parent grid looks.

fs.writeFileSync(path, content);
console.log('done');
