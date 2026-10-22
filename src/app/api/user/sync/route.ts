import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = (searchParams.get('username') || '').trim();
    const nama = (searchParams.get('nama') || '').trim();

    if (!username && !nama) {
      return NextResponse.json({ success: false, error: 'Username atau nama diperlukan' }, { status: 400 });
    }

    // Cari di data_users (aman dari karakter koma/gelar nama)
    let rows: any[] = [];
    if (username) {
      const cleanUser = username.replace(/[^a-zA-Z0-9_.-]/g, '');
      const { data } = await supabase
        .from('data_users')
        .select('*')
        .or(`username.ilike.${cleanUser},metadata->>Username.ilike.${cleanUser}`);
      if (data && data.length > 0) rows = data;
    }

    if (rows.length === 0 && nama) {
      const { data } = await supabase
        .from('data_users')
        .select('*')
        .ilike('nama', `%${nama.trim()}%`);
      if (data && data.length > 0) rows = data;
    }

    if (rows.length === 0) {
      const { data } = await supabase.from('data_users').select('*');
      if (data) rows = data;
    }

    let userRow = (rows || []).find((r: any) => {
      const uCol = (r.username || '').toString().toLowerCase().trim();
      const uMeta = (r.metadata?.['Username'] || '').toString().toLowerCase().trim();
      const targetUser = username.toLowerCase();
      if (username && (uCol === targetUser || uMeta === targetUser)) return true;

      const nCol = (r.nama || '').toString().toLowerCase().trim();
      const targetNama = nama.toLowerCase();
      if (nama && nCol === targetNama) return true;

      return false;
    });

    if (userRow) {
      const foto = userRow.metadata?.['Foto'] || userRow.metadata?.['foto'] || '';
      return NextResponse.json({
        success: true,
        user: {
          id: userRow.id,
          nama: userRow.nama || userRow.metadata?.['Nama'] || '',
          username: userRow.username || userRow.metadata?.['Username'] || username,
          role: userRow.role || userRow.metadata?.['Role'] || '',
          whatsapp: userRow.metadata?.['Whatsapp'] || '',
          pin: userRow.metadata?.['PIN'] || '',
          foto
        }
      }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      });
    }

    return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });
  } catch (error: any) {
    console.error('Sync User Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal sinkronisasi user: ' + error.message }, { status: 500 });
  }
}
