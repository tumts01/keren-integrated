const fs = require('fs');
const path = 'src/app/perangkat-ujian/sts/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the literal `n
content = content.replace(
  /<div class="kemenag">KEMENTERIAN AGAMA REPUBLIK INDONESIA<\/div>`n            <div class="yayasan">YAYASAN PENDIDIKAN ALMAARIF SINGOSARI<\/div>/g,
  `<div class="kemenag">KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
            <div class="yayasan">YAYASAN PENDIDIKAN ALMAARIF SINGOSARI</div>`
);

// Fix the CSS for kop-text
content = content.replace(
  /\.kop-text \.instansi \{ font-size: 7\.5pt; \}/,
  `.kop-text .kemenag { font-size: 11pt; font-weight: normal; font-family: Arial, sans-serif; }`
);
content = content.replace(
  /\.kop-text \.yayasan \{ font-size: 9pt; font-weight: bold; \}/,
  `.kop-text .yayasan { font-size: 11pt; font-weight: normal; font-family: Arial, sans-serif; }`
);
content = content.replace(
  /\.kop-text \.sekolah \{ font-size: 12pt; font-weight: bold; \}/,
  `.kop-text .sekolah { font-size: 11pt; font-weight: normal; font-family: Arial, sans-serif; }`
);
content = content.replace(
  /\.kop-text \.alamat \{ font-size: 7\.5pt; \}/,
  `.kop-text .alamat { font-size: 9pt; font-weight: normal; font-family: Arial, sans-serif; }`
);

fs.writeFileSync(path, content);
console.log('done');
