const fs = require('fs');
let content = fs.readFileSync('src/app/globals.css', 'utf8');

// Append cursor rules
content += `\n
/* --- Custom Cursor --- */
body, html {
  cursor: url('/kursor-biasa.png'), auto !important;
}

a, button, [role="button"], input[type="submit"], input[type="button"], input[type="reset"], select, label {
  cursor: url('/kursor-jari.png'), pointer !important;
}

/* Ensure disabled buttons still use the default cursor or blocked cursor */
button:disabled, input:disabled, a.disabled {
  cursor: not-allowed !important;
}
`;

fs.writeFileSync('src/app/globals.css', content);
console.log('Appended cursor CSS successfully.');
