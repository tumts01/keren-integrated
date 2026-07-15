import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

// Load credentials from file
const getAuth = () => {
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json';
  const credsFile = fs.readFileSync(path.resolve(credsPath), 'utf8');
  const credentials = JSON.parse(credsFile);

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
