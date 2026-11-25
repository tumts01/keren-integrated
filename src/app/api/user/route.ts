import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGuruSessionFromRequest, isAdminOrPimpinanRole } from '@/lib/auth-session';
import { decryptPinForAdmin } from '@/lib/pin-crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getGuruSessionFromRequest(req);
    const canViewPin = Boolean(session && isAdminOrPimpinanRole(session.role));

    const { data: rows, error } = await supabase
      .from('data_users')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    const getImageUrl = (url: string) => {
      if (!url) return '';
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (url.includes('drive.google.com') && match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200-h200`;
      }
      return url;
    };

    const users = (rows || [])
      .map((row: any) => {
        const nama = row.nama || row.metadata?.['Nama'] || '';
        const username = row.username || row.metadata?.['Username'] || '';
        const role = row.role || row.metadata?.['Role'] || 'GTK';
        const rawFoto = row.metadata?.['Foto'] || row.metadata?.['foto'] || '';
        const foto = getImageUrl(rawFoto);
        const sudahGanti = row.metadata?.['Sudah Ganti Username'] === 'TRUE';
        const terakhirLogin = row.metadata?.['Terakhir Login'] || '';
        const whatsapp = row.metadata?.['Whatsapp'] || row.metadata?.['No WA'] || '';
        const hasPin = Boolean(row.metadata?.['PIN_HASH'] || row.metadata?.['PIN']);

        let pinDisplay = '';
        if (canViewPin && hasPin) {
          const dec = decryptPinForAdmin(row.metadata?.['PIN_ENC']);
          const legacyPlain = row.metadata?.['PIN'] ? String(row.metadata['PIN']).trim() : '';
          pinDisplay = dec || legacyPlain || '(Terenkripsi)';
        }

        return {
          id: row.id,
          nama,
          username,
          role,
          foto,
          rawFoto,
          sudahGanti,
          hasPin,
          ...(canViewPin ? { pinDisplay } : {}),
          terakhirLogin,
          whatsapp,
        };
      })
      .filter((u: any) => u.nama);

    return NextResponse.json(
      { success: true, data: users },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    console.error('Fetch Users Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data user: ' + error.message },
      { status: 500 }
    );
  }
}
