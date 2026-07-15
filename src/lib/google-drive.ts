import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

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

/**
 * Uploads a file to a specific Google Drive folder.
 * @param fileBuffer The file content buffer
 * @param fileName The original file name
 * @param mimeType The file mime type (e.g. image/jpeg)
 * @param folderId The Google Drive folder ID
 * @returns The uploaded file ID
 */
export const uploadFileToDrive = async (
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
) => {
  const drive = getDriveAuth();
  
  // Convert Buffer to Readable Stream
  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType: mimeType,
    body: stream,
  };

  try {
    const res = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });
    
    // We can also set permissions to Anyone with a link, but we assume the folder is already shared properly
    return res.data;
  } catch (error) {
    console.error('Error uploading to Drive:', error);
    throw error;
  }
};
