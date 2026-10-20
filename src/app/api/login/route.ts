import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ success: false, error: 'Username harus diisi' }, { status: 400 });
    }

    // Filter langsung di database — cari berdasarkan kolom username atau metadata->>Username
    const cleanUser = username.trim();
    const { data: rows, error } = await supabase
      .from('data_users')
      .select('*')
      .or(`username.ilike.${cleanUser},metadata->>Username.ilike.${cleanUser}`);
    if (error) throw error;

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

      // Login Success
      return NextResponse.json({
        success: true,
        user: {
          id: userRow.id,
          nama: userRow.nama || userRow.metadata?.['Nama'] || '',
          username: userRow.username || userRow.metadata?.['Username'] || cleanUser,
          role: userRow.role || userRow.metadata?.['Role'] || '',
          whatsapp: userRow.metadata?.['Whatsapp'] || '',
          pin: userRow.metadata?.['PIN'] || '',
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
