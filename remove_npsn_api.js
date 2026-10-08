const fs = require('fs');
const path = 'src/app/api/olimpiade-seni/daftar/route.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/\s*'NPSN': formData\.get\('npsn'\) \|\| '',/g, '');

fs.writeFileSync(path, content);
console.log('done3');
