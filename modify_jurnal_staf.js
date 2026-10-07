const fs = require('fs');
const path = 'src/app/jurnal-kegiatan/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// We will replace the table headers and table rows for Jurnal Staf.
// Current Header:
// <th style={{ width: '50px', textAlign: 'center' }}>No</th>
// <th style={{ width: '150px', textAlign: 'center' }}>Waktu</th>
// <th className={styles.noPrint} style={{ textAlign: 'center' }}>Nama Staf</th>
// <th style={{ textAlign: 'center' }}>Kegiatan</th>
// <th style={{ width: '250px', textAlign: 'center' }}>Keterangan</th>
// <th style={{ width: '100px', textAlign: 'center' }}>Foto</th>

// Current Body:
// <td className={styles.noPrint} style={{ fontWeight: 600, color: '#0f172a' }}>{j.namaStaf}</td>

// We will change the header to:
// <th style={{ width: '50px', textAlign: 'center' }}>No</th>
// <th style={{ width: '150px', textAlign: 'center' }}>Waktu</th>
// <th style={{ textAlign: 'center' }}>Nama & Jabatan</th>
// <th style={{ textAlign: 'center' }}>Kegiatan</th>
// <th style={{ width: '250px', textAlign: 'center' }}>Keterangan</th>
// <th style={{ width: '100px', textAlign: 'center' }}>Dokumentasi</th>

const headerRegex = /<th style=\{\{ width: '50px', textAlign: 'center' \}\}>No<\/th>[\s\S]*?<th style=\{\{ width: '100px', textAlign: 'center' \}\}>Foto<\/th>/;
const newHeader = `<th style={{ width: '40px', textAlign: 'center' }}>No</th>
                        <th style={{ width: '130px', textAlign: 'center' }}>Waktu</th>
                        <th style={{ width: '180px', textAlign: 'center' }}>Nama & Jabatan</th>
                        <th style={{ textAlign: 'center' }}>Kegiatan</th>
                        <th style={{ width: '200px', textAlign: 'center' }}>Keterangan</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Dokumentasi</th>`;
content = content.replace(headerRegex, newHeader);


const bodyNamaRegex = /<td className=\{styles\.noPrint\} style=\{\{ fontWeight: 600, color: '#0f172a' \}\}>\{j\.namaStaf\}<\/td>/;
const newBodyNama = `<td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{j.namaStaf}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              {(() => {
                                 const guru = gurus.find(g => g.nama === j.namaStaf);
                                 return guru?.jabatan || 'Guru';
                              })()}
                            </div>
                          </td>`;
content = content.replace(bodyNamaRegex, newBodyNama);

const bodyFotoRegex = /<td style=\{\{ textAlign: 'center' \}\}>\s*\{j\.fotoKegiatan \? \([\s\S]*?\) : '-'\}\s*<\/td>/;
const newBodyFoto = `<td style={{ textAlign: 'center' }}>
                            {j.fotoKegiatan ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                                {j.fotoKegiatan.split(', ').map((url: string, idx: number) => (
                                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div className={styles.printOnly} style={{ display: 'none' }}>
                                      <img src={\`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=\${encodeURIComponent(url)}\`} alt="QR" style={{ width: '50px', height: '50px' }} />
                                    </div>
                                    <a href={url} target="_blank" rel="noopener noreferrer" className={styles.noPrint} style={{ color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                                      <i className="fas fa-image"></i> {j.fotoKegiatan.split(', ').length > 1 ? \`Foto \${idx + 1}\` : 'Lihat'}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            ) : '-'}
                          </td>`;
content = content.replace(bodyFotoRegex, newBodyFoto);

// And we will add the style block for the print margin
// Just before `<div className={styles.container}>`
const styleInjection = `<style type="text/css" media="print">
        {\`
          @page { margin-top: 5mm !important; }
        \`}
      </style>
      <div className={styles.container}>`;
content = content.replace('<div className={styles.container}>', styleInjection);

// And to make sure that the print output is paginated correctly, wait!
// Right now it's just printing the UI table which ONLY shows 20 items.
// I must make the table print ALL filtered items!
// Let me look at how I implemented UI pagination. I used `const filtered = filteredAll.slice(...)`.
// So the rendered rows are ONLY 20!
// This means the print output will only ever be 20 items.
// If the user said "jadi beberapa halaman gitu", and it's for PRINT, I really do need the separate print layout!
// But wait, the user's screenshot showed 20 items! (Actually, it showed up to No. 7 on the first page, and probably continues).
// Wait! If they want multiple pages printed, they need ALL data to be mapped in print!
// Okay, let me undo `filteredAll.slice(...)` for the print block!

// Let me just replace the entire table div!
// This is much safer.
fs.writeFileSync('modify_jurnal_staf.js', content);
