const fs = require('fs');
const rtfParser = require('rtf-parser');

async function parseRtf(path) {
  return new Promise((resolve, reject) => {
    const content = fs.readFileSync(path, 'utf8');
    rtfParser.string(content, (err, doc) => {
      if (err) return reject(err);
      let text = '';
      for (const para of doc.content) { // it might be doc.content instead of paragraphs
        if (para.content) {
            for (const span of para.content) {
                if (span.value) text += span.value;
            }
        }
        text += '\n';
      }
      resolve(text);
    });
  });
}

async function extractFiles() {
  const dir = 'D:/keren-integrated/public/suryo';
  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (file.endsWith('.doc')) {
      const fullPath = `${dir}/${file}`;
      console.log(`\n\n--- FILE: ${file} ---`);
      try {
        const text = await parseRtf(fullPath);
        console.log(text);
      } catch (err) {
        console.error(err);
      }
    }
  }
}

extractFiles().catch(console.error);
