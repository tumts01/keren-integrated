import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  GuruSessionPayload,
  isSensitiveStaffRole,
  KEREN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signToken,
} from '@/lib/auth-session';
import {
  checkRateLimit,
  clearRateLimit,
  getClientIp,
  hashSecret,
  verifySecret,
} from '@/lib/pin-crypto';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateKey = `guru-login:${ip}`;
    const rate = checkRateLimit(rateKey, 20, 5 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Terlalu banyak percobaan login. Silakan tunggu ${rate.retryAfterSec} detik.`,
        },
        { status: 429 }
      );
    }

    const { username, pin } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ success: false, error: 'Username harus diisi' }, { status: 400 });
    }

    const cleanUser = username.trim();
    if (!cleanUser || cleanUser.length > 64) {
      return NextResponse.json({ success: false, error: 'Format username tidak valid' }, { status: 400 });
    }

    const escapedPattern = cleanUser.replace(/[\\%_]/g, '\\$&');
    const [{ data: rowsByCol, error: errCol }, { data: rowsByMeta, error: errMeta }] = await Promise.all([
      supabase.from('data_users').select('*').ilike('username', escapedPattern),
      supabase.from('data_users').select('*').ilike('metadata->>Username', escapedPattern),
    ]);
    if (errCol) throw errCol;
    if (errMeta) throw errMeta;

    const mergedMap = new Map<any, any>();
    for (const r of [...(rowsByCol || []), ...(rowsByMeta || [])]) {
      if (r && !mergedMap.has(r.id)) mergedMap.set(r.id, r);
    }
    const rows = Array.from(mergedMap.values());

    const userRow = rows.find((r: any) => {
      const colUsername = r.username;
      const metaUsername = r.metadata?.['Username'];
      const target = cleanUser.toLowerCase();
      return (
        (colUsername && colUsername.toString().toLowerCase().trim() === target) ||
        (metaUsername && metaUsername.toString().toLowerCase().trim() === target)
      );
    });

    if (!userRow) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 401 });
    }

    const storedPinHash = userRow.metadata?.['PIN_HASH'];
    const storedPlainPin = userRow.metadata?.['PIN'];
    const activeSecret = storedPinHash || (storedPlainPin ? String(storedPlainPin).trim() : '');
    const hasPin = Boolean(activeSecret);
    let pinNeedsMigration = false;

    if (hasPin) {
      const providedPin = typeof pin === 'string' ? pin.trim() : '';
      if (!providedPin) {
        return NextResponse.json({
          success: false,
          requirePin: true,
          message: 'Akun ini dilindungi PIN keamanan 6 digit. Silakan masukkan PIN Anda.',
        });
      }

      const pinCheck = verifySecret(providedPin, String(activeSecret));
      if (!pinCheck.valid) {
        return NextResponse.json(
          {
            success: false,
            requirePin: true,
            error: 'PIN keamanan yang Anda masukkan salah!',
          },
          { status: 401 }
        );
      }
      pinNeedsMigration = pinCheck.needsRehash;
    }

    clearRateLimit(rateKey);

    try {
      const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const updatedMetadata: Record<string, any> = {
        ...(userRow.metadata || {}),
        'Terakhir Login': timestamp,
      };
      if (pinNeedsMigration && typeof pin === 'string') {
        updatedMetadata['PIN_HASH'] = hashSecret(pin.trim());
        delete updatedMetadata['PIN'];
      }
      await supabase.from('data_users').update({ metadata: updatedMetadata }).eq('id', userRow.id);
    } catch (logError) {
      console.error('Failed to log last login time:', logError);
    }

    const nama = userRow.nama || userRow.metadata?.['Nama'] || '';
    const resolvedUsername = userRow.username || userRow.metadata?.['Username'] || cleanUser;
    const role = userRow.role || userRow.metadata?.['Role'] || 'GTK';
    const rawFoto = userRow.metadata?.['Foto'] || userRow.metadata?.['foto'] || '';
    const needPinSetup = !hasPin && isSensitiveStaffRole(role);

    const nowSec = Math.floor(Date.now() / 1000);
    const sessionToken = await signToken<GuruSessionPayload>({
      uid: userRow.id,
      username: resolvedUsername,
      nama,
      role,
      iat: nowSec,
      exp: nowSec + SESSION_MAX_AGE_SECONDS,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: userRow.id,
        nama,
        username: resolvedUsername,
        role,
        whatsapp: userRow.metadata?.['Whatsapp'] || '',
        hasPin,
        pinVerified: true,
        needPinSetup,
        foto: rawFoto,
      },
    });

    response.cookies.set(KEREN_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan saat login' }, { status: 500 });
  }
}
