const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const gasUrl = process.env.GOOGLE_APPS_SCRIPT_UPLOAD_URL;

async function run() {
  const base64Data = Buffer.from('Hello World').toString('base64');
  const params = new URLSearchParams();
  params.append('fileData', base64Data);
  params.append('fileName', 'Credentials_Template Pendaftaran Kolektif & (1).xlsx');
  params.append('mimeType', 'text/plain');
  params.append('folderId', '1XMpQqdTzx0i_WaD79AHdgzhRUUmgQX6z');
  
  try {
    const res = await fetch(gasUrl, { method: 'POST', body: params });
    const text = await res.text();
    console.log('RESPONSE:', text);
  } catch (e) {
    console.error(e);
  }
}
run();
