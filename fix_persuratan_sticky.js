const fs = require('fs');
const path = 'src/app/persuratan/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Move the closing </div> of stickyTop to be BEFORE the statsGrid.
content = content.replace(
  /(\{\/\* Dashboard Analytics for Surat Keluar \*\/\}\s*\{!loading && !error && activeTab === 'keluar' && \(\s*<div className=\{styles\.statsGrid\})/,
  `</div>\n\n          $1`
);

// 2. Remove the existing </div> that was closing stickyTop after the statsGrid
content = content.replace(
  /(\s*<\/div>\s*)\}\s*<\/div>\s*(<div className=\{styles\.card\})/,
  `$1}\n\n        $2`
);

fs.writeFileSync(path, content);
console.log('done move statsGrid');
