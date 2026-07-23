import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

// ─── Auth Builder ────────────────────────────────────────────────────────────

function buildAuth(credJson: string): JWT {
  const credentials = JSON.parse(credJson);
  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getCredentialsJson(): string {
  if (process.env.GOOGLE_CREDENTIALS) return process.env.GOOGLE_CREDENTIALS;
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json';
  return fs.readFileSync(path.resolve(credsPath), 'utf8');
}

function getCredentialsJson2(): string | null {
  return process.env.GOOGLE_CREDENTIALS_2 || null;
}

// Rotasi sederhana: pakai angka detik untuk pilih akun 1 atau 2
// Detik genap → akun 1, detik ganjil → akun 2
// Efektif membagi quota 50/50 antar service account
function getRotatedAuth(): JWT {
  const creds2 = getCredentialsJson2();
  if (creds2) {
    const useSecondary = Math.floor(Date.now() / 1000) % 2 === 1;
    return buildAuth(useSecondary ? creds2 : getCredentialsJson());
  }
  return buildAuth(getCredentialsJson());
}

// ─── Retry dengan fallback ke service account ke-2 ───────────────────────────

async function getDocWithFallback(sheetId: string): Promise<GoogleSpreadsheet> {
  const creds1 = getCredentialsJson();
  const creds2 = getCredentialsJson2();

  // Coba akun 1
  try {
    const auth1 = buildAuth(creds1);
    const doc = new GoogleSpreadsheet(sheetId, auth1);
    await doc.loadInfo();
    return doc;
  } catch (err: any) {
    const isQuota = err?.message?.includes('429') || err?.status === 429;
    // Kalau 429 dan ada akun ke-2, fallback ke akun 2
    if (isQuota && creds2) {
      console.warn('SA-1 quota exceeded, falling back to SA-2...');
      const auth2 = buildAuth(creds2);
      const doc2 = new GoogleSpreadsheet(sheetId, auth2);
      await doc2.loadInfo();
      return doc2;
    }
    throw err;
  }
}

// ─── Doc Getters ─────────────────────────────────────────────────────────────

export const getSiswaDoc = async () => {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_SISWA_ID as string, getRotatedAuth());
  await doc.loadInfo();
  return doc;
};

export const getBontuDoc = async () => {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_BONTU_ID as string, getRotatedAuth());
  await doc.loadInfo();
  return doc;
};

export const getIndukDoc = async () => {
  return getDocWithFallback(process.env.GOOGLE_SHEET_INDUK_ID as string);
};

export const getPersuratanDoc = async () => {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_PERSURATAN_ID as string, getRotatedAuth());
  await doc.loadInfo();
  return doc;
};

export async function getPresensiDoc() {
  // Presensi paling sering dipake → pakai fallback
  return getDocWithFallback(process.env.GOOGLE_SHEET_PRESENSI_ID as string);
}

export async function getRaporDoc() {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_RAPOR_ID as string, getRotatedAuth());
  await doc.loadInfo();
  return doc;
}

export async function getNotulenDoc() {
  return getDocWithFallback('1nZINEbfTS48NS3AGMbmyxmUiP8jTdpJOhkjDtgBc9SY');
}
