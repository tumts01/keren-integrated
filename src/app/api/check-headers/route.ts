import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function GET() {
  const doc = await getIndukDoc();
  const sheet = doc.sheetsByTitle['DATABASE'];
  await sheet.loadHeaderRow();
  return NextResponse.json({ headers: sheet.headerValues });
}
