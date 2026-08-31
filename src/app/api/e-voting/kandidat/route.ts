import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Ambil data kandidat
    const { data: rowsKandidat, error: errKandidat } = await supabase
      .from('kandidat_osim')
      .select('*')
      .order('id', { ascending: true });

    if (errKandidat) throw errKandidat;

    const kandidatList = (rowsKandidat || []).map(r => ({
      noUrut: r.nomor_urut || '',
      nama: (r.nama_paslon || '').trim(),
      visi: r.visi || '',
      misi: r.misi || '',
      fotoKetua: r.foto_ketua || '',
      fotoWakil: r.foto_wakil || ''
    }));

    // 2. Ambil data suara
    const { data: rowsSuara, error: errSuara } = await supabase
      .from('suara_osim')
      .select('*');

    if (errSuara) throw errSuara;

    const voteCounts: Record<string, number> = {};
    kandidatList.forEach(k => voteCounts[k.nama.toUpperCase()] = 0);
    
    const pemilihSet = new Set<string>();
    
    (rowsSuara || []).forEach(r => {
      const p = (r.nama_pemilih || '').trim();
      const k = (r.nama_paslon || '').trim().toUpperCase();
      if (p) pemilihSet.add(p.toUpperCase());
      if (k && voteCounts[k] !== undefined) {
        voteCounts[k]++;
      }
    });

    const result = kandidatList.map(k => ({
      ...k,
      suara: voteCounts[k.nama.toUpperCase()] || 0
    }));

    return NextResponse.json({ success: true, data: result, totalPemilih: pemilihSet.size }, {
      headers: { 'Cache-Control': 'public, s-maxage=0, stale-while-revalidate=5' }
    });
  } catch (err: any) {
    console.error('Error GET E-Voting Supabase:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
