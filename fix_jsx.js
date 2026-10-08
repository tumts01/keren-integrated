const fs = require('fs');
let c = fs.readFileSync('src/app/dispo/poin/page.tsx', 'utf8');
c = c.replace(/<td> 0 \? '#1d4ed8' : r\.total < 0 \? '#b91c1c' : '#64748b' \}\}>/g, "<td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f8fafc', color: r.total > 0 ? '#1d4ed8' : r.total < 0 ? '#b91c1c' : '#64748b' }}>");
fs.writeFileSync('src/app/dispo/poin/page.tsx', c);
console.log('Fixed JSX syntax error');
