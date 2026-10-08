const fs = require('fs');
const path = 'src/components/PenelitianMahasiswaTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// 2. Add tanggal to form state type
content = content.replace(
  /target:\s*string;\s*keterangan:\s*string;\s*\}>\(\{/,
  `target: string;
    keterangan: string;
    tanggal: string;
  }>({`
);

// 3. Add tanggal to form initial state
content = content.replace(
  /keterangan:\s*'',\s*\}\);/,
  `keterangan: '',
    tanggal: '',
  });`
);

// 4. Add tanggal to resetForm (need to be careful not to replace the initial state again, so I'll target resetForm specifically)
content = content.replace(
  /const resetForm = \(\) => \{\s*setEditId\(null\);\s*setForm\(\{[\s\S]*?keterangan:\s*'',\s*\}\);\s*\};/,
  `const resetForm = () => {
    setEditId(null);
    setForm({
      namaMahasiswa: [''],
      universitas: '',
      jenisPenelitian: '',
      judul: '',
      target: '',
      keterangan: '',
      tanggal: '',
    });
  };`
);

// 5. Add tanggal to handleEdit
content = content.replace(
  /keterangan:\s*item\.keterangan\s*\|\|\s*'',\s*\}\);/,
  `keterangan: item.keterangan || '',
      tanggal: item.tanggal || '',
    });`
);

// 6. Add to Table Headers
content = content.replace(
  /<th style=\{\{ width: '50px', textAlign: 'center' \}\}>No<\/th>\s*<th style=\{\{ width: '220px' \}\}>Mahasiswa & Universitas<\/th>/,
  `<th style={{ width: '50px', textAlign: 'center' }}>No</th>
              <th style={{ width: '120px' }}>Tanggal</th>
              <th style={{ width: '220px' }}>Mahasiswa & Universitas</th>`
);

// 7. Add to Table Rows
content = content.replace(
  /<td style=\{\{ textAlign: 'center' \}\}>\{idx \+ 1\}<\/td>\s*<td>/,
  `<td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ fontSize: '0.85rem', color: '#475569' }}>{item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                <td>`
);

// 8. Add to Form Fields (before Universitas)
content = content.replace(
  /<div>\s*<label style=\{\{ display: 'block', fontSize: '0\.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' \}\}>Asal Universitas \/ Institusi<\/label>/,
  `<div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Tanggal</label>
                <input
                  type="date"
                  required
                  value={form.tanggal}
                  onChange={e => setForm({ ...form, tanggal: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '16px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Asal Universitas / Institusi</label>`
);

fs.writeFileSync(path, content);
console.log('done2');
