import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

// Load credentials from file or environment variable
const getAuth = () => {
  let credentials;
  
  if (process.env.GOOGLE_CREDENTIALS) {
    // On Vercel, we read the JSON string directly from Env Variables
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } else {
    // Local fallback
    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json';
    const credsFile = fs.readFileSync(path.resolve(credsPath), 'utf8');
    credentials = JSON.parse(credsFile);
  }

  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

export const getSiswaDoc = async () => {
  const auth = getAuth();
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_SISWA_ID as string, auth);
  await doc.loadInfo();
  return doc;
};

export const getBontuDoc = async () => {
  const auth = getAuth();
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_BONTU_ID as string, auth);
  await doc.loadInfo();
  return doc;
};

export const getIndukDoc = async () => {
  const auth = getAuth();
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_INDUK_ID as string, auth);
  await doc.loadInfo();
  return doc;
};

export const getPersuratanDoc = async () => {
  const auth = getAuth();
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_PERSURATAN_ID as string, auth);
  await doc.loadInfo();
  return doc;
};

export async function getPresensiDoc() {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_PRESENSI_ID!, getAuth());
  await doc.loadInfo();
  return doc;
}

export async function getRaporDoc() {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_RAPOR_ID!, getAuth());
  await doc.loadInfo();
  return doc;
};
