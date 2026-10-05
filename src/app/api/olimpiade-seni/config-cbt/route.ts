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
    
    return NextResponse.json({ success: true, cbt_buka: isBuka });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { buka } = await req.json();

    const { data: existing, error: findError } = await supabase
      .from('profil_lembaga')
      .select('*')
      .eq('jenis', 'CONFIG_OLIMPIADE')
      .limit(1)
      .single();

    if (existing) {
      const currentMeta = existing.metadata || {};
      const newMeta = { ...currentMeta, cbt_buka: buka };
      const { error } = await supabase
        .from('profil_lembaga')
        .update({ metadata: newMeta })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('profil_lembaga')
        .insert([{ jenis: 'CONFIG_OLIMPIADE', isi: 'CONFIG', metadata: { cbt_buka: buka, pendaftaran_buka: true } }]);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, cbt_buka: buka });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}