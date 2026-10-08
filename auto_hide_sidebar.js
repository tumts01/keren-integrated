const fs = require('fs');
const path = 'src/components/Sidebar.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add isHovered state
content = content.replace(
  /const \[isCollapsed, setIsCollapsed\] = useState\(false\);/,
  `const [isPinnedCollapsed, setIsPinnedCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const isDesktop = typeof window !== 'undefined' ? window.innerWidth > 768 : true;
  const isCollapsed = isPinnedCollapsed && !(isHovered && isDesktop);`
);

// 2. Fix handleToggleSidebar
content = content.replace(
  /const handleToggleSidebar = \(\) => \{\s*const newVal = !isCollapsed;\s*setIsCollapsed\(newVal\);/,
  `const handleToggleSidebar = () => {
    const newVal = !isPinnedCollapsed;
    setIsPinnedCollapsed(newVal);`
);

// 3. Fix initial load effect (saved state)
content = content.replace(
  /setIsCollapsed\(savedCollapse === 'true'\);/,
  `setIsPinnedCollapsed(savedCollapse === 'true');`
);

// 4. Fix mobile overlay onClick
content = content.replace(
  /<div \s*className=\{\`\$\{styles\.mobileOverlay\} \$\{!isCollapsed \? styles\.show : ''\}\`\} \s*onClick=\{\(\) => setIsCollapsed\(true\)\}\s*><\/div>/,
  `<div 
          className={\`\${styles.mobileOverlay} \${!isPinnedCollapsed ? styles.show : ''}\`} 
          onClick={() => setIsPinnedCollapsed(true)}
        ></div>`
);

// 5. Fix Mobile link onClicks
content = content.replace(/setIsCollapsed\(true\)/g, 'setIsPinnedCollapsed(true)');

// 6. Add onMouseEnter and onMouseLeave to aside
// <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
content = content.replace(
  /<aside className=\{\`\$\{styles\.sidebar\} \$\{isCollapsed \? styles\.collapsed : ''\}\`\}>/,
  `<aside 
        className={\`\${styles.sidebar} \${isCollapsed ? styles.collapsed : ''}\`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >`
);

// Fix title of toggle button to reflect pinning
content = content.replace(
  /title=\{isCollapsed \? "Buka Sidebar" : "Sembunyikan Sidebar"\}/,
  `title={isPinnedCollapsed ? "Kunci Sidebar Terbuka" : "Sembunyikan Sidebar"}`
);
content = content.replace(
  /<i className=\{\`fas \$\{isCollapsed \? 'fa-bars' : 'fa-chevron-left'\}\`\}><\/i>/,
  `<i className={\`fas \${isPinnedCollapsed ? 'fa-thumbtack' : 'fa-chevron-left'}\`}></i>`
);

fs.writeFileSync(path, content);
console.log('done TSX update for hover');
