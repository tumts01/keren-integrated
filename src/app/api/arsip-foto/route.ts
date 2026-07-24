import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const getDriveAuth = () => {
  let credentials;
  if (process.env.GOOGLE_CREDENTIALS) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } else {
    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json';
    const credsFile = fs.readFileSync(path.resolve(credsPath), 'utf8');
    credentials = JSON.parse(credsFile);
  }
  return google.drive({
    version: 'v3',
    auth: new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    }),
  });
};

const ARSIP_FOLDER_ID = '1sjJADviJZBvVlFOOY2rc2MVSf6uealPH';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || ARSIP_FOLDER_ID;

    const drive = getDriveAuth();

    // Get subfolders
    const foldersRes = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 100,
      orderBy: 'name',
    });

    // Get image files
    const filesRes = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
      fields: 'files(id, name, mimeType, thumbnailLink, createdTime)',
      pageSize: 200,
      orderBy: 'createdTime desc',
    });

    // Get current folder name (if not root)
    let folderName = 'Arsip Foto';
    if (folderId !== ARSIP_FOLDER_ID) {
      try {
        const meta = await drive.files.get({ fileId: folderId, fields: 'name,parents' });
        folderName = meta.data.name || 'Folder';
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      success: true,
      folderName,
      isRoot: folderId === ARSIP_FOLDER_ID,
      folders: (foldersRes.data.files || []).map(f => ({
        id: f.id,
        name: f.name,
      })),
      files: (filesRes.data.files || []).map(f => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        thumbnail: f.thumbnailLink,
        createdTime: f.createdTime,
      })),
    });
  } catch (error: any) {
    console.error('Arsip Foto API Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal memuat data' }, { status: 500 });
  }
}
