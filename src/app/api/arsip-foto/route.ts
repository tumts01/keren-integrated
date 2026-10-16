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
    const querySearch = searchParams.get('q');

    const drive = getDriveAuth();

    // If global search query provided
    if (querySearch && querySearch.trim()) {
      const sanitized = querySearch.trim().replace(/'/g, "\\'");
      const [foldersRes, filesRes] = await Promise.all([
        drive.files.list({
          q: `mimeType='application/vnd.google-apps.folder' and name contains '${sanitized}' and trashed=false`,
          fields: 'files(id, name)',
          pageSize: 50,
          orderBy: 'name',
        }),
        drive.files.list({
          q: `mimeType contains 'image/' and name contains '${sanitized}' and trashed=false`,
          fields: 'files(id, name, mimeType, thumbnailLink, createdTime)',
          pageSize: 150,
          orderBy: 'createdTime desc',
        }),
      ]);

      return NextResponse.json({
        success: true,
        folderName: `Hasil Pencarian: "${querySearch.trim()}"`,
        isSearch: true,
        isRoot: false,
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
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
      });
    }

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
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error: any) {
    console.error('Arsip Foto API Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal memuat data' }, { status: 500 });
  }
}
