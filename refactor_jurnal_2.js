const fs = require('fs');
const path = 'src/app/jurnal-kegiatan/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add state
content = content.replace(
  "const [jurnalStafSubTab, setJurnalStafSubTab] = useState<'isi' | 'rekap'>('isi');",
  "const [jurnalStafSubTab, setJurnalStafSubTab] = useState<'isi' | 'rekap'>('isi');\n  const [currentPage, setCurrentPage] = useState(1);"
);

// Reset page when subtab changes
content = content.replace(
  "onClick={() => setJurnalStafSubTab('rekap')}",
  "onClick={() => { setJurnalStafSubTab('rekap'); setCurrentPage(1); }}"
);

// Reset page when filters change
content = content.replace(
  "onChange={e => setFilterStartDate(e.target.value)}",
  "onChange={e => { setFilterStartDate(e.target.value); setCurrentPage(1); }}"
);
content = content.replace(
  "onChange={e => setFilterEndDate(e.target.value)}",
  "onChange={e => { setFilterEndDate(e.target.value); setCurrentPage(1); }}"
);
content = content.replace(
  "onChange={e => setFilterName(e.target.value)}",
  "onChange={e => { setFilterName(e.target.value); setCurrentPage(1); }}"
);

// Replace the table section
const oldTableStr = `                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                        <th style={{ width: '150px', textAlign: 'center' }}>Waktu</th>
                        <th className={styles.noPrint} style={{ textAlign: 'center' }}>Nama Staf</th>
                        <th style={{ textAlign: 'center' }}>Kegiatan</th>
                        <th style={{ width: '250px', textAlign: 'center' }}>Keterangan</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Foto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const parseDateStr = (dStr: string) => {
                          if (!dStr) return '';
                          if (dStr.includes('-') && dStr.length === 10 && dStr.indexOf('-') === 4) return dStr; 
                          
                          const sep = dStr.includes('/') ? '/' : (dStr.includes('-') ? '-' : null);
                          if (sep) {
                            const parts = dStr.split(sep);
                            if (parts.length === 3) {
                               if (parts[2].length === 4) { 
                                 // Asumsi format indonesia: DD/MM/YYYY -> YYYY-MM-DD
                                 return \`\${parts[2]}-\${parts[1].padStart(2,'0')}-\${parts[0].padStart(2,'0')}\`;
                               } else if (parts[0].length === 4) { 
                                 // Asumsi YYYY/MM/DD -> YYYY-MM-DD
                                 return \`\${parts[0]}-\${parts[1].padStart(2,'0')}-\${parts[2].padStart(2,'0')}\`;
                               }
                            }
                          }
                          return dStr;
                        };

                        const filtered = jurnalStafData.filter(j => {
                          let match = true;
                          const jTgl = parseDateStr(j.tanggal);
                          if (filterStartDate && jTgl < filterStartDate) match = false;
                          if (filterEndDate && jTgl > filterEndDate) match = false;
                          if (filterName && !j.namaStaf?.toLowerCase().includes(filterName.toLowerCase())) match = false;
                          return match;
                        });
                        return filtered.length > 0 ? filtered.map((j, i) => (
                        <tr key={i}>
                          <td style={{ textAlign: 'center' }}>{i + 1}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#334155' }}>{j.tanggal}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              {j.mulaiDari && j.sampaiDengan ? \`\${j.mulaiDari} s/d \${j.sampaiDengan}\` : j.mulaiDari || j.sampaiDengan || ''}
                            </div>
                          </td>
                          <td className={styles.noPrint} style={{ fontWeight: 600, color: '#0f172a' }}>{j.namaStaf}</td>
                          <td>{j.kegiatan}</td>
                          <td>{j.keterangan || '-'}</td>
                          <td style={{ textAlign: 'center' }}>
                            {j.fotoKegiatan ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                {j.fotoKegiatan.split(', ').map((url: string, idx: number) => (
                                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <i className="fas fa-image"></i> {j.fotoKegiatan.split(', ').length > 1 ? \`Foto \${idx + 1}\` : 'Lihat'}
                                  </a>
                                ))}
                              </div>
                            ) : '-'}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                            Tidak ada data jurnal kegiatan yang sesuai filter.
                          </td>
                        </tr>
                      );
                      })()}
                    </tbody>
                  </table>

                  {/* TANDA TANGAN (Hanya tampil saat print) */}
                  <div className={styles.printOnly} style={{ display: 'none', marginTop: '50px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                        <div style={{ textAlign: 'center' }}>
                           <p>Mengetahui,</p>
                           <p>Kepala Madrasah</p>
                           <br/><br/><br/><br/>
                           <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Dwi Retno Palupi, S.Pd., M.Pd.</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                           <p>Singosari, {new Date().toLocaleDateString('id-ID')}</p>
                           <p>Pembuat Jurnal</p>
                           <br/><br/><br/><br/>
                           <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{filterName || '(..................................................)'}</p>
                        </div>
                     </div>
                  </div>`;

