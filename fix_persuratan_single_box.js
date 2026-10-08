const fs = require('fs');
let content = fs.readFileSync('src/app/persuratan/page.tsx', 'utf8');

const regex = /\{\/\* Dashboard Analytics for Surat Keluar \*\/\}\s*\{!loading && !error && activeTab === 'keluar' && \(\s*<div className=\{styles\.statsGrid\}[\s\S]*?<\/div>\s*\)\}/;

const newBlock = `{/* Dashboard Analytics for Surat Keluar */}
        {!loading && !error && activeTab === 'keluar' && (
          <div style={{ padding: '20px 24px 10px 24px' }}>
            <div style={{ 
              background: 'white', 
              borderRadius: '12px', 
              padding: '16px 24px', 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: '24px', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #3b82f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '220px', flex: 1 }}>
                <div className={styles.statIcon} style={{ color: '#3b82f6', background: '#eff6ff' }}>
                  <i className="fas fa-envelope"></i>
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>TOTAL SURAT KELUAR</span>
                  <span className={styles.statValue}>{totalKeluar}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '220px', flex: 1 }}>
                <div className={styles.statIcon} style={{ color: '#ef4444', background: '#fef2f2' }}>
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>BELUM DIARSIPKAN</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className={styles.statValue} style={{ color: '#ef4444' }}>{totalBelumArsipKeluar}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Menunggu upload scan/PDF</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}`;

if (regex.test(content)) {
  content = content.replace(regex, newBlock);
  fs.writeFileSync('src/app/persuratan/page.tsx', content);
  console.log('Successfully updated stats layout via regex');
} else {
  console.log('Regex did not match');
}
