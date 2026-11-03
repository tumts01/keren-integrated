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
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const isBuka = data?.metadata?.cbt_buka ?? false;
    const tahapCbt = data?.metadata?.tahap_cbt === 'final' ? 'final' : 'seleksi';
    
    return NextResponse.json({ success: true, cbt_buka: isBuka, tahap_cbt: tahapCbt });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { buka, tahap_cbt } = body;

    const { data: existing, error: findError } = await supabase
      .from('profil_lembaga')
      .select('*')
      .eq('jenis', 'CONFIG_OLIMPIADE')
      .limit(1)
      .single();

    const currentMeta = existing?.metadata || {};
    const nextBuka = typeof buka === 'boolean' ? buka : (currentMeta.cbt_buka ?? false);
    const nextTahap = tahap_cbt === 'final' ? 'final' : tahap_cbt === 'seleksi' ? 'seleksi' : (currentMeta.tahap_cbt || 'seleksi');

    if (existing) {
      const newMeta = { ...currentMeta, cbt_buka: nextBuka, tahap_cbt: nextTahap };
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
          metadata: { cbt_buka: nextBuka, tahap_cbt: nextTahap, pendaftaran_buka: true }
        }]);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, cbt_buka: nextBuka, tahap_cbt: nextTahap });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
