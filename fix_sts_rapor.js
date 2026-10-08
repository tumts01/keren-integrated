const fs = require('fs');
let content = fs.readFileSync('src/app/perangkat-ujian/sts/page.tsx', 'utf8');

const regex = /Object\.keys\(grouped\)\.forEach\(k => \{\s*grouped\[k\]\.S = Number\(\(grouped\[k\]\.S \/ 10\)\.toFixed\(1\)\);\s*grouped\[k\]\.I = Number\(\(grouped\[k\]\.I \/ 10\)\.toFixed\(1\)\);\s*grouped\[k\]\.A = Number\(\(grouped\[k\]\.A \/ 10\)\.toFixed\(1\)\);\s*\}\);/;

const newLogic = `Object.keys(grouped).forEach(k => {
            const calc = (v: number) => {
              const hari = v / 10;
              return hari <= 0.5 ? 0 : Math.ceil(hari);
            };
            grouped[k].S = calc(grouped[k].S);
            grouped[k].I = calc(grouped[k].I);
            grouped[k].A = calc(grouped[k].A);
          });`;

if (regex.test(content)) {
  content = content.replace(regex, newLogic);
  fs.writeFileSync('src/app/perangkat-ujian/sts/page.tsx', content);
  console.log('Success');
} else {
  console.log('Regex failed');
}
