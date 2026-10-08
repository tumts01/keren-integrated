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

    // Pattern 1:
    // {loading ? (
    //   <div className={styles.loading}>
    //     <i className={`fas fa-circle-notch ${styles.spinner}`}></i>
    //     <p>Memuat Data Siswa dari Database (Supabase)...</p>
    //   </div>
    // )
    
    // Pattern 2:
    // {loadingRekap ? (
    //   <tr><td colSpan={7} style={{ textAlign: 'center' }}>Memuat data...</td></tr>
    // )
    
    const divLoadingRegex = /\{\s*([a-zA-Z0-9_]+)\s*\?\s*\(\s*<div[^>]*className=\{styles\.loading\}[^>]*>\s*<i[^>]*fa-circle-notch[^>]*><\/i>\s*<p>(.*?)<\/p>\s*<\/div>\s*\)\s*:/g;
    
    content = content.replace(divLoadingRegex, (match, condition, message) => {
      changed = true;
      return `{${condition} ? (\n          <InlineLoading message="${message}" />\n        ) :`;
    });

    const divLoadingSimpleRegex = /\{\s*([a-zA-Z0-9_]+)\s*\?\s*\(\s*<div[^>]*className=\{styles\.loading\}[^>]*>\s*<i[^>]*fa-spinner[^>]*><\/i>\s*<p>(.*?)<\/p>\s*<\/div>\s*\)\s*:/g;
    
    content = content.replace(divLoadingSimpleRegex, (match, condition, message) => {
      changed = true;
      return `{${condition} ? (\n          <InlineLoading message="${message}" />\n        ) :`;
    });

    const divLoadingTextRegex = /\{\s*([a-zA-Z0-9_]+)\s*\?\s*\(\s*<div[^>]*className=\{styles\.loading\}[^>]*>(.*?)<\/div>\s*\)\s*:/g;
    content = content.replace(divLoadingTextRegex, (match, condition, message) => {
      if (match.includes('InlineLoading')) return match;
      // Strip html tags from message
      const textMessage = message.replace(/<[^>]*>/g, '').trim();
      changed = true;
      return `{${condition} ? (\n          <InlineLoading message="${textMessage}" />\n        ) :`;
    });


    const tableLoadingRegex = /\{\s*([a-zA-Z0-9_]+)\s*\?\s*\(\s*<tr[^>]*><td[^>]*colSpan=\{([0-9]+)\}[^>]*>(.*?)<\/td><\/tr>\s*\)\s*:/g;
    content = content.replace(tableLoadingRegex, (match, condition, colSpan, message) => {
       if (match.includes('InlineLoading')) return match;
      const textMessage = message.replace(/<[^>]*>/g, '').trim();
      changed = true;
      return `{${condition} ? (\n          <tr><td colSpan={${colSpan}} style={{ textAlign: 'center' }}><InlineLoading message="${textMessage}" /></td></tr>\n        ) :`;
    });

    // Special cases:
    // {loading && <div style={{textAlign:'center'}}><i className="fas fa-spinner fa-spin"></i> Memuat data...</div>}
    const inlineAndRegex = /\{\s*([a-zA-Z0-9_]+)\s*&&\s*\(\s*<div[^>]*>\s*<i[^>]*fa-spinner[^>]*><\/i>(.*?)<\/div>\s*\)\s*\}/g;
    content = content.replace(inlineAndRegex, (match, condition, message) => {
        if (match.includes('InlineLoading')) return match;
        const textMessage = message.trim();
        changed = true;
        return `{${condition} && <InlineLoading message="${textMessage}" />}`;
    });
    
    // {loading && <div style={{ textAlign: 'center', margin: '20px 0' }}><i className="fas fa-spinner fa-spin"></i> Memuat daftar absensi...</div>}
    const inlineAndNoParenRegex = /\{\s*([a-zA-Z0-9_]+)\s*&&\s*<div[^>]*>\s*<i[^>]*fa-spinner[^>]*><\/i>(.*?)<\/div>\s*\}/g;
    content = content.replace(inlineAndNoParenRegex, (match, condition, message) => {
        if (match.includes('InlineLoading')) return match;
        const textMessage = message.trim();
        changed = true;
        return `{${condition} && <InlineLoading message="${textMessage}" />}`;
    });


    if (changed) {
      if (!content.includes('import InlineLoading')) {
        // Add import after first imports
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
