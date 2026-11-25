import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getGuruSessionFromRequest } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getGuruSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const assetPath = path.join(process.cwd(), 'src', 'assets', 'ttd-kamad.png');
  if (!fs.existsSync(assetPath)) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const imgBuffer = fs.readFileSync(assetPath);
  return new NextResponse(imgBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
