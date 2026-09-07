const fs = require('fs');
let content = fs.readFileSync('src/app/spmb/page.tsx', 'utf8');

content = content.replace(/const \[leAkta,\s*setFileAkta\].*\n?/g, '');
content = content.replace(/const fileAktaRef.*\n?/g, '');
content = content.replace(/if\s*\(\!fileKk\s*\@||\s*\!fileAkta\)/g, 'if (!fileKk)');
content = content.replace(/'File Kartu Keluarga dan Akta Kelahiran wajib diunggah!'/g, \''File Kartu Keluarga wajib diunggah!'\');
content = content.replace(/\\/\\/ 2. Upload Akta dengan rename otomatis[\\s\m]*const linkAkta = await uploadToDrive\(fileAkta, `AKTA_\${safeName}`\);\s*/g, '');
content = content.replace(/,\s*linkAkta:\s*linkAkta/g, '');
content = content.replace(/setFileAkta\(null\);?\r?\n?/g, '');
content = content.replace(/if\s*\(fileAktaRef\\.current\)\s*fileAktaRef\\.current\\.value\s*=\s*'';?\r?\n?/g, '');

content = content.replace(/\{\/\\*\s*Akta Upload\s*\\*\/\}[\\s\\S]*?<\\/div>\s*<D\\/div>\s*<D\\/div>\s*<button type="submit"/g, '</div>\n\n          <button type="submit"');

fs.writeFileSync('src/app/spmb/page.tsx', content);
lr��W�o��	њ^Y	�N