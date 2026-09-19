const fs = require('fs');
const path = require('path');

const files = [
  'src/app/siswa/page.tsx',
  'src/app/guru/page.tsx',
  'src/app/emis/page.tsx',
  'src/app/kelas/page.tsx',
  'src/app/mata-pelajaran/page.tsx',
  'src/app/presensi/page.tsx',
  'src/app/jurnal/page.tsx',
  'src/app/jurnal-kegiatan/page.tsx',
  'src/app/persuratan/page.tsx',
  'src/app/prestasi/page.tsx',
  'src/app/jadwal-mengajar/page.tsx',
  'src/app/loker-digital/page.tsx',
  'src/app/survey-madrasah/page.tsx',
  'src/app/perangkat-ujian/sts/page.tsx',
  'src/app/perangkat-ujian/susulan/page.tsx',
  'src/app/absensi-gtk/page.tsx'
];

files.forEach(file => {
  try {
    const fullPath = path.resolve('D:/keren-integrated', file);
    if (!fs.existsSync(fullPath)) return;
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let changed = false;

    // table loading without parens
    const tableLoadingRegex2 = /\{\s*([a-zA-Z0-9_]+)\s*\?\s*<tr[^>]*><td[^>]*colSpan=\{([0-9]+)\}[^>]*>(.*?)<\/td><\/tr>\s*:/g;
    content = content.replace(tableLoadingRegex2, (match, condition, colSpan, message) => {
       if (match.includes('InlineLoading')) return match;
      const textMessage = message.replace(/<[^>]*>/g, '').trim();
      changed = true;
      return `{${condition} ? (\n          <tr><td colSpan={${colSpan}} style={{ textAlign: 'center' }}><InlineLoading message="${textMessage}" /></td></tr>\n        ) :`;
    });

    const divLoadingTextRegex2 = /\{\s*([a-zA-Z0-9_]+)\s*\?\s*\(?\s*<div[^>]*className=\{styles\.loading\}[^>]*>(.*?)<\/div>\s*\)?\s*:/g;
    content = content.replace(divLoadingTextRegex2, (match, condition, message) => {
      if (match.includes('InlineLoading')) return match;
      const textMessage = message.replace(/<[^>]*>/g, '').trim();
      changed = true;
      return `{${condition} ? (\n          <InlineLoading message="${textMessage}" />\n        ) :`;
    });

    // any div loading matching "Memuat" inside ternary
    const memuatRegex = /\{\s*([a-zA-Z0-9_]+)\s*\?\s*\(?\s*<div[^>]*>\s*(?:<i[^>]*><\/i>)?\s*(Memuat[^<]*)\s*<\/div>\s*\)?\s*:/gi;
    content = content.replace(memuatRegex, (match, condition, message) => {
      if (match.includes('InlineLoading')) return match;
      const textMessage = message.trim();
      changed = true;
      return `{${condition} ? (\n          <InlineLoading message="${textMessage}" />\n        ) :`;
    });

    if (changed) {
      if (!content.includes('import InlineLoading')) {
        const lines = content.split('\n');
        let lastImportIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ')) {
            lastImportIndex = i;
          }
        }
        lines.splice(lastImportIndex + 1, 0, "import InlineLoading from '@/components/InlineLoading';");
        content = lines.join('\n');
      }
      fs.writeFileSync(fullPath, content);
      console.log(`Updated ${file}`);
    }
  } catch (err) {
    console.error(`Error updating ${file}: ${err.message}`);
  }
});
