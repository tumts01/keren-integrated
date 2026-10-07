const fs = require('fs');
const path = 'src/app/jurnal-kegiatan/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const search = "                </table>\n\n                {/* TANDA TANGAN (Hanya tampil saat print) */}";

const replacement = "                </table>\n" +
"                {(() => {\n" +
"                   const filteredAll = jurnalStafData.filter(j => {\n" +
"                     let match = true;\n" +
"                     const dStr = j.tanggal || '';\n" +
"                     let jTgl = dStr;\n" +
"                     if (dStr.includes('-') && dStr.length === 10 && dStr.indexOf('-') === 4) jTgl = dStr; \n" +
"                     else {\n" +
"                       const sep = dStr.includes('/') ? '/' : (dStr.includes('-') ? '-' : null);\n" +
"                       if (sep) {\n" +
"                         const parts = dStr.split(sep);\n" +
"                         if (parts.length === 3) {\n" +
"                            if (parts[2].length === 4) jTgl = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;\n" +
"                            else if (parts[0].length === 4) jTgl = `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;\n" +
"                         }\n" +
"                       }\n" +
"                     }\n" +
"                     if (filterStartDate && jTgl < filterStartDate) match = false;\n" +
"                     if (filterEndDate && jTgl > filterEndDate) match = false;\n" +
"                     if (filterName && !j.namaStaf?.toLowerCase().includes(filterName.toLowerCase())) match = false;\n" +
"                     return match;\n" +
"                   });\n" +
"                   const totalPages = Math.ceil(filteredAll.length / 20) || 1;\n" +
"                   if (totalPages <= 1) return null;\n" +
"                   return (\n" +
"                     <div className={styles.noPrint} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>\n" +
"                        <button type=\"button\" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f8fafc' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>\n" +
"                          <i className=\"fas fa-chevron-left\"></i> Prev\n" +
"                        </button>\n" +
"                        <span style={{ fontWeight: 600, color: '#475569' }}>Halaman {currentPage} dari {totalPages}</span>\n" +
"                        <button type=\"button\" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f8fafc' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>\n" +
"                          Next <i className=\"fas fa-chevron-right\"></i>\n" +
"                        </button>\n" +
"                      </div>\n" +
"                   );\n" +
"                })()}\n\n" +
"                {/* TANDA TANGAN (Hanya tampil saat print) */}";

content = content.replace(search, replacement);
fs.writeFileSync(path, content);
console.log('done');
