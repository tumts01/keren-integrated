const fs = require('fs');
const path = 'src/components/Sidebar.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove onClick and chevron
content = content.replace(
  /<div \s*className=\{styles\.categoryTitle\} \s*onClick=\{\(\) => toggleCategory\(cat\.title\)\}\s*>\s*<span>\{cat\.title\}<\/span>\s*<i className=\{\`fas fa-chevron-\$\{isOpen \? 'up' : 'down'\}\`\} style=\{\{ fontSize: '0\.7rem', transition: 'transform 0\.2s' \}\}><\/i>\s*<\/div>/g,
  `<div className={styles.categoryTitle}>
                  <span>{cat.title}</span>
                </div>`
);

// Always keep categoryItems open
// <div className={`${styles.categoryItems} ${isOpen || isCollapsed ? styles.open : ''}`}>
// We'll remove max-height logic or just make it always styles.open
content = content.replace(
  /<div className=\{\`\$\{styles\.categoryItems\} \$\{\(isOpen \|\| isCollapsed\) \? styles\.open : ''\}\`\}>/g,
  `<div className={\`\${styles.categoryItems} \${styles.open}\`}>`
);
content = content.replace(
  /<div className=\{\`\$\{styles\.categoryItems\} \$\{isOpen \|\| isCollapsed \? styles\.open : ''\}\`\}>/g,
  `<div className={\`\${styles.categoryItems} \${styles.open}\`}>`
);

fs.writeFileSync(path, content);
console.log('done TSX');
