import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  getGuruSessionFromRequest,
  GuruSessionPayload,
  isAdminOrPimpinanRole,
  KEREN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signToken,
} from '@/lib/auth-session';
import { encryptPinForAdmin, hashSecret } from '@/lib/pin-crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getGuruSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sesi login tidak valid' }, { status: 401 });
    }

    const { oldUsername, newUsername, newRole, newPin, resetPin, userId } = await request.json();

    const { data: rows, error } = await supabase.from('data_users').select('*');
    if (error) throw error;

    // Cari user target berdasarkan userId atau oldUsername
    let userRow: any = null;
    if (userId) {
      userRow = (rows || []).find((r: any) => String(r.id) === String(userId));
    }
    if (!userRow && oldUsername) {
      userRow = (rows || []).find((r: any) => {
        const dbCol = r.username;
        const dbMeta = r.metadata?.['Username'];
        return (
          (dbCol && dbCol.toString().toLowerCase().trim() === oldUsername.toLowerCase().trim()) ||
          (dbMeta && dbMeta.toString().toLowerCase().trim() === oldUsername.toLowerCase().trim())
        );
      });
    }

    if (!userRow) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    const isSelf = String(session.uid) === String(userRow.id);
    const isStrictAdmin = (session.role || '').trim().toLowerCase() === 'admin';

    if (!isSelf && !isAdminOrPimpinanRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak memiliki hak akses untuk mengubah akun pengguna lain' },
        { status: 403 }
      );
    }

    const currentUsername = String(userRow.username || userRow.metadata?.['Username'] || '').trim();
    const currentRole = String(userRow.role || userRow.metadata?.['Role'] || 'GTK').trim();

    const cleanNewUsername =
      typeof newUsername === 'string' && newUsername.trim() ? newUsername.trim() : currentUsername;
    const usernameChanged = cleanNewUsername.toLowerCase() !== currentUsername.toLowerCase() || cleanNewUsername !== currentUsername;

    if (usernameChanged) {
      if (cleanNewUsername.length < 3) {
        return NextResponse.json({ success: false, error: 'Username baru minimal 3 karakter' }, { status: 400 });
      }
      if (/\s/.test(cleanNewUsername)) {
        return NextResponse.json({ success: false, error: 'Username tidak boleh mengandung spasi' }, { status: 400 });
      }

      const isNewTaken = (rows || []).some((r: any) => {
        if (r.id === userRow.id) return false;
        const dbCol = r.username;
        const dbMeta = r.metadata?.['Username'];
        return (
          (dbCol && dbCol.toString().toLowerCase().trim() === cleanNewUsername.toLowerCase()) ||
          (dbMeta && dbMeta.toString().toLowerCase().trim() === cleanNewUsername.toLowerCase())
        );
      });

      if (isNewTaken) {
        return NextResponse.json(
          {
            success: false,
            error: `Username '${cleanNewUsername}' sudah dipakai oleh user/guru lain. Silakan pilih username yang berbeda.`,
          },
          { status: 400 }
        );
      }
    }

    // Validasi perubahan Role (hanya diizinkan untuk akun ber-role Admin)
    let finalRole = currentRole;
    const requestedRole = typeof newRole === 'string' ? newRole.trim() : '';
    const roleChanged = Boolean(requestedRole && requestedRole !== currentRole);

    if (roleChanged) {
      if (!isStrictAdmin) {
        return NextResponse.json(
          { success: false, error: 'Hanya akun Admin yang dapat mengubah jenis Role pengguna.' },
          { status: 403 }
        );
      }
      if (requestedRole.length > 50) {
        return NextResponse.json(
          { success: false, error: 'Nama Role maksimal 50 karakter.' },
          { status: 400 }
        );
      }
      if (isSelf && requestedRole.toLowerCase() !== 'admin') {
        return NextResponse.json(
          {
            success: false,
            error: 'Demi keamanan, Anda tidak dapat menurunkan role Admin milik akun Anda sendiri.',
          },
          { status: 400 }
        );
      }
      finalRole = requestedRole;
    }

    // Validasi reset PIN atau set PIN manual oleh Admin
    const doResetPin = Boolean(resetPin === true);
    const cleanNewPin = typeof newPin === 'string' ? newPin.trim() : '';
    const doSetPin = Boolean(cleanNewPin);

    if ((doResetPin || doSetPin) && !isStrictAdmin) {
      return NextResponse.json(
        { success: false, error: 'Hanya akun Admin yang dapat mengelola/mereset PIN pengguna lain.' },
        { status: 403 }
      );
    }

    if (doSetPin && !/^\d{6}$/.test(cleanNewPin)) {
      return NextResponse.json(
        { success: false, error: 'PIN baru harus tepat 6 digit angka.' },
        { status: 400 }
      );
    }

    const updatedMetadata: Record<string, any> = {
      ...(userRow.metadata || {}),
      Username: cleanNewUsername,
      Role: finalRole,
    };

    if (usernameChanged) {
      updatedMetadata['Sudah Ganti Username'] = 'TRUE';
    }

    if (doResetPin) {
      delete updatedMetadata['PIN_HASH'];
      delete updatedMetadata['PIN_ENC'];
      delete updatedMetadata['PIN'];
    } else if (doSetPin) {
      updatedMetadata['PIN_HASH'] = hashSecret(cleanNewPin);
      updatedMetadata['PIN_ENC'] = encryptPinForAdmin(cleanNewPin);
      delete updatedMetadata['PIN'];
    }

    const updatePayload: Record<string, any> = {
      username: cleanNewUsername,
      role: finalRole,
      metadata: updatedMetadata,
    };

    const { error: updateError } = await supabase
      .from('data_users')
      .update(updatePayload)
      .eq('id', userRow.id);

    if (updateError) throw updateError;

    const sudahGantiFinal = updatedMetadata['Sudah Ganti Username'] === 'TRUE';
    const hasPinFinal = Boolean(updatedMetadata['PIN_HASH'] || updatedMetadata['PIN']);

    const response = NextResponse.json({
      success: true,
      message: `Data akun ${userRow.nama || cleanNewUsername} berhasil diperbarui.`,
      user: {
        id: userRow.id,
        nama: userRow.nama || userRow.metadata?.['Nama'] || '',
        username: cleanNewUsername,
        role: finalRole,
        whatsapp: userRow.metadata?.['Whatsapp'] || '',
        foto: userRow.metadata?.['Foto'] || userRow.metadata?.['foto'] || '',
        sudahGanti: sudahGantiFinal,
        hasPin: hasPinFinal,
        ...(isStrictAdmin
          ? {
              pinDisplay: doResetPin
                ? ''
                : doSetPin
                ? cleanNewPin
                : undefined,
            }
          : {}),
      },
    });

    if (isSelf) {
      const nowSec = Math.floor(Date.now() / 1000);
      const refreshedToken = await signToken<GuruSessionPayload>({
        uid: userRow.id,
        username: cleanNewUsername,
        nama: userRow.nama || userRow.metadata?.['Nama'] || session.nama,
        role: finalRole,
        iat: nowSec,
        exp: nowSec + SESSION_MAX_AGE_SECONDS,
      });
      response.cookies.set(KEREN_SESSION_COOKIE, refreshedToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
    }

    return response;
  } catch (error: any) {
    console.error('Update User/Role Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server saat memperbarui akun: ' + error.message },
      { status: 500 }
    );
  }
}
