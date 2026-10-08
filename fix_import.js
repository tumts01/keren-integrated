const fs = require('fs');
const path = 'src/app/jurnal-kegiatan/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find double import and replace with single
content = content.replace(
  /import PenelitianMahasiswaTab from '@\/components\/PenelitianMahasiswaTab';\s*import PenelitianMahasiswaTab from '@\/components\/PenelitianMahasiswaTab';/,
  "import PenelitianMahasiswaTab from '@/components/PenelitianMahasiswaTab';"
);

fs.writeFileSync(path, content);
console.log('done');
