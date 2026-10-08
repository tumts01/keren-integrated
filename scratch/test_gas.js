const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const gasUrl = process.env.GOOGLE_APPS_SCRIPT_UPLOAD_URL;

async function run() {
  const largeBuffer = Buffer.alloc(15 * 1024 * 1024, 'a'); // 15MB
  const base64Data = largeBuffer.toString('base64');
  console.log('Base64 Length:', base64Data.length);
  
  const params = new URLSearchParams();
  params.append('fileData', base64Data);
  params.append('fileName', 'large_test.txt');
  params.append('mimeType', 'text/plain');
  params.append('folderId', '1XMpQqdTzx0i_WaD79AHdgzhRUUmgQX6z');
  
  try {
    const res = await fetch(gasUrl, { method: 'POST', body: params });
    const text = await res.text();
    console.log('RESPONSE:', text.substring(0, 500));
  } catch (e) {
    console.error(e);
  }
}
run();
