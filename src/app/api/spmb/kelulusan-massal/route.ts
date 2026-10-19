import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ids: (string | number)[] = Array.isArray(body.ids) ? body.ids : [];
    const targetJalur = (body.targetJalur || '').trim();
    const statusKelulusan = (body.statusKelulusan || '').trim().toLowerCase();
    const onlyProses = Boolean(body.onlyProses);
    const catatan = (body.catatan || '').trim();

    if (!statusKelulusan) {
      return NextResponse.json(
        { success: false, error: 'Status kelulusan harus dipilih' },
        { status: 400 }
      );
    }

    const validStatuses = ['diterima', 'cadangan', 'tidak_diterima', 'proses'];
    if (!validStatuses.includes(statusKelulusan)) {
      return NextResponse.json(
        { success: false, error: `Status kelulusan "${statusKelulusan}" tidak valid. Pilihan: diterima, cadangan, tidak_diterima, proses` },
        { status: 400 }
      );
    }

    // Skenario 1: Eksekusi berdasarkan daftar ID yang dipilih (Checkbox / Filter IDs)
    if (ids.length > 0) {
      const { data: rows, error: fetchError } = await supabase
        .from('data_spmb')
        .select('id, metadata')
        .in('id', ids);

      if (fetchError) throw fetchError;

      let updatedCount = 0;
      for (const row of rows || []) {
        const meta = row.metadata || {};
        const currentStatus = (meta.status_kelulusan || 'proses').toLowerCase();

        // Jika opsi onlyProses aktif, lewati yang statusnya bukan 'proses'
        if (onlyProses && currentStatus !== 'proses') {
          continue;
        }

        const newMeta = {
          ...meta,
          status_kelulusan: statusKelulusan,
          ...(catatan ? { catatan_kelulusan: catatan } : {})
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
        statusKelulusan,
        mode: 'by_ids'
      });
    }

    // Skenario 2: Eksekusi massal berdasarkan Jalur Pendaftaran
    const { data: rows, error: fetchError } = await supabase
      .from('data_spmb')
      .select('id, metadata');

    if (fetchError) throw fetchError;

    let updatedCount = 0;
    const isSemuaJalur = !targetJalur || targetJalur.toLowerCase() === 'semua jalur' || targetJalur.toLowerCase() === 'semua';

    for (const row of rows || []) {
      const meta = row.metadata || {};
      const jalur = meta['Jalur Pendaftaran'] || 'Reguler';
      const currentStatus = (meta.status_kelulusan || 'proses').toLowerCase();

      // Filter jalur jika bukan semua
      if (!isSemuaJalur && jalur.toLowerCase() !== targetJalur.toLowerCase()) {
        continue;
      }

      // Jika opsi onlyProses aktif, lewati yang statusnya bukan 'proses'
      if (onlyProses && currentStatus !== 'proses') {
        continue;
      }

      const newMeta = {
        ...meta,
        status_kelulusan: statusKelulusan,
        ...(catatan ? { catatan_kelulusan: catatan } : {})
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
      targetJalur,
      statusKelulusan,
      mode: 'by_jalur'
    });

  } catch (err: any) {
    console.error('Update Kelulusan Massal Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
