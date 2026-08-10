import { NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const credsStr = process.env.GOOGLE_CREDENTIALS || fs.readFileSync(path.resolve('./google-credentials.json'), 'utf8');
    const creds = JSON.parse(credsStr);
    const auth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const doc = new GoogleSpreadsheet('1_4IRCPtY8pbz86pu5lfQ0c5RPTCWcosxMtwXqpgaPdE', auth);
    await doc.loadInfo();
    
    const result: any = { title: doc.title, sheets: [] };
    for(let i=0; i<doc.sheetCount; i++) {
      const sheet = doc.sheetsByIndex[i];
      await sheet.loadHeaderRow();
      result.sheets.push({ title: sheet.title, headers: sheet.headerValues });
    }
    return NextResponse.json(result);
  } catch(e: any) {
    return NextResponse.json({ error: String(e) });
  }
}
