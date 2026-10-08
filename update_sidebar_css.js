const fs = require('fs');
const path = 'src/components/Sidebar.module.css';
let content = fs.readFileSync(path, 'utf8');

// Add border top to category group
content = content.replace(
  /\.categoryGroup \{\s*margin-bottom: 16px;\s*\}/,
  `.categoryGroup {
  margin-bottom: 8px;
}

.categoryGroup:not(:first-child) {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 12px;
  padding-top: 16px;
}`
);

// We might want to remove the chevron in the category title, but user just said "ada sekat2nya". 
// Let's modify Sidebar.tsx to remove the chevron and onClick if we want it to exactly match the example, OR just keep it but with sekat.
// Example image doesn't have chevrons on main headers, but DOES on subitems (wait, subitems don't have chevron either in the image, but our app might need it).
// Let's just add the sekat first.

fs.writeFileSync(path, content);
console.log('done CSS');
