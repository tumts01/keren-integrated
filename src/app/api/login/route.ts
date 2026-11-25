import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { username, pin } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ success: false, error: 'Username harus diisi' }, { status: 400 });
    }

    const cleanUser = username.trim();
    if (!cleanUser || cleanUser.length > 64) {
      return NextResponse.json({ success: false, error: 'Format username tidak valid' }, { status: 400 });
    }

    // Gunakan query terpisah terparameterisasi (tanpa interpolasi string .or) untuk mencegah PostgREST filter injection
    const escapedPattern = cleanUser.replace(/[\\%_]/g, '\\$&');
    const [{ data: rowsByCol, error: errCol }, { data: rowsByMeta, error: errMeta }] = await Promise.all([
      supabase.from('data_users').select('*').ilike('username', escapedPattern),
      supabase.from('data_users').select('*').ilike('metadata->>Username', escapedPattern)
    ]);
    if (errCol) throw errCol;
    if (errMeta) throw errMeta;

    const mergedMap = new Map<any, any>();
    for (const r of [...(rowsByCol || []), ...(rowsByMeta || [])]) {
      if (r && !mergedMap.has(r.id)) mergedMap.set(r.id, r);
    }
    const rows = Array.from(mergedMap.values());

    const userRow = (rows || []).find((r: any) => {
      const colUsername = r.username;
      const metaUsername = r.metadata?.['Username'];
      const target = cleanUser.toLowerCase();
      return (
        (colUsername && colUsername.toString().toLowerCase().trim() === target) ||
        (metaUsername && metaUsername.toString().toLowerCase().trim() === target)
      );
    });

    if (userRow) {
      // Attempt to log last login time
      try {
        const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const updatedMetadata = { ...userRow.metadata, 'Terakhir Login': timestamp };
        await supabase.from('data_users').update({ metadata: updatedMetadata }).eq('id', userRow.id);
      } catch (logError) {
        console.error('Failed to log last login time:', logError);
      }

      const rawFoto = userRow.metadata?.['Foto'] || userRow.metadata?.['foto'] || '';
      const storedPin = String(userRow.metadata?.['PIN'] || '').trim();
      const hasPin = Boolean(storedPin);
      const pinVerified = hasPin ? (typeof pin === 'string' && pin.trim() === storedPin) : true;

      // Login Success (jangan pernah kembalikan PIN plaintext ke klien)
      return NextResponse.json({
        success: true,
        user: {
          id: userRow.id,
          nama: userRow.nama || userRow.metadata?.['Nama'] || '',
          username: userRow.username || userRow.metadata?.['Username'] || cleanUser,
          role: userRow.role || userRow.metadata?.['Role'] || '',
          whatsapp: userRow.metadata?.['Whatsapp'] || '',
          hasPin,
          pinVerified,
          foto: rawFoto
        }
      });
    }

    return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 401 });
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan saat login' }, { status: 500 });
  }
}
