import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  getGuruSessionFromRequest,
  isSensitiveStaffRole,
  KEREN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signToken,
  GuruSessionPayload,
} from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getGuruSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const { data: userRow } = await supabase
      .from('data_users')
      .select('*')
      .eq('id', session.uid)
      .maybeSingle();

    if (!userRow) {
      return NextResponse.json(
        { authenticated: false },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const nama = userRow.nama || userRow.metadata?.['Nama'] || session.nama;
    const username = userRow.username || userRow.metadata?.['Username'] || session.username;
    const role = userRow.role || userRow.metadata?.['Role'] || session.role || 'GTK';
    const whatsapp = userRow.metadata?.['Whatsapp'] || '';
    const foto = userRow.metadata?.['Foto'] || userRow.metadata?.['foto'] || '';
    const hasPin = Boolean(userRow.metadata?.['PIN_HASH'] || userRow.metadata?.['PIN']);
    // Seluruh Guru & Staf wajib membuat PIN 6 digit pribadi jika belum memiliki PIN
    const needPinSetup = !hasPin;

    const response = NextResponse.json(
      {
        authenticated: true,
        user: {
          id: userRow.id,
          nama,
          username,
          role,
          whatsapp,
          foto,
          hasPin,
          needPinSetup,
        },
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );

    // Sinkronkan cookie apabila role atau username di database mengalami pembaruan
    if (role !== session.role || username !== session.username || nama !== session.nama) {
      const nowSec = Math.floor(Date.now() / 1000);
      const updatedToken = await signToken<GuruSessionPayload>({
        uid: userRow.id,
        username,
        nama,
        role,
        iat: nowSec,
        exp: nowSec + SESSION_MAX_AGE_SECONDS,
      });
      response.cookies.set(KEREN_SESSION_COOKIE, updatedToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
    }

    return response;
  } catch (error) {
    console.error('Session Check Error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
