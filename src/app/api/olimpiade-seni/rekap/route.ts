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

    // Sinkronkan status validasi master kolektif ke peserta kolektif
    const masterStatusMap = new Map<string, string>();
    (data || []).forEach(row => {
      if (row.jenis_pendaftaran === 'kolektif') {
        const s = String(row.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase();
        if (s) masterStatusMap.set(s, row.metadata?.STATUS_PEMBAYARAN || 'Menunggu');
      }
    });

    const normalizedData = (data || []).map(row => {
      if (row.jenis_pendaftaran === 'peserta_kolektif') {
        const s1 = String(row.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase();
        const s2 = String(row.metadata?.['NAMA SD/MI'] || '').trim().toLowerCase();
        const masterStatus = masterStatusMap.get(s1) || masterStatusMap.get(s2);
        if (masterStatus === 'Valid' && row.metadata?.STATUS_PEMBAYARAN !== 'Valid') {
          return {
            ...row,
            metadata: {
              ...(row.metadata || {}),
              STATUS_PEMBAYARAN: 'Valid'
            }
          };
        }
      }
      return row;
    });

    return NextResponse.json({ success: true, data: normalizedData }, {
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

    const pesertaSekolah = (allPeserta || []).filter(p => String(p.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase() === String(sekolah || '').trim().toLowerCase());
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

    const master = (masters || []).find(m => String(m.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase() === String(sekolah || '').trim().toLowerCase());
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

      // Sinkronkan ke semua peserta kolektif jika ini master kolektif
      if (existing.jenis_pendaftaran === 'kolektif' && existing.metadata?.ASAL_SEKOLAH) {
        const sekolah = existing.metadata.ASAL_SEKOLAH;
        const { data: pesertasi } = await supabase
          .from('data_olimpiade_seni')
          .select('id, metadata')
          .eq('jenis_pendaftaran', 'peserta_kolektif');

        const targets = (pesertasi || []).filter(p => {
          const s1 = String(p.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase();
          const s2 = String(p.metadata?.['NAMA SD/MI'] || '').trim().toLowerCase();
          const target = String(sekolah || '').trim().toLowerCase();
          return s1 === target || s2 === target;
        });

        for (const t of targets) {
          await supabase
            .from('data_olimpiade_seni')
            .update({
              metadata: {
                ...t.metadata,
                STATUS_PEMBAYARAN: 'Valid'
              }
            })
            .eq('id', t.id);
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'tolak') {
      const newMeta = {
        ...existing.metadata,
        STATUS_PEMBAYARAN: 'Ditolak'
      };

      const { error: updateErr } = await supabase
        .from('data_olimpiade_seni')
        .update({ metadata: newMeta })
        .eq('id', id);

      if (updateErr) throw updateErr;

      // Sinkronkan ke semua peserta kolektif jika ini master kolektif
      if (existing.jenis_pendaftaran === 'kolektif' && existing.metadata?.ASAL_SEKOLAH) {
        const sekolah = existing.metadata.ASAL_SEKOLAH;
        const { data: pesertasi } = await supabase
          .from('data_olimpiade_seni')
          .select('id, metadata')
          .eq('jenis_pendaftaran', 'peserta_kolektif');

        const targets = (pesertasi || []).filter(p => {
          const s1 = String(p.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase();
          const s2 = String(p.metadata?.['NAMA SD/MI'] || '').trim().toLowerCase();
          const target = String(sekolah || '').trim().toLowerCase();
          return s1 === target || s2 === target;
        });

        for (const t of targets) {
          await supabase
            .from('data_olimpiade_seni')
            .update({
              metadata: {
                ...t.metadata,
                STATUS_PEMBAYARAN: 'Ditolak'
              }
            })
            .eq('id', t.id);
        }
      }

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

    if (existing.jenis_pendaftaran === 'kolektif') {
      const oldSekolah = String(existing.metadata?.ASAL_SEKOLAH || '').trim();
      const newSekolah = String(updatedMeta.ASAL_SEKOLAH || '').trim();
      const oldStatus = existing.metadata?.STATUS_PEMBAYARAN;
      const newStatus = updatedMeta.STATUS_PEMBAYARAN;

      // 1. Jika nama asal sekolah diubah, update juga pada semua data peserta_kolektif
      if (newSekolah && oldSekolah && newSekolah.toLowerCase() !== oldSekolah.toLowerCase()) {
        const { data: pesertasi } = await supabase
          .from('data_olimpiade_seni')
          .select('id, metadata')
          .eq('jenis_pendaftaran', 'peserta_kolektif');

        const targets = (pesertasi || []).filter(p => {
          const s1 = String(p.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase();
          const s2 = String(p.metadata?.['NAMA SD/MI'] || '').trim().toLowerCase();
          const target = oldSekolah.toLowerCase();
          return s1 === target || s2 === target;
        });

        for (const t of targets) {
          await supabase
            .from('data_olimpiade_seni')
            .update({
              metadata: {
                ...t.metadata,
                ASAL_SEKOLAH: newSekolah,
                'NAMA SD/MI': newSekolah
              }
            })
            .eq('id', t.id);
        }
      }

      // 2. Jika status pembayaran diubah, sinkronkan ke semua peserta_kolektif
      if (newStatus && newStatus !== oldStatus) {
        const sekolahTarget = newSekolah || oldSekolah;
        const { data: pesertasi } = await supabase
          .from('data_olimpiade_seni')
          .select('id, metadata')
          .eq('jenis_pendaftaran', 'peserta_kolektif');

        const targets = (pesertasi || []).filter(p => {
          const s1 = String(p.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase();
          const s2 = String(p.metadata?.['NAMA SD/MI'] || '').trim().toLowerCase();
          const target = sekolahTarget.toLowerCase();
          return s1 === target || s2 === target;
        });

        for (const t of targets) {
          await supabase
            .from('data_olimpiade_seni')
            .update({
              metadata: {
                ...t.metadata,
                STATUS_PEMBAYARAN: newStatus
              }
            })
            .eq('id', t.id);
        }
      }
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

    if (!existing) {
      return NextResponse.json({ success: true, message: 'Data sudah tidak ada' });
    }

    // 1. Jika yang dihapus master 'kolektif', hapus juga seluruh data anak peserta_kolektif beserta sesi CBT-nya
    if (existing.jenis_pendaftaran === 'kolektif') {
      const sekolah = existing.metadata?.ASAL_SEKOLAH || existing.metadata?.['NAMA SD/MI'];
      if (sekolah) {
        const { data: children } = await supabase
          .from('data_olimpiade_seni')
          .select('id, metadata')
          .eq('jenis_pendaftaran', 'peserta_kolektif');

        const matchedChildren = (children || []).filter(c => {
          const s1 = String(c.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase();
          const s2 = String(c.metadata?.['NAMA SD/MI'] || '').trim().toLowerCase();
          const target = String(sekolah).trim().toLowerCase();
          return s1 === target || s2 === target;
        });

        if (matchedChildren.length > 0) {
          const childIds = matchedChildren.map(c => c.id);
          const childNomorPeserta = matchedChildren
            .map(c => c.metadata?.NOMOR_PESERTA)
            .filter(Boolean);

          // Hapus sesi CBT anak-anak kolektif ini
          if (childNomorPeserta.length > 0) {
            await supabase.from('cbt_sesi').delete().in('nomor_peserta', childNomorPeserta);
          }
          // Hapus nilai juri anak-anak kolektif ini
          await supabase.from('olimpiade_nilai').delete().in('peserta_id', childIds);
          // Hapus seluruh baris peserta_kolektif dari database
          await supabase.from('data_olimpiade_seni').delete().in('id', childIds);
        }
      }
    } else {
      // 2. Jika yang dihapus Individu atau Peserta Kolektif tunggal:
      const nomorPeserta = existing.metadata?.NOMOR_PESERTA;
      if (nomorPeserta) {
        await supabase.from('cbt_sesi').delete().eq('nomor_peserta', nomorPeserta);
      }
      await supabase.from('olimpiade_nilai').delete().eq('peserta_id', id);

      // Jika peserta_kolektif, sinkronkan counter master kolektif
      if (existing.jenis_pendaftaran === 'peserta_kolektif') {
        const sekolah = existing.metadata?.ASAL_SEKOLAH;
        if (sekolah) {
          await syncCollectiveRecap(sekolah);
        }
      }
    }

    // Hapus baris utama
    const { error } = await supabase
      .from('data_olimpiade_seni')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Data dan seluruh sesi terkait berhasil dihapus' });
  } catch (error: any) {
    console.error('DELETE Rekap Olimpiade Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
