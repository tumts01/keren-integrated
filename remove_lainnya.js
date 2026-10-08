const fs = require('fs');
const path = 'src/app/nilai-siswa/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove `<option value="Lainnya">Lainnya...</option>`
content = content.replace(/<option value="Lainnya">Lainnya\.\.\.<\/option>/g, '');

// Remove `{mapel === 'Lainnya' && ...}` blocks
content = content.replace(/\{mapel === 'Lainnya' && \(\s*<div className=\{styles\.formGroup\}>\s*<label>Nama Mapel Lainnya<\/label>\s*<input type="text" className=\{styles\.input\} value=\{mapelLain\} onChange=\{e => setMapelLain\(e\.target\.value\)\} placeholder="Tulis mapel\.\.\." \/>\s*<\/div>\s*\)\}/g, '');

// Clean up const finalMapel = mapel === 'Lainnya' ? mapelLain : mapel;
content = content.replace(/const finalMapel = mapel === 'Lainnya' \? mapelLain : mapel;/g, 'const finalMapel = mapel;');

// Clean up mapel fallback logic in setMapel
content = content.replace(/if \(!pkMapelList\.includes\(prevMapel\) && prevMapel !== 'Lainnya' && pkMapelList\.length > 0\) \{/g, 'if (!pkMapelList.includes(prevMapel) && pkMapelList.length > 0) {');

fs.writeFileSync(path, content);
console.log('done');
