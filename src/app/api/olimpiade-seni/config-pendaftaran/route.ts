import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DAFTAR_CABANG_LOMBA, DAFTAR_ITEM_BUKA_TUTUP } from '@/lib/olimpiade-config';

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

    const isBuka = data?.metadata?.pendaftaran_buka ?? true;
    const closedLombas = Array.isArray(data?.metadata?.closed_lombas) ? data.metadata.closed_lombas : [];
    
    return NextResponse.json({ 
      success: true, 
      pendaftaran_buka: isBuka,
      closed_lombas: closedLombas,
      all_lombas: DAFTAR_CABANG_LOMBA,
      items_buka_tutup: DAFTAR_ITEM_BUKA_TUTUP
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { buka, closed_lombas } = body;

    const { data: existing, error: findError } = await supabase
      .from('profil_lembaga')
      .select('*')
      .eq('jenis', 'CONFIG_OLIMPIADE')
      .limit(1)
      .single();

    let newMeta: any = {};

    if (existing) {
      const currentMeta = existing.metadata || {};
      newMeta = { 
        ...currentMeta,
        ...(buka !== undefined ? { pendaftaran_buka: Boolean(buka) } : {}),
        ...(closed_lombas !== undefined && Array.isArray(closed_lombas) ? { closed_lombas } : {})
      };
      const { error } = await supabase
        .from('profil_lembaga')
        .update({ metadata: newMeta })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      newMeta = { 
        pendaftaran_buka: buka !== undefined ? Boolean(buka) : true,
        closed_lombas: Array.isArray(closed_lombas) ? closed_lombas : []
      };
      const { error } = await supabase
        .from('profil_lembaga')
        .insert([{ jenis: 'CONFIG_OLIMPIADE', isi: 'CONFIG', metadata: newMeta }]);
      if (error) throw error;
    }

    return NextResponse.json({ 
      success: true, 
      pendaftaran_buka: newMeta.pendaftaran_buka ?? true,
      closed_lombas: newMeta.closed_lombas || []
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
