const fs = require('fs');
const path = 'src/app/jurnal-kegiatan/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state
content = content.replace(
  "const [jurnalStafSubTab, setJurnalStafSubTab] = useState<'isi' | 'rekap'>('isi');",
  "const [jurnalStafSubTab, setJurnalStafSubTab] = useState<'isi' | 'rekap'>('isi');\n  const [currentPage, setCurrentPage] = useState(1);"
);

// 2. Reset page
content = content.replace(
  "onClick={() => setJurnalStafSubTab('rekap')}",
  "onClick={() => { setJurnalStafSubTab('rekap'); setCurrentPage(1); }}"
);
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

// 3. Rename filtered to filteredAll
content = content.replace(
  "const filtered = jurnalStafData.filter(j => {",
  "const filteredAll = jurnalStafData.filter(j => {"
);

// 4. Add pagination slice
content = content.replace(
  "return filtered.length > 0 ? filtered.map((j, i) => (",
  `const itemsPerPage = 20;
                        const totalPages = Math.ceil(filteredAll.length / itemsPerPage) || 1;
                        const filtered = filteredAll.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                        return filtered.length > 0 ? filtered.map((j, i) => (`
);

// 5. Update index mapping
content = content.replace(
  "<td style={{ textAlign: 'center' }}>{i + 1}</td>",
  "<td style={{ textAlign: 'center' }}>{(currentPage - 1) * 20 + i + 1}</td>"
);

// 6. Add pagination UI right after </table>
content = content.replace(
  "</table>\n\n                  {/* TANDA TANGAN",
  `</table>
                  {totalPages > 1 && (
                    <div className={styles.noPrint} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
                      <button type="button" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f8fafc' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
                        <i className="fas fa-chevron-left"></i> Prev
                      </button>
                      <span style={{ fontWeight: 600, color: '#475569' }}>Halaman {currentPage} dari {totalPages}</span>
                      <button type="button" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f8fafc' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>
                        Next <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  )}

                  {/* TANDA TANGAN`
);

// 7. Fix print logic
// Instead of modifying the UI table for print, let's just make the print feature use the printChunks method!
// Actually, if we just do:
// <div className={styles.printOnly} style={{ display: 'none' }}> ...
// We can just add the print layout completely separate!
const printLayout = `
                  {/* PRINT LAYOUT */}
                  <div className={styles.printOnly} style={{ display: 'none' }}>
                    {(() => {
                       const printChunks = [];
                       for (let i = 0; i < filteredAll.length; i += 20) {
                         printChunks.push(filteredAll.slice(i, i + 20));
                       }
                       if (printChunks.length === 0) printChunks.push([]);

                       return printChunks.map((chunk, chunkIdx) => (
                         <div key={chunkIdx} style={{ pageBreakAfter: chunkIdx === printChunks.length - 1 ? 'auto' : 'always', marginBottom: '20px' }}>
                           {chunkIdx > 0 && <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '15px' }}>Lanjutan Rekap Jurnal Kegiatan</div>}
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
                               {chunk.map((j: any, i: number) => (
                                 <tr key={i}>
                                   <td style={{ textAlign: 'center' }}>{chunkIdx * 20 + i + 1}</td>
                                   <td>
                                     <div style={{ fontWeight: 600, color: '#334155' }}>{j.tanggal}</div>
                                     <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                       {j.mulaiDari && j.sampaiDengan ? \`\${j.mulaiDari} s/d \${j.sampaiDengan}\` : j.mulaiDari || j.sampaiDengan || ''}
                                     </div>
                                   </td>
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
                               ))}
                               {chunk.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>Belum ada data jurnal</td></tr>}
                             </tbody>
                           </table>
                           {chunkIdx === printChunks.length - 1 && (
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
                           )}
                         </div>
                       ));
                    })()}
                  </div>
`;

// Replace the original tanda tangan with the new print layout
content = content.replace(/\{\/\* TANDA TANGAN \(Hanya tampil saat print\) \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, printLayout + "\n                </div>\n              </div>\n");

// Hide the UI table during print
content = content.replace("<div style={{ overflowX: 'auto' }}>\n                  <table className={styles.table}>", "<div className={styles.noPrint} style={{ overflowX: 'auto' }}>\n                  <table className={styles.table}>");

fs.writeFileSync(path, content);
console.log('done');
