const fs = require('fs');
let content = fs.readFileSync('src/app/siswa/page.tsx', 'utf8');

// 1. Add states
const stateMatch = /const \[manualSearch, setManualSearch\] = useState<string>\(''\);/;
const newState = `const [manualSearch, setManualSearch] = useState<string>('');
  const [customJudul, setCustomJudul] = useState('');
  const [customKeterangan, setCustomKeterangan] = useState('');`;
content = content.replace(stateMatch, newState);

// 2. Add input fields in the UI
const infoMatch = /<div className=\{styles\.printPreviewInfo\}>/;
const newInputs = `<div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Judul Cetak (Opsional)</label>
              <input type="text" value={customJudul} onChange={e => setCustomJudul(e.target.value)} placeholder="Contoh: DAFTAR NILAI, DAFTAR HADIR..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Nama Kolom Keterangan (Opsional)</label>
              <input type="text" value={customKeterangan} onChange={e => setCustomKeterangan(e.target.value)} placeholder="Contoh: KET, NILAI, TTD..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
            </div>
          </div>

          <div className={styles.printPreviewInfo}>`;
content = content.replace(infoMatch, newInputs);

// 3. Modify print logic
const titleMatch = /DAFTAR SISWA \$\{mode === 'angkatan' \? `KELAS \$\{r\}` : judulCetak\.toUpperCase\(\)\}/g;
const newTitle = `\${customJudul ? (mode === 'angkatan' ? customJudul.toUpperCase() + ' KELAS ' + r : customJudul.toUpperCase()) : 'DAFTAR SISWA ' + (mode === 'angkatan' ? \`KELAS \${r}\` : judulCetak.toUpperCase())}`;
content = content.replace(titleMatch, newTitle);

// Use a function to replace Keterangan carefully inside the template strings only
const headerMatch1 = /<th className="col-ket">Keterangan<\/th>\s*<th className="col-ket">Keterangan<\/th>/g;
const newHeader1 = `<th className="col-ket">\${customKeterangan || 'Keterangan'}</th>\n                          <th className="col-ket">\${customKeterangan || 'Keterangan'}</th>`;
content = content.replace(headerMatch1, newHeader1);

fs.writeFileSync('src/app/siswa/page.tsx', content);
console.log('Success');
