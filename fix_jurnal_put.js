const fs = require('fs');
let content = fs.readFileSync('src/app/api/jurnal/route.ts', 'utf8');

// Normalize line endings for replacement
content = content.replace(/\r\n/g, '\n');

const putMatchRegex = /\/\/ Get all rows for that date and class to check for overlap\s*const \{ data: rows, error: readError \} = await supabase\s*\.from\('data_jurnal_mengajar'\)\s*\.select\('\*'\)\s*\.eq\('tanggal', tanggal\)\s*\.eq\('kelas', kelas\);[\s\S]*?if \(overlappingRow\) \{[\s\S]*?return NextResponse\.json\(\{[\s\S]*?\}, \{ status: 409 \}\);\n\s*\}/;

const newPutBlock = `// Get all rows for that date to check for overlap
    const { data: rowsDay, error: readError } = await supabase
      .from('data_jurnal_mengajar')
      .select('*')
      .eq('tanggal', tanggal);

    if (readError) throw readError;

    const submittedJams = jamKeText.split(',').map(j => j.trim()).filter(Boolean);
    let overlappingClass = null;
    let overlappingGuru = null;

    if (rowsDay && rowsDay.length > 0) {
      for (const r of rowsDay) {
        if (r.id.toString() === id.toString() || r.metadata?.['ID'] === id) continue;

        const existingJamKeStr = cleanJamKe(String(r.metadata?.['JAM KE'] || ''));
        const existingJams = existingJamKeStr.split(',').map(j => j.trim()).filter(Boolean);
        const hasOverlap = submittedJams.some(j => existingJams.includes(j));
        
        if (hasOverlap) {
          if (r.kelas === kelas) {
            overlappingClass = r;
          }
          if ((r.metadata?.['NAMA GURU'] || '').trim().toLowerCase() === actualGuru.trim().toLowerCase()) {
            overlappingGuru = r;
          }
        }
      }
    }

    if (overlappingGuru) {
      const dbKelas = overlappingGuru.kelas || overlappingGuru.metadata?.['KELAS'];
      const dbJam = cleanJamKe(String(overlappingGuru.metadata?.['JAM KE'] || ''));
      return NextResponse.json({
        success: false,
        error: \`Gagal menyimpan: Anda tercatat sedang mengajar di kelas \${dbKelas} pada jam ke-\${dbJam}. (Satu guru tidak bisa mengajar di kelas yang berbeda pada waktu yang sama)\`
      }, { status: 409 });
    }

    if (overlappingClass) {
      const dbMapel = overlappingClass.metadata?.['MAPEL'];
      const dbGuru = overlappingClass.metadata?.['NAMA GURU'];
      return NextResponse.json({ 
        success: false, 
        error: \`Jam ke-\${jamKeText} di kelas \${kelas} bertabrakan dengan isian milik \${dbGuru} (Mapel: \${dbMapel}).\` 
      }, { status: 409 });
    }`;

if (putMatchRegex.test(content)) {
  content = content.replace(putMatchRegex, newPutBlock);
  fs.writeFileSync('src/app/api/jurnal/route.ts', content);
  console.log('Success PUT');
} else {
  console.log('Failed PUT');
}
