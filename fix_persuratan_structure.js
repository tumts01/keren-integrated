const fs = require('fs');
let content = fs.readFileSync('src/app/persuratan/page.tsx', 'utf8');

// The original file had the </div> for stickyTop wrapping the statsGrid.
// We want stickyTop to close immediately after Tab Navigation, and we want to remove the </div> that closes it later.
// Currently it looks like:
//        </div>
//
//        </div>
//
//          {/* Dashboard Analytics for Surat Keluar */}

content = content.replace(
  /<\/div>\s*<\/div>\s*\{\/\* Dashboard Analytics for Surat Keluar \*\/\}/g,
  `</div>\n        </div>\n\n        {/* Dashboard Analytics for Surat Keluar */}`
);

// At the end of statsGrid:
//              </div>
//            </div>
//          )}
//        </div>
//  
//        <div className={styles.card} style={{ marginTop: activeTab === 'masuk' ? '20px' : '0' }}>

content = content.replace(
  /(\s*<\/div>\s*\)\}\s*)<\/div>(\s*<div className=\{styles\.card\})/g,
  `$1$2`
);

fs.writeFileSync('src/app/persuratan/page.tsx', content);
console.log('cleaned');
