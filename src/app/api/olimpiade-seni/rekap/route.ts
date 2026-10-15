import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('data_olimpiade_seni')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=0, stale-while-revalidate=0' }
    });
  } catch (error: any) {
    console.error('GET Rekap Olimpiade Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function syncCollectiveRecap(sekolah: string) {
  if (!sekolah) return;
  try {
    const { data: allPeserta } = await supabase
      .from('data_olimpiade_seni')
      .select('metadata')
      .eq('jenis_pendaftaran', 'peserta_kolektif');

    const pesertaSekolah = (allPeserta || []).filter(p => p.metadata?.ASAL_SEKOLAH?.trim() === sekolah.trim());
    const rekap: Record<string, number> = {};
    pesertaSekolah.forEach(p => {
      const l = p.metadata?.LOMBA_DIPILIH || p.metadata?.['LOMBA YANG DIPILIH'] || '';
      if (l) {
        rekap[l] = (rekap[l] || 0) + 1;
      }
    });

    const { data: masters } = await supabase
      .from('data_olimpiade_seni')
      .select('id, metadata')
      .eq('jenis_pendaftaran', 'kolektif');

    const master = (masters || []).find(m => m.metadata?.ASAL_SEKOLAH?.trim() === sekolah.trim());
    if (master) {
      await supabase
        .from('data_olimpiade_seni')
        .update({
          metadata: {
            ...master.metadata,
            REKAP_PESERTA: rekap
          }
        })
        .eq('id', master.id);
    }
  } catch (e) {
    console.error('Error syncCollectiveRecap:', e);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, action, metadata } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID tidak valid' }, { status: 400 });
    }

    // Ambil metadata saat ini
    const { data: existing, error: getErr } = await supabase
      .from('data_olimpiade_seni')
      .select('*')
      .eq('id', id)
      .single();

    if (getErr || !existing) {
      throw getErr || new Error('Data tidak ditemukan');
    }

    if (action === 'validasi') {
      const newMeta = {
        ...existing.metadata,
        STATUS_PEMBAYARAN: 'Valid'
      };

      const { error: updateErr } = await supabase
        .from('data_olimpiade_seni')
        .update({ metadata: newMeta })
        .eq('id', id);

      if (updateErr) throw updateErr;
      return NextResponse.json({ success: true });
    }

    if (action === 'edit_peserta' || metadata) {
      const updatedMeta = {
        ...existing.metadata,
        ...(metadata || {})
      };

      const { error: updateErr } = await supabase
        .from('data_olimpiade_seni')
        .update({ metadata: updatedMeta })
        .eq('id', id);

      if (updateErr) throw updateErr;

      // Sync rekap sekolah jika peserta kolektif
      if (existing.jenis_pendaftaran === 'peserta_kolektif') {
        const sekolah = updatedMeta.ASAL_SEKOLAH || existing.metadata?.ASAL_SEKOLAH;
        await syncCollectiveRecap(sekolah);
      }

      return NextResponse.json({ success: true, message: 'Data peserta berhasil diperbarui' });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak dikenali' }, { status: 400 });
  } catch (error: any) {
    console.error('PUT Rekap Olimpiade Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, metadata } = await req.json();
    if (!id || !metadata) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const { data: existing, error: getErr } = await supabase
      .from('data_olimpiade_seni')
      .select('*')
      .eq('id', id)
      .single();

    if (getErr || !existing) {
      throw getErr || new Error('Data peserta tidak ditemukan');
    }

    const updatedMeta = {
      ...existing.metadata,
      ...metadata
    };

    const { error: updateErr } = await supabase
      .from('data_olimpiade_seni')
      .update({ metadata: updatedMeta })
      .eq('id', id);

    if (updateErr) throw updateErr;

    if (existing.jenis_pendaftaran === 'peserta_kolektif') {
      const sekolah = updatedMeta.ASAL_SEKOLAH || existing.metadata?.ASAL_SEKOLAH;
      await syncCollectiveRecap(sekolah);
    }

    return NextResponse.json({ success: true, message: 'Data peserta berhasil diperbarui' });
  } catch (error: any) {
    console.error('PATCH Rekap Olimpiade Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID tidak ditemukan' }, { status: 400 });
    }

    // Ambil data sebelum dihapus
    const { data: existing } = await supabase
      .from('data_olimpiade_seni')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('data_olimpiade_seni')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Jika yang dihapus peserta_kolektif, update counter master kolektif
    if (existing && existing.jenis_pendaftaran === 'peserta_kolektif') {
      const sekolah = existing.metadata?.ASAL_SEKOLAH;
      if (sekolah) {
        await syncCollectiveRecap(sekolah);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE Rekap Olimpiade Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
