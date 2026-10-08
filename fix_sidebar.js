const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
content = content.replace(/\{\s*name:\s*'Apresiasi',\s*path:\s*'\/dispo\/apresiasi'\s*\},[\s\n\r]*\{\s*name:\s*'Pelanggaran',\s*path:\s*'\/dispo\/pelanggaran'\s*\}/, "{ name: 'Apresiasi & Pelanggaran', path: '/dispo/poin' }");
fs.writeFileSync('src/components/Sidebar.tsx', content);
console.log('Sidebar replaced correctly');
