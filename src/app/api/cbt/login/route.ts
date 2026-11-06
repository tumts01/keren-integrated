import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username dan Password wajib diisi' }, { status: 400 });
    }

    const cleanUser = (username || '').toString().trim();
    const cleanPass = (password || '').toString().trim();

    // Alias map agar username varian (misal bypass_mtk, trial_ipas) tetap bisa login
    const ALIAS_MAP: Record<string, string> = {
      'bypass_mtk': 'bypass_matematika',
      'trial_matematika': 'bypass_matematika',
      'trial_mtk': 'bypass_matematika',
      'trial_ipas': 'bypass_ipas',
      'trial_ipa': 'bypass_ipas',
      'bypass_ipa': 'bypass_ipas',
      'trial_pai': 'bypass_pai',
      'trial_inggris': 'bypass_inggris',
      'trial_arab': 'bypass_arab',
    };
    const lookupUser = ALIAS_MAP[cleanUser.toLowerCase()] || cleanUser;

    // Cari peserta di data_olimpiade_seni
    // Supabase jsonb query: metadata->>USERNAME_CBT
    const { data, error } = await supabase
      .from('data_olimpiade_seni')
      .select('metadata')
      .in('jenis_pendaftaran', ['individu', 'peserta_kolektif'])
      .filter('metadata->>USERNAME_CBT', 'eq', lookupUser)
      .filter('metadata->>PASSWORD_CBT', 'eq', cleanPass)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Username atau Password salah!' }, { status: 401 });
    }

    const p = data.metadata;

    // Temukan nilai lomba
    let lombaStr = p.LOMBA_DIPILIH || '';
    if (!lombaStr) {
       for (const key of Object.keys(p)) {
         if (key.toLowerCase().includes('lomba')) {
           lombaStr = p[key];
           break;
         }
       }
    }

    // Normalisasi
    let cabang = (lombaStr || '').toString().trim();
    if (cabang.toLowerCase() === 'arab' || cabang.toLowerCase() === 'bahasa arab' || cabang.toLowerCase() === 'b. arab') cabang = 'Arab';
    else if (cabang.toLowerCase() === 'inggris' || cabang.toLowerCase() === 'bahasa inggris' || cabang.toLowerCase() === 'b. inggris') cabang = 'Inggris';
    else if (cabang.toLowerCase() === 'pai' || cabang.toLowerCase() === 'p a i' || cabang.toLowerCase() === 'pendidikan agama islam') cabang = 'PAI';
    else if (cabang.toLowerCase() === 'ipas' || cabang.toLowerCase() === 'ipa') cabang = 'IPAS';
    else if (cabang.toLowerCase() === 'matematika' || cabang.toLowerCase() === 'mtk') cabang = 'Matematika';

    // Temukan nama
    let namaStr = p.NAMA || p.NAMA_REGU || '';
    if (!namaStr) {
      for (const key of Object.keys(p)) {
        if (key.toLowerCase().includes('nama')) {
          namaStr = p[key];
          break;
        }
      }
    }

    const isBypass = p.IS_BYPASS === true || (p.NOMOR_PESERTA || '').startsWith('BYPASS-');

    return NextResponse.json({ 
      success: true, 
      message: 'Login Berhasil', 
      user: {
        nomorPeserta: p.NOMOR_PESERTA,
        nama: namaStr,
        lomba: cabang,
        asalSekolah: p.ASAL_SEKOLAH,
        isBypass
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
