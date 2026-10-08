const fs = require('fs');
const path = 'src/app/perangkat-ujian/sts/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacement = `const fN = (v: any) => (v === null || v === undefined || v === '') ? '' : isNaN(Number(v)) ? v : Math.round(Number(v));
    const mkRow = (no: string, mapelName: string) => {
      const n = getNilai(mapelName);
      return \`<tr>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${no}</td>
        <td style="border:1px solid #333;padding:5px 4px;padding-left:14px;">\${mapelName}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${fN(n.tp1)}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${fN(n.tp2)}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${fN(n.tp3)}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${fN(n.tp4)}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${fN(n.tp5)}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${fN(n.tp6)}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${fN(n.sts)}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;font-weight:bold;">\${fN(n.na)}</td>
      </tr>\`;
    };`;

content = content.replace(
  /const mkRow = \(no: string, mapelName: string\) => \{[\s\S]*?<\/tr>\`;\s*\};/,
  replacement
);

fs.writeFileSync(path, content);
console.log('done');
