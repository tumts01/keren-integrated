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

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getGuruSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sesi login tidak valid' }, { status: 401 });
    }

    const { oldUsername, newUsername, userId } = await request.json();

    if (!newUsername || !newUsername.trim()) {
      return NextResponse.json({ success: false, error: 'Username baru harus diisi' }, { status: 400 });
    }
    
    const cleanNewUsername = newUsername.trim();
    if (cleanNewUsername.length < 3) {
      return NextResponse.json({ success: false, error: 'Username baru minimal 3 karakter' }, { status: 400 });
    }

    if (/\s/.test(cleanNewUsername)) {
      return NextResponse.json({ success: false, error: 'Username tidak boleh mengandung spasi' }, { status: 400 });
    }

    const { data: rows, error } = await supabase.from('data_users').select('*');
    if (error) throw error;

    // Cari user target berdasarkan userId atau oldUsername
    let userRow: any = null;
    if (userId) {
      userRow = (rows || []).find((r: any) => r.id === userId);
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

    // Pastikan non-Admin hanya dapat mengubah username miliknya sendiri
    const isSelf = String(session.uid) === String(userRow.id);
    if (!isSelf && !isAdminOrPimpinanRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak memiliki hak akses untuk mengubah username pengguna lain' },
        { status: 403 }
      );
    }

    // Pastikan username baru tidak dipakai oleh user LAIN
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
      return NextResponse.json({
        success: false,
        error: `Username '${cleanNewUsername}' sudah dipakai oleh user/guru lain. Silakan pilih username yang berbeda.`
      }, { status: 400 });
    }

    // Update kolom username dan metadata
    const updatedMetadata = {
      ...(userRow.metadata || {}),
      'Username': cleanNewUsername,
      'Sudah Ganti Username': 'TRUE'
    };
    
    const { error: updateError } = await supabase
      .from('data_users')
      .update({
        username: cleanNewUsername,
        metadata: updatedMetadata
      })
      .eq('id', userRow.id);

    if (updateError) throw updateError;

    const response = NextResponse.json({
      success: true,
      message: `Username untuk ${userRow.nama || cleanNewUsername} berhasil diperbarui menjadi ${cleanNewUsername}`,
      user: {
        id: userRow.id,
        nama: userRow.nama || userRow.metadata?.['Nama'] || '',
        username: cleanNewUsername,
        role: userRow.role || userRow.metadata?.['Role'] || '',
        whatsapp: userRow.metadata?.['Whatsapp'] || '',
        foto: userRow.metadata?.['Foto'] || userRow.metadata?.['foto'] || '',
        sudahGanti: true
      }
    });

    if (String(session.uid) === String(userRow.id)) {
      const nowSec = Math.floor(Date.now() / 1000);
      const refreshedToken = await signToken<GuruSessionPayload>({
        uid: userRow.id,
        username: cleanNewUsername,
        nama: userRow.nama || userRow.metadata?.['Nama'] || session.nama,
        role: userRow.role || userRow.metadata?.['Role'] || session.role,
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
    console.error('Update Username Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server saat update username: ' + error.message }, { status: 500 });
  }
}
