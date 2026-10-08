const fs = require('fs');
let content = fs.readFileSync('src/app/siswa/page.tsx', 'utf8');

content = content.replace(/<th className="col-ket">\$\{customKeterangan \|\| 'Keterangan'\}<\/th>/g, '<th className="col-ket">{customKeterangan || \'Keterangan\'}</th>');

fs.writeFileSync('src/app/siswa/page.tsx', content);
console.log('Fixed JSX');