// Wait, the regex `/\<table className=\{styles\.table\}\>[\s\S]*?<\/div>\s*<\/div>/` is much simpler to just construct a `indexOf` and slice!
const startIdx = content.indexOf('<table className={styles.table}>');
const endIdx = content.indexOf("</div>\n              </div>\n            )}\n          </div>\n        ) : activeTab === 'jurnal-mgmp'");

// Let's replace the whole block from startIdx to endIdx.
// Actually, it's just from `<table className={styles.table}>` down to `</div> // printOnly`

let replaceStart = content.indexOf('<table className={styles.table}>');
let replaceEnd = content.indexOf('</div>', content.indexOf('<div className={styles.printOnly} style={{ display: \'none\', marginTop: \'50px\' }}>')) + 6;

let replacement = `
                    {(() => {
                      const parseDateStr = (dStr: string) => {
                        if (!dStr) return '';
                        if (dStr.includes('-') && dStr.length === 10 && dStr.indexOf('-') === 4) return dStr; 
                        const sep = dStr.includes('/') ? '/' : (dStr.includes('-') ? '-' : null);
                        if (sep) {
                          const parts = dStr.split(sep);
                          if (parts.length === 3) {
                             if (parts[2].length === 4) return \`\${parts[2]}-\${parts[1].padStart(2,'0')}-\${parts[0].padStart(2,'0')}\`;
                             else if (parts[0].length === 4) return \`\${parts[0]}-\${parts[1].padStart(2,'0')}-\${parts[2].padStart(2,'0')}\`;
                          }
                        }
                        return dStr;
                      };

                      const filtered = jurnalStafData.filter(j => {
                        let match = true;
                        const jTgl = parseDateStr(j.tanggal);
                        if (filterStartDate && jTgl < filterStartDate) match = false;
                        if (filterEndDate && jTgl > filterEndDate) match = false;
                        if (filterName && !j.namaStaf?.toLowerCase().includes(filterName.toLowerCase())) match = false;
                        return match;
                      });

                      const itemsPerPage = 20;
                      const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
                      const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                      const renderRows = (items: any[], startIndex: number, isPrint: boolean) => {
                        if (items.length === 0) return <tr><td colSpan={isPrint ? 5 : 6} style={{ textAlign: 'center', padding: '24px' }}>Belum ada data jurnal</td></tr>;
                        return items.map((j, i) => (
                          <tr key={i}>
                            <td style={{ textAlign: 'center' }}>{startIndex + i + 1}</td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#334155' }}>{j.tanggal}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                {j.mulaiDari && j.sampaiDengan ? \`\${j.mulaiDari} s/d \${j.sampaiDengan}\` : j.mulaiDari || j.sampaiDengan || ''}
                              </div>
                            </td>
                            {!isPrint && <td className={styles.noPrint} style={{ fontWeight: 600, color: '#0f172a' }}>{j.namaStaf}</td>}
                            <td>{j.kegiatan}</td>
                            <td>{j.keterangan || '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                              {j.fotoKegiatan || j.fileLink ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                  {(j.fotoKegiatan || j.fileLink).split(', ').map((url: string, idx: number) => (
                                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                                      <i className="fas fa-image"></i> {(j.fotoKegiatan || j.fileLink).split(', ').length > 1 ? \`Foto \${idx + 1}\` : 'Lihat'}
                                    </a>
                                  ))}
                                </div>
                              ) : '-'}
                            </td>
                          </tr>
                        ));
                      };

                      const printChunks = [];
                      for (let i = 0; i < filtered.length; i += itemsPerPage) {
                        printChunks.push(filtered.slice(i, i + itemsPerPage));
                      }
                      if (printChunks.length === 0) printChunks.push([]);

                      const tandaTangan = (
                        <div style={{ marginTop: '50px' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                              <div style={{ textAlign: 'center' }}>
                                 <p>Mengetahui,</p>
                                 <p>Kepala Madrasah</p>
                                 <br/><br/><br/><br/>
                                 <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Dwi Retno Palupi, S.Pd., M.Pd.</p>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                 <p>Singosari, {new Date().toLocaleDateString('id-ID')}</p>
                                 <p>Pembuat Jurnal</p>
                                 <br/><br/><br/><br/>
                                 <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{filterName || '(..................................................)'}</p>
                              </div>
                           </div>
                        </div>
                      );

                      return (
                        <>
                          <div className={styles.noPrint}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                                  <th style={{ width: '150px', textAlign: 'center' }}>Waktu</th>
                                  <th className={styles.noPrint} style={{ textAlign: 'center' }}>Nama Staf</th>
                                  <th style={{ textAlign: 'center' }}>Kegiatan</th>
                                  <th style={{ width: '250px', textAlign: 'center' }}>Keterangan</th>
                                  <th style={{ width: '100px', textAlign: 'center' }}>Foto</th>
                                </tr>
                              </thead>
                              <tbody>
                                {renderRows(paginated, (currentPage - 1) * itemsPerPage, false)}
                              </tbody>
                            </table>
                            {totalPages > 1 && (
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
                                <button type="button" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f8fafc' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
                                  <i className="fas fa-chevron-left"></i> Prev
                                </button>
                                <span style={{ fontWeight: 600, color: '#475569' }}>Halaman {currentPage} dari {totalPages}</span>
                                <button type="button" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f8fafc' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>
                                  Next <i className="fas fa-chevron-right"></i>
                                </button>
                              </div>
                            )}
                          </div>

                          <div className={styles.printOnly} style={{ display: 'none' }}>
                            {printChunks.map((chunk, chunkIdx) => (
                              <div key={chunkIdx} style={{ pageBreakAfter: chunkIdx === printChunks.length - 1 ? 'auto' : 'always', marginBottom: '40px' }}>
                                {chunkIdx > 0 && (
                                  <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Lanjutan Rekap Jurnal Kegiatan</h3>
                                )}
                                <table className={styles.table} style={{ width: '100%', marginBottom: '20px' }}>
                                  <thead>
                                    <tr>
                                      <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                                      <th style={{ width: '150px', textAlign: 'center' }}>Waktu</th>
                                      <th style={{ textAlign: 'center' }}>Kegiatan</th>
                                      <th style={{ width: '250px', textAlign: 'center' }}>Keterangan</th>
                                      <th style={{ width: '100px', textAlign: 'center' }}>Foto</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {renderRows(chunk, chunkIdx * itemsPerPage, true)}
                                  </tbody>
                                </table>
                                {chunkIdx === printChunks.length - 1 && tandaTangan}
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}`;

content = content.substring(0, replaceStart) + replacement + content.substring(replaceEnd);
fs.writeFileSync(path, content);
console.log('done');
