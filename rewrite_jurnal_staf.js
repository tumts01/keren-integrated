const fs = require('fs');
const path = 'src/app/jurnal-kegiatan/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /<div style=\{\{ overflowX: 'auto' \}\}>\s*<table className=\{styles\.table\}>[\s\S]*?<\/div>\s*<\/div>\s*\)\}\s*\{\/\* TANDA TANGAN \(Hanya tampil saat print\) \*\/\}\s*<div className=\{styles\.printOnly\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;

// Let's find exactly the boundaries.
let startIdx = content.indexOf("<div style={{ overflowX: 'auto' }}>\n                    <table className={styles.table}>");
let endIdx = content.indexOf("</div>\n              </div>\n            )}\n          </div>\n        ) : activeTab === 'jurnal-mgmp'");

if (startIdx === -1 || endIdx === -1) {
  console.log("Could not find boundaries!");
  process.exit(1);
}

const replacement = `
                  <style type="text/css" media="print">
                    {\`
                      @page { margin-top: 5mm !important; }
                    \`}
                  </style>
                  <div style={{ overflowX: 'auto' }}>
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

                      const filteredAll = jurnalStafData.filter(j => {
                        let match = true;
                        const jTgl = parseDateStr(j.tanggal);
                        if (filterStartDate && jTgl < filterStartDate) match = false;
                        if (filterEndDate && jTgl > filterEndDate) match = false;
                        if (filterName && !j.namaStaf?.toLowerCase().includes(filterName.toLowerCase())) match = false;
                        return match;
                      });

                      const itemsPerPage = 20;
                      const totalPages = Math.ceil(filteredAll.length / itemsPerPage) || 1;
                      const paginated = filteredAll.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                      const renderRows = (items: any[], startIndex: number) => {
                        if (items.length === 0) return <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Belum ada data jurnal</td></tr>;
                        return items.map((j, i) => (
                          <tr key={i}>
                            <td style={{ textAlign: 'center' }}>{startIndex + i + 1}</td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#334155' }}>{j.tanggal}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                {j.mulaiDari && j.sampaiDengan ? \`\${j.mulaiDari} s/d \${j.sampaiDengan}\` : j.mulaiDari || j.sampaiDengan || ''}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{j.namaStaf}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                {(() => {
                                  const guru = gurus.find(g => g.nama === j.namaStaf);
                                  return guru?.jabatan || 'Guru';
                                })()}
                              </div>
                            </td>
                            <td>{j.kegiatan}</td>
                            <td>{j.keterangan || '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                              {j.fotoKegiatan || j.fileLink ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                                  {(j.fotoKegiatan || j.fileLink).split(', ').map((url: string, idx: number) => url.trim() && (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                      <div className={styles.printOnly} style={{ display: 'none' }}>
                                        <img src={\`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=\${encodeURIComponent(url.trim())}\`} alt="QR" style={{ width: '50px', height: '50px' }} />
                                      </div>
                                      <a href={url.trim()} target="_blank" rel="noopener noreferrer" className={styles.noPrint} style={{ color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                                        <i className="fas fa-image"></i> {(j.fotoKegiatan || j.fileLink).split(', ').length > 1 ? \`Foto \${idx + 1}\` : 'Lihat'}
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              ) : '-'}
                            </td>
                          </tr>
                        ));
                      };

                      const printChunks = [];
                      for (let i = 0; i < filteredAll.length; i += itemsPerPage) {
                        printChunks.push(filteredAll.slice(i, i + itemsPerPage));
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

                      const tableHeader = (
                        <thead>
                          <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>No</th>
                            <th style={{ width: '130px', textAlign: 'center' }}>Waktu</th>
                            <th style={{ width: '180px', textAlign: 'center' }}>Nama & Jabatan</th>
                            <th style={{ textAlign: 'center' }}>Kegiatan</th>
                            <th style={{ width: '200px', textAlign: 'center' }}>Keterangan</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Dokumentasi</th>
                          </tr>
                        </thead>
                      );

                      return (
                        <>
                          <div className={styles.noPrint}>
                            <table className={styles.table}>
                              {tableHeader}
                              <tbody>
                                {renderRows(paginated, (currentPage - 1) * itemsPerPage)}
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
                              <div key={chunkIdx} style={{ pageBreakAfter: chunkIdx === printChunks.length - 1 ? 'auto' : 'always', marginBottom: '20px' }}>
                                {chunkIdx > 0 && (
                                  <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '15px', marginTop: '10px' }}>
                                    Lanjutan Rekap Jurnal Kegiatan Guru & Staf
                                  </div>
                                )}
                                <table className={styles.table} style={{ width: '100%', marginBottom: '20px' }}>
                                  {tableHeader}
                                  <tbody>
                                    {renderRows(chunk, chunkIdx * itemsPerPage)}
                                  </tbody>
                                </table>
                                {chunkIdx === printChunks.length - 1 && tandaTangan}
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
`;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync(path, content);
console.log("done");
