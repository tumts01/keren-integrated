import { NextResponse } from 'next/server';
import {
  getGuruSessionFromRequest,
  getPerangkatCookieName,
  isPerangkatUnlocked,
  PerangkatUnlockPayload,
  signToken,
} from '@/lib/auth-session';
import { checkRateLimit, clearRateLimit, getClientIp, verifySecret } from '@/lib/pin-crypto';

export const dynamic = 'force-dynamic';

const UNLOCK_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 jam

// Salted scrypt hashes (mencegah penyimpanan kredensial plaintext di kode sumber maupun bundle klien)
const DEFAULT_BENDAHARA_HASH =
  'scrypt:6921cad94554012d359138a77a9db68f:0143798876f497f87d5fe728a0e095a12cd6e1aa21ae07781a527d2a5e14907b';
const DEFAULT_SEKRETARIS_HASH =
  'scrypt:a5d930c7ba990e4bb957dde72737b8d5:d1e6848e0e33f93ef5d7dc1a312259d0b444a6fa9a3da8557437ac7375263ecb';

export async function GET(req: Request) {
  const session = await getGuruSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ unlocked: false }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope');
  if (scope !== 'bendahara' && scope !== 'sekretaris') {
    return NextResponse.json({ unlocked: false, error: 'Scope tidak valid' }, { status: 400 });
  }

  const unlocked = await isPerangkatUnlocked(req, scope, session.uid);
  return NextResponse.json({ unlocked });
}

export async function POST(req: Request) {
  const session = await getGuruSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sesi login diperlukan' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rateKey = `pu-unlock:${ip}`;
  const rate = checkRateLimit(rateKey, 10, 5 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: `Terlalu banyak percobaan. Coba lagi dalam ${rate.retryAfterSec} detik.` },
      { status: 429 }
    );
  }

  const { scope, credential } = await req.json();
  if (scope !== 'bendahara' && scope !== 'sekretaris') {
    return NextResponse.json({ success: false, error: 'Scope tidak valid' }, { status: 400 });
  }

  const targetSecretOrHash =
    scope === 'bendahara'
      ? process.env.BENDAHARA_UJIAN_PASSWORD || DEFAULT_BENDAHARA_HASH
      : process.env.SEKRETARIS_UJIAN_PASSWORD || DEFAULT_SEKRETARIS_HASH;

  const check = verifySecret(String(credential ?? ''), targetSecretOrHash);
  if (!check.valid) {
    return NextResponse.json(
      { success: false, error: scope === 'bendahara' ? 'Kredensial Bendahara salah!' : 'Password Sekretaris salah!' },
      { status: 401 }
    );
  }

  clearRateLimit(rateKey);

  const nowSec = Math.floor(Date.now() / 1000);
  const token = await signToken<PerangkatUnlockPayload>({
    scope,
    uid: session.uid,
    exp: nowSec + UNLOCK_MAX_AGE_SECONDS,
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set(getPerangkatCookieName(scope), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: UNLOCK_MAX_AGE_SECONDS,
  });
  return res;
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope');
  const res = NextResponse.json({ success: true });
  if (scope === 'bendahara' || scope === 'sekretaris') {
    res.cookies.set(getPerangkatCookieName(scope), '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
  }
  return res;
}
