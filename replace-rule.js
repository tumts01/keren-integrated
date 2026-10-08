const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('D:/keren-integrated/src', function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content
      .replace(/get\('Rule'\)/g, "get('Role')")
      .replace(/user\.rule/g, 'user.role')
      .replace(/user\?\.rule/g, 'user?.role')
      .replace(/u\.rule/g, 'u.role')
      .replace(/parsedUser\.rule/g, 'parsedUser.role')
      .replace(/userRole\.rule/g, 'userRole.role'); // just in case

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log('Updated', filePath);
    }
  }
});
