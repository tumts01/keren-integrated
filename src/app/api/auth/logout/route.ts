import { NextResponse } from 'next/server';
import { KEREN_SESSION_COOKIE, PORTAL_SESSION_COOKIE } from '@/lib/auth-session';

export async function POST() {
  const res = NextResponse.json({ success: true });
  const clearOpts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  };

  res.cookies.set(KEREN_SESSION_COOKIE, '', clearOpts);
  res.cookies.set(PORTAL_SESSION_COOKIE, '', clearOpts);
  res.cookies.set('keren_pu_bendahara', '', clearOpts);
  res.cookies.set('keren_pu_sekretaris', '', clearOpts);

  return res;
}
