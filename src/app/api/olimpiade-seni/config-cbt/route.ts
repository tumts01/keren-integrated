import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('profil_lembaga')
      .select('*')
      .eq('jenis', 'CONFIG_OLIMPIADE')
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    const isBuka = data?.metadata?.cbt_buka ?? false;
    const tahapCbt = data?.metadata?.tahap_cbt === 'final' ? 'final' : 'seleksi';
    const loginKhususLolos = typeof data?.metadata?.login_khusus_lolos === 'boolean'
      ? data.metadata.login_khusus_lolos
      : tahapCbt === 'final';
    
    return NextResponse.json({
      success: true,
      cbt_buka: isBuka,
      tahap_cbt: tahapCbt,
      login_khusus_lolos: loginKhususLolos
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { buka, tahap_cbt, login_khusus_lolos } = body;

    const { data: existing } = await supabase
      .from('profil_lembaga')
      .select('*')
      .eq('jenis', 'CONFIG_OLIMPIADE')
      .limit(1)
      .maybeSingle();

    const currentMeta = existing?.metadata || {};
    const nextBuka = typeof buka === 'boolean' ? buka : (currentMeta.cbt_buka ?? false);
    const nextTahap = tahap_cbt === 'final' ? 'final' : tahap_cbt === 'seleksi' ? 'seleksi' : (currentMeta.tahap_cbt || 'seleksi');
    const nextLoginKhususLolos = typeof login_khusus_lolos === 'boolean'
      ? login_khusus_lolos
      : tahap_cbt === 'final'
        ? true
        : (typeof currentMeta.login_khusus_lolos === 'boolean' ? currentMeta.login_khusus_lolos : false);

    if (existing) {
      const newMeta = {
        ...currentMeta,
        cbt_buka: nextBuka,
        tahap_cbt: nextTahap,
        login_khusus_lolos: nextLoginKhususLolos
      };
      const { error } = await supabase
        .from('profil_lembaga')
        .update({ metadata: newMeta })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('profil_lembaga')
        .insert([{
          jenis: 'CONFIG_OLIMPIADE',
          isi: 'CONFIG',
          metadata: {
            cbt_buka: nextBuka,
            tahap_cbt: nextTahap,
            login_khusus_lolos: nextLoginKhususLolos,
            pendaftaran_buka: true
          }
        }]);
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      cbt_buka: nextBuka,
      tahap_cbt: nextTahap,
      login_khusus_lolos: nextLoginKhususLolos
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
