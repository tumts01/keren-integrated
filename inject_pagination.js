const fs = require('fs');
const path = 'src/app/jurnal-kegiatan/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /<\/table>\s*\{\/\* TANDA TANGAN \(Hanya tampil saat print\) \*\/\}/;

const replacement = `</table>
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
                  {/* TANDA TANGAN (Hanya tampil saat print) */}`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content);
  console.log("Success");
} else {
  console.log("Not found");
}
