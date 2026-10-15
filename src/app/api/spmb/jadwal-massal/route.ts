import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const targetJalur = (body.targetJalur || 'Semua Jalur').trim();
    const jadwalTes = (body.jadwalTes || '').trim();

    // Skenario 1: Update berdasarkan daftar ID siswa yang dipilih (Checkbox)
    if (ids.length > 0) {
      const { data: rows, error: fetchError } = await supabase
        .from('data_spmb')
        .select('id, metadata')
        .in('id', ids);

      if (fetchError) throw fetchError;

      let updatedCount = 0;
      for (const row of rows || []) {
        const newMeta = {
          ...(row.metadata || {}),
          jadwal_tes: jadwalTes
        };

        const { error: updateError } = await supabase
          .from('data_spmb')
          .update({ metadata: newMeta })
          .eq('id', row.id);

        if (!updateError) {
          updatedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        updatedCount,
        jadwalTes,
        mode: 'by_ids'
      });
    }

    // Skenario 2: Update massal berdasarkan Jalur Pendaftaran
    const { data: rows, error: fetchError } = await supabase.from('data_spmb').select('id, metadata');
    if (fetchError) throw fetchError;

    let updatedCount = 0;
    const isSemua = targetJalur.toLowerCase() === 'semua jalur' || targetJalur.toLowerCase() === 'semua';

    for (const row of rows || []) {
      const meta = row.metadata || {};
      const jalur = meta['Jalur Pendaftaran'] || 'Reguler';

      if (isSemua || jalur.toLowerCase() === targetJalur.toLowerCase()) {
        const newMeta = {
          ...meta,
          jadwal_tes: jadwalTes
        };

        const { error: updateError } = await supabase
          .from('data_spmb')
          .update({ metadata: newMeta })
          .eq('id', row.id);

        if (!updateError) {
          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      targetJalur,
      jadwalTes,
      mode: 'by_jalur'
    });
  } catch (err: any) {
    console.error('Update Jadwal Massal Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
