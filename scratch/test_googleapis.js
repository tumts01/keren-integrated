const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');
const { Readable } = require('stream');

const getDriveAuth = () => {
  let credentials;
  
  if (process.env.GOOGLE_CREDENTIALS) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } else {
    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json';
    const credsFile = fs.readFileSync(path.resolve(credsPath), 'utf8');
    credentials = JSON.parse(credsFile);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
};

async function testUpload() {
  const drive = getDriveAuth();
  const fileBuffer = Buffer.from('Hello Drive API!');
  const folderId = '1XMpQqdTzx0i_WaD79AHdgzhRUUmgQX6z';

  const fileMetadata = {
    name: 'test_direct_upload.txt',
    parents: [folderId],
  };

  const media = {
    mimeType: 'text/plain',
    body: Readable.from(fileBuffer),
  };

  try {
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    console.log('SUCCESS!', file.data);
  } catch (e) {
    console.error('ERROR:', e);
  }
}
testUpload();
