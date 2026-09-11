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
      id: r.id,
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nomor_urut, nama_paslon, visi, misi, foto_ketua, foto_wakil } = body;
    
    if (!nama_paslon) {
      return NextResponse.json({ success: false, error: 'Nama Paslon wajib diisi' }, { status: 400 });
    }

    const { error } = await supabase.from('kandidat_osim').insert([{
      nomor_urut: nomor_urut || '',
      nama_paslon: nama_paslon.trim(),
      visi: visi || '',
      misi: misi || '',
      foto_ketua: foto_ketua || '',
      foto_wakil: foto_wakil || ''
    }]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get('id');
    const body = await req.json();
    const { nomor_urut, nama_paslon, visi, misi, foto_ketua, foto_wakil } = body;

    if (!idStr || !nama_paslon) {
      return NextResponse.json({ success: false, error: 'ID dan Nama Paslon wajib diisi' }, { status: 400 });
    }
    
    const id = /^\d+$/.test(idStr) ? parseInt(idStr, 10) : idStr;

    const { error } = await supabase.from('kandidat_osim').update({
      nomor_urut: nomor_urut || '',
      nama_paslon: nama_paslon.trim(),
      visi: visi || '',
      misi: misi || '',
      foto_ketua: foto_ketua || '',
      foto_wakil: foto_wakil || ''
    }).eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get('id');
    
    if (!idStr) {
      return NextResponse.json({ success: false, error: 'ID wajib diisi' }, { status: 400 });
    }

    const id = /^\d+$/.test(idStr) ? parseInt(idStr, 10) : idStr;

    const { error, count } = await supabase.from('kandidat_osim').delete({ count: 'exact' }).eq('id', id);

    if (error) throw error;
    if (count === 0) {
      return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
