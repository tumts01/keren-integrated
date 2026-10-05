const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const xlsx = require('xlsx');

const gasUrl = process.env.GOOGLE_APPS_SCRIPT_UPLOAD_URL;

async function run() {
  const updatedExcelData = [];
  
  const newWorkbook = xlsx.utils.book_new();
  const newWorksheet = xlsx.utils.json_to_sheet(updatedExcelData);
  xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Peserta');
  const newExcelBuffer = xlsx.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
  
  const base64Data = newExcelBuffer.toString('base64');
  const params = new URLSearchParams();
  params.append('fileData', base64Data);
  params.append('fileName', 'Credentials_test.xlsx');
  params.append('mimeType', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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
