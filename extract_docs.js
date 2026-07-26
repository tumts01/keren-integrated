const fs = require('fs');
const mammoth = require('mammoth');

async function extractFiles() {
  const dir = 'D:/keren-integrated/public/suryo';
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = `${dir}/${file}`;
    console.log(`\n\n--- FILE: ${file} ---`);
    if (file.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ path: fullPath });
      console.log(result.value);
    } else if (file.endsWith('.doc')) {
      // It's probably RTF, we'll just read it as string and strip some RTF tags if possible, or just print raw
      const rtf = fs.readFileSync(fullPath, 'utf8');
      // Simple regex to strip RTF tags
      let text = rtf.replace(/\\([a-z]+)[0-9]*\s?/ig, '');
      text = text.replace(/[{}]/g, '');
      console.log(text.substring(0, 5000));
    }
  }
}

extractFiles().catch(console.error);
