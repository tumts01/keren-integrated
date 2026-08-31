import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ success: false, error: 'Username harus diisi' }, { status: 400 });
    }

    const { data: rows, error } = await supabase.from('data_users').select('*');
    if (error) throw error;
    
    // Find user by Username (case-insensitive for convenience)
    const userRow = (rows || []).find((r: any) => {
      const dbUsername = r.metadata?.['Username'];
      return dbUsername && dbUsername.toString().toLowerCase().trim() === username.toLowerCase().trim();
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

      // Login Success
      return NextResponse.json({
        success: true,
        user: {
          nama: userRow.nama || userRow.metadata?.['Nama'] || '',
          username: userRow.metadata?.['Username'] || '',
          role: userRow.metadata?.['Role'] || '',
          whatsapp: userRow.metadata?.['Whatsapp'] || '',
          pin: userRow.metadata?.['PIN'] || ''
        }
      });
    }

    return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 401 });
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan saat login' }, { status: 500 });
  }
}
