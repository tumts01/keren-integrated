const fs = require('fs');
const path = 'src/app/perangkat-ujian/sts/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldRegex = /const dateStr = curr\.tanggal \|\| '';[\s\S]*?const nama = \(curr\.namaSiswa \|\| ''\)/g;
const newStr = `const dateStr = curr.tanggal || '';
            if (dateStr) {
              let m = 0; let y = 0;
              if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) { m = parseInt(parts[1], 10); y = parseInt(parts[2].length === 4 ? parts[2] : parts[0], 10); }
              } else if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) { m = parseInt(parts[1], 10); y = parseInt(parts[0].length === 4 ? parts[0] : parts[2], 10); }
              }
              if (!isNaN(m) && m > 0 && !isNaN(y) && y > 2000) {
                const [yStart, yEnd] = tahunAjaran.split('/').map(Number);
                if (semester === 'Ganjil' && y !== yStart) return acc;
                if (semester === 'Genap' && y !== yEnd) return acc;
                if (semester === 'Ganjil' && (m < 7 || m > 12)) return acc;
                if (semester === 'Genap' && (m < 1 || m > 6)) return acc;
              } else { return acc; }
            } else { return acc; }

            const nama = (curr.namaSiswa || '')`;

content = content.replace(oldRegex, newStr);
fs.writeFileSync(path, content);
console.log('done');
