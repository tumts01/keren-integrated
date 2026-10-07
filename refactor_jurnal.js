const fs = require('fs');
const path = 'src/app/jurnal-kegiatan/page.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('const [currentPage, setCurrentPage]')) {
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

  // Find the table and pagination area
  const tableStartRegex = /<div style=\{\{ overflowX: 'auto' \}\}>[\s\S]*?<table className=\{styles\.table\}>[\s\S]*?<tbody>/;
  
  // Actually, let's just replace the IIFE inside tbody.
  // We'll replace {(() => { ... })()} with our new logic.
  
  const iifeRegex = /\{\(\(\) => \{\s*const parseDateStr = \([\s\S]*?return filtered\.length > 0 \? filtered\.map[\s\S]*?\}\)\(\)\}/;

  // Let's replace the whole table div to include both noPrint and printOnly versions.
  // The structure is:
  // <div style={{ overflowX: 'auto' }}>
  //   <table className={styles.table}>...</table>
  //   {/* TANDA TANGAN */} ...

  const fullReplaceRegex = /<div style=\{\{ overflowX: 'auto' \}\}>\s*<table className=\{styles\.table\}>[\s\S]*?<\/table>\s*\{\/\* TANDA TANGAN \(Hanya tampil saat print\) \*\/\}\s*<div className=\{styles\.printOnly\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

  const replaceStr = `
                  <div style={{ overflowX: 'auto' }}>
                    {(() => {
                      const parseDateStr = (dStr: string) => {
                        if (!dStr) return '';
                        if (dStr.includes('-') && dStr.length === 10 && dStr.indexOf('-') === 4) return dStr; 
                        
                        const sep = dStr.includes('/') ? '/' : (dStr.includes('-') ? '-' : null);
                        if (sep) {
                          const parts = dStr.split(sep);
                          if (parts.length === 3) {
                             if (parts[2].length === 4) { 
                               return \`\${parts[2]}-\${parts[1].padStart(2,'0')}-\${parts[0].padStart(2,'0')}\`;
                             } else if (parts[0].length === 4) { 
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

                      const itemsPerPage = 20;
                      const totalPages = Math.ceil(filtered.length / itemsPerPage);
                      const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                      const renderTableRows = (items: any[], startIndex: number) => {
                        if (items.length === 0) return <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Belum ada data jurnal</td></tr>;
                        return items.map((j, i) => (
                          <tr key={i}>
                            <td style={{ textAlign: 'center' }}>{startIndex + i + 1}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: 600 }}>{j.tanggal}</div>
                              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                {j.mulaiDari || '-'} s/d {j.sampaiDengan || '-'}
                              </div>
                            </td>
                            <td className={styles.noPrint}>{j.namaStaf}</td>
                            <td>{j.kegiatan}</td>
                            <td>{j.keterangan || '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                              {j.fileLink ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                  {j.fileLink.split('||').map((url: string, idx: number) => url.trim() && (
                                    <a key={idx} href={url.trim()} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.8rem', color: '#3b82f6', textDecoration: 'none' }}>
                                      <i className="fas fa-image"></i> Foto {idx + 1}
                                    </a>
                                  ))}
                                </div>
                              ) : '-'}
                            </td>
                          </tr>
                        ));
                      };

                      // Generate chunks of 20 for print
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
                          {/* UI ONLY */}
                          <div className={styles.noPrint}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                                  <th style={{ width: '150px', textAlign: 'center' }}>Waktu</th>
                                  <th style={{ textAlign: 'center' }}>Nama Staf</th>
                                  <th style={{ textAlign: 'center' }}>Kegiatan</th>
                                  <th style={{ width: '250px', textAlign: 'center' }}>Keterangan</th>
                                  <th style={{ width: '100px', textAlign: 'center' }}>Foto</th>
                                </tr>
                              </thead>
                              <tbody>
                                {renderTableRows(paginated, (currentPage - 1) * itemsPerPage)}
                              </tbody>
                            </table>
                            {totalPages > 1 && (
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
                                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f8fafc' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
                                  <i className="fas fa-chevron-left"></i> Prev
                                </button>
                                <span style={{ fontWeight: 600, color: '#475569' }}>Halaman {currentPage} dari {totalPages}</span>
                                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f8fafc' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>
                                  Next <i className="fas fa-chevron-right"></i>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* PRINT ONLY */}
                          <div className={styles.printOnly} style={{ display: 'none' }}>
                            {printChunks.map((chunk, chunkIdx) => (
                              <div key={chunkIdx} style={{ pageBreakAfter: chunkIdx === printChunks.length - 1 ? 'auto' : 'always', marginBottom: '20px' }}>
                                {chunkIdx > 0 && (
                                  <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '15px' }}>
                                    Lanjutan Rekap Jurnal Kegiatan
                                  </div>
                                )}
                                <table className={styles.table} style={{ width: '100%' }}>
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
                                    {renderTableRows(chunk, chunkIdx * itemsPerPage)}
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
                </div>`;

  content = content.replace(fullReplaceRegex, replaceStr);
  fs.writeFileSync(path, content);
  console.log('done');
} else {
  console.log('already modified');
}
