const fs = require('fs');
let content = fs.readFileSync('src/app/globals.css', 'utf8');

// Append cursor rule for typing
content += `
input[type="text"], input[type="password"], input[type="number"], input[type="email"], input[type="search"], textarea, .searchInput {
  cursor: url('/kursor-ngetik.png'), text !important;
}
`;

fs.writeFileSync('src/app/globals.css', content);
console.log('Appended text cursor CSS successfully.');
