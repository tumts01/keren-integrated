const fs = require('fs');
const path = 'src/app/jurnal-kegiatan/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /<table className=\{styles\.table\}>\s*\{tableHeader\}/,
  "<table className={`${styles.table} jurnal-staf-print-table`}>\n                              {tableHeader}"
);
content = content.replace(
  /<table className=\{styles\.table\} style=\{\{ width: '100%', marginBottom: '20px' \}\}>\s*\{tableHeader\}/,
  "<table className={`${styles.table} jurnal-staf-print-table`} style={{ width: '100%', marginBottom: '20px' }}>\n                                  {tableHeader}"
);

fs.writeFileSync(path, content);
console.log('done');
