const fs = require('fs');
const path = 'src/components/PenelitianMahasiswaTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add tanggal to Interface
content = content.replace(
  'keterangan: string;',
  'keterangan: string;\n  tanggal?: string;'
);

// 2. Add tanggal to form state type
content = content.replace(
  'target: string;\n    keterangan: string;\n  }>({',
  'target: string;\n    keterangan: string;\n    tanggal: string;\n  }>({'
);

// 3. Add tanggal to form initial state
content = content.replace(
  "keterangan: '',\n  });",
  "keterangan: '',\n    tanggal: '',\n  });"
);

// 4. Add tanggal to resetForm
content = content.replace(
  "keterangan: '',\n    });\n  };",
  "keterangan: '',\n      tanggal: '',\n    });\n  };"
);

// 5. Add tanggal to handleEdit
content = content.replace(
  "keterangan: item.keterangan || '',\n    });",
  "keterangan: item.keterangan || '',\n      tanggal: item.tanggal || '',\n    });"
);

// 6. Add to Table Headers
content = content.replace(
  '<th style={{ width: \'50px\', textAlign: \'center\' }}>No</th>\n              <th style={{ width: \'220px\' }}>Mahasiswa & Universitas</th>',
  '<th style={{ width: \'50px\', textAlign: \'center\' }}>No</th>\n              <th style={{ width: \'120px\' }}>Tanggal</th>\n              <th style={{ width: \'220px\' }}>Mahasiswa & Universitas</th>'
);

// 7. Add to Table Rows
content = content.replace(
  '<td style={{ textAlign: \'center\' }}>{idx + 1}</td>\n                <td>',
  '<td style={{ textAlign: \'center\' }}>{idx + 1}</td>\n                <td style={{ fontSize: \'0.85rem\', color: \'#475569\' }}>{item.tanggal ? new Date(item.tanggal).toLocaleDateString(\'id-ID\', { day: \'numeric\', month: \'short\', year: \'numeric\' }) : \'-\'}</td>\n                <td>'
);

// 8. Add to Form Fields (before Universitas)
content = content.replace(
  `<div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Asal Universitas / Institusi</label>`,
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
console.log('done');
