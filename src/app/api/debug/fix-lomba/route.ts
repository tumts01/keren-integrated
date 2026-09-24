import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: allData, error: err1 } = await supabase.from('cbt_soal').select('id, cabang_lomba');
    if (err1) throw err1;

    let updated = 0;
    for (const row of allData) {
      const orig = row.cabang_lomba;
      let cabang = orig.trim();
      
      if (cabang.toLowerCase() === 'arab' || cabang.toLowerCase() === 'bahasa arab' || cabang.toLowerCase() === 'b. arab') cabang = 'Arab';
      else if (cabang.toLowerCase() === 'inggris' || cabang.toLowerCase() === 'bahasa inggris' || cabang.toLowerCase() === 'b. inggris') cabang = 'Inggris';
      else if (cabang.toLowerCase() === 'pai' || cabang.toLowerCase() === 'p a i' || cabang.toLowerCase() === 'pendidikan agama islam') cabang = 'PAI';
      else if (cabang.toLowerCase() === 'ipas' || cabang.toLowerCase() === 'ipa') cabang = 'IPAS';
      else if (cabang.toLowerCase() === 'matematika' || cabang.toLowerCase() === 'mtk') cabang = 'Matematika';

      if (cabang !== orig) {
        await supabase.from('cbt_soal').update({ cabang_lomba: cabang }).eq('id', row.id);
        updated++;
      }
    }

    return NextResponse.json({ success: true, message: `Fixed ${updated} rows.` });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
