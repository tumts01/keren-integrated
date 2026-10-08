const fs = require('fs');
let content = fs.readFileSync('src/app/api/jurnal/route.ts', 'utf8');

// Replace POST validation
const postRegex = /const \{ data: rows, error: readError \} = await supabase\.from\('data_jurnal_mengajar'\)\.select\('\*'\)\.eq\('tanggal', tanggal\)\.eq\('kelas', kelas\);[\s\S]*?if \(overlappingRow\) \{[\s\S]*?return NextResponse\.json\(\{[\s\S]*?\}, \{ status: 409 \}\);\n\s*\}/;

const newPost = `const { data: rowsDay, error: readError } = await supabase.from('data_jurnal_mengajar').select('*').eq('tanggal', tanggal);
    if (readError) throw readError;

    const submittedJams = jamKeText.split(',').map(j => j.trim()).filter(Boolean);
    let overlappingClass = null;
    let overlappingGuru = null;
    let isExactMatch = false;

    if (rowsDay && rowsDay.length > 0) {
      for (let i = rowsDay.length - 1; i >= 0; i--) {
        const r = rowsDay[i];
        const existingJamKeStr = cleanJamKe(String(r.metadata?.['JAM KE'] || ''));
        const existingJams = existingJamKeStr.split(',').map(j => j.trim()).filter(Boolean);
        const hasOverlap = submittedJams.some(j => existingJams.includes(j));
        
        if (hasOverlap) {
          if (r.kelas === kelas) {
            overlappingClass = r;
            if (existingJamKeStr === cleanJamKe(jamKeText) && r.metadata?.['MAPEL'] === mapel && (r.metadata?.['NAMA GURU'] || '').trim().toLowerCase() === guru.trim().toLowerCase()) {
              isExactMatch = true;
            }
          }
          if ((r.metadata?.['NAMA GURU'] || '').trim().toLowerCase() === guru.trim().toLowerCase()) {
            overlappingGuru = r;
          }
        }
      }
    }

    if (isExactMatch) {
      return NextResponse.json({ success: false, error: 'Data jurnal ini sudah pernah Anda input sebelumnya (Anti-Dobel Aktif).' }, { status: 409 });
    }

    if (overlappingGuru) {
      const dbKelas = overlappingGuru.kelas || overlappingGuru.metadata?.['KELAS'];
      const dbJam = cleanJamKe(String(overlappingGuru.metadata?.['JAM KE'] || ''));
      return NextResponse.json({
        success: false,
        error: \`Anda sudah tercatat mengajar di kelas \${dbKelas} pada jam ke-\${dbJam}. Anda tidak bisa mengajar di dua kelas berbeda pada waktu yang bersamaan.\`
      }, { status: 409 });
    }

    if (overlappingClass) {
      const dbMapel = overlappingClass.metadata?.['MAPEL'];
      const dbGuru = overlappingClass.metadata?.['NAMA GURU'];
      return NextResponse.json({ 
        success: false, 
        error: \`Jam ke-\${jamKeText} di kelas \${kelas} sudah diisi oleh \${dbGuru} (Mapel: \${dbMapel}). Anda tidak bisa menimpa jadwal orang lain.\` 
      }, { status: 409 });
    }`;

if (postRegex.test(content)) {
  content = content.replace(postRegex, newPost);
  console.log('POST replaced');
} else {
  console.log('POST regex failed');
}

// Replace PUT validation
const putRegex = /const \{ data: rows, error: readError \} = await supabase\.from\('data_jurnal_mengajar'\)\.select\('\*'\)\.eq\('tanggal', tanggal\)\.eq\('kelas', kelas\);[\s\S]*?if \(overlappingRow\) \{[\s\S]*?return NextResponse\.json\(\{[\s\S]*?\}, \{ status: 409 \}\);\n\s*\}/g;

const newPut = `const { data: rowsDay, error: readError } = await supabase.from('data_jurnal_mengajar').select('*').eq('tanggal', tanggal);
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
          if ((r.metadata?.['NAMA GURU'] || '').trim().toLowerCase() === guru.trim().toLowerCase()) {
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
        error: \`Anda sudah tercatat mengajar di kelas \${dbKelas} pada jam ke-\${dbJam}. Anda tidak bisa mengajar di dua kelas berbeda pada waktu yang bersamaan.\`
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

const matches = [...content.matchAll(putRegex)];
if (matches.length > 0) {
  // Replace the second occurrence (which is PUT)
  // Wait, my regex might match EVERYTHING between the first POST query and the PUT if! 
  // Let's use string operations instead.
  console.log('Found PUT matches. Wait, regex with /g might be bad if we did it globally.');
} else {
  console.log('PUT regex failed');
}
