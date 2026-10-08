const fs = require('fs');
let content = fs.readFileSync('src/app/siswa/page.tsx', 'utf8');

// 1. Update state
content = content.replace(
  "const [customKeterangan, setCustomKeterangan] = useState('');",
  "const [customKeterangan1, setCustomKeterangan1] = useState('');\n  const [customKeterangan2, setCustomKeterangan2] = useState('');"
);

// 2. Update the input UI
const oldInputHTML = `<div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Nama Kolom Keterangan (Opsional)</label>
              <input type="text" value={customKeterangan} onChange={e => setCustomKeterangan(e.target.value)} placeholder="Contoh: KET, NILAI, TTD..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
            </div>`;
const newInputHTML = `<div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Kolom Keterangan 1</label>
                <input type="text" value={customKeterangan1} onChange={e => setCustomKeterangan1(e.target.value)} placeholder="Opsional (misal: NILAI)" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Kolom Keterangan 2</label>
                <input type="text" value={customKeterangan2} onChange={e => setCustomKeterangan2(e.target.value)} placeholder="Opsional (misal: TTD)" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
              </div>
            </div>`;
// Replace the block exactly (normalize line endings just in case, but replace usually handles simple exact matches if they are exact). Let's use string split join to be safe on spacing.
// Wait, the spacing might be different. Let's use Regex.
const inputRegex = /<div>\s*<label style=\{\{ display: 'block', marginBottom: '4px', fontSize: '0\.85rem', fontWeight: 600, color: '#334155' \}\}>Nama Kolom Keterangan \(Opsional\)<\/label>\s*<input type="text" value=\{customKeterangan\} onChange=\{e => setCustomKeterangan\(e\.target\.value\)\} placeholder="Contoh: KET, NILAI, TTD\.\.\." style=\{\{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0\.9rem' \}\} \/>\s*<\/div>/g;

if (inputRegex.test(content)) {
  content = content.replace(inputRegex, newInputHTML);
} else {
  console.log("Input regex failed to match.");
}

// 3. Update the table headers
const headerRegex = /<th className="col-ket">\{customKeterangan \|\| 'Keterangan'\}<\/th>\s*<th className="col-ket">\{customKeterangan \|\| 'Keterangan'\}<\/th>/g;
const newHeaderHTML = `<th className="col-ket">{customKeterangan1 || 'Keterangan'}</th>\n                          <th className="col-ket">{customKeterangan2 || 'Keterangan'}</th>`;

if (headerRegex.test(content)) {
  content = content.replace(headerRegex, newHeaderHTML);
} else {
  console.log("Header regex failed to match.");
}

fs.writeFileSync('src/app/siswa/page.tsx', content);
console.log('Success dual keterangan');
