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
  const gasUrl = process.env.GOOGLE_APPS_SCRIPT_UPLOAD_URL;
  if (!gasUrl) {
    throw new Error('GOOGLE_APPS_SCRIPT_UPLOAD_URL belum dikonfigurasi di .env.local');
  }

  // Convert buffer to base64
  const base64Data = fileBuffer.toString('base64');

  // Use URLSearchParams to send as x-www-form-urlencoded
  const params = new URLSearchParams();
  params.append('fileData', base64Data);
  params.append('fileName', fileName);
  params.append('mimeType', mimeType);
  params.append('folderId', folderId);

  try {
    const response = await fetch(gasUrl, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Unknown Error from GAS');
    }

    const url = result.url;
    let fileId = '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      fileId = match[1];
    }

    return { 
      webViewLink: url,
      id: fileId 
    };
  } catch (error) {
    console.error('Error uploading to GAS:', error);
    throw error;
  }
};

/**
 * Retrieves a list of folders inside a specific Google Drive folder.
 * @param parentId The parent Google Drive folder ID
 * @returns Array of folders with id, name, and webViewLink
 */
export const getFoldersInDrive = async (parentId: string) => {
  const drive = getDriveAuth();
  
  try {
    const res = await drive.files.list({
      q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, webViewLink)',
      pageSize: 1000,
      orderBy: 'name',
    });
    
    return res.data.files || [];
  } catch (error) {
    console.error('Error fetching folders from Drive:', error);
    throw error;
  }
};
