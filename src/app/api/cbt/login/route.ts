import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username dan Password wajib diisi' }, { status: 400 });
    }

    // Cari peserta di data_olimpiade_seni
    // Supabase jsonb query: metadata->>USERNAME_CBT
    const { data, error } = await supabase
      .from('data_olimpiade_seni')
      .select('metadata')
      .in('jenis_pendaftaran', ['individu', 'peserta_kolektif'])
      .filter('metadata->>USERNAME_CBT', 'eq', username)
      .filter('metadata->>PASSWORD_CBT', 'eq', password)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Username atau Password salah!' }, { status: 401 });
    }

    const p = data.metadata;

    return NextResponse.json({ 
      success: true, 
      message: 'Login Berhasil', 
      user: {
        nomorPeserta: p.NOMOR_PESERTA,
        nama: p.NAMA,
        lomba: p.LOMBA_DIPILIH,
        asalSekolah: p.ASAL_SEKOLAH
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
