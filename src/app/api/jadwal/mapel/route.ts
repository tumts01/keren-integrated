import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const getMapelName = (r: any) => {
  if (!r.metadata) return '';
  const keys = Object.keys(r.metadata);
  const key = keys.find(k => {
    const lower = k.toLowerCase().replace(/[\s_]/g, '');
    return lower === 'namamapel' || lower === 'mapel' || lower === 'matapelajaran' || lower === 'pelajaran' || lower === 'namapelajaran';
  }) || 'MataPelajaran';
  return (r.metadata[key] || '').toString().trim();
};

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: rows, error } = await supabase.from('mata_pelajaran').select('*');
    if (error) throw error;

    const data = (rows || [])
      .map((r: any, i: number) => ({
        id: r.id || r.metadata?.['id'] || r.metadata?.['ID'] || `row-${i}`,
        namaMapel: getMapelName(r)
      }))
      .filter((r: any) => r.namaMapel);

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error) {
    console.error('Error fetching Mata Pelajaran:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data mata pelajaran' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, namaMapel } = body;

    if (action === 'add') {
      if (!namaMapel) return NextResponse.json({ success: false, error: 'Nama Mapel harus diisi' }, { status: 400 });
      const { error } = await supabase.from('mata_pelajaran').insert([{ metadata: { MataPelajaran: namaMapel } }]);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Mata pelajaran berhasil ditambahkan' });

    } else if (action === 'edit') {
      if (!namaMapel) return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
      
      const { data: rows, error: fetchError } = await supabase.from('mata_pelajaran').select('*');
      if (fetchError) throw fetchError;
      
      const row = (rows || []).find((r: any) => r.id === id || r.metadata?.['id'] === id || r.metadata?.['ID'] === id || getMapelName(r) === id);
      if (!row) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
      
      const updatedMetadata = { ...row.metadata, MataPelajaran: namaMapel };
      const keys = Object.keys(row.metadata || {});
      const existingKey = keys.find(k => {
        const lower = k.toLowerCase().replace(/[\s_]/g, '');
        return lower === 'namamapel' || lower === 'mapel' || lower === 'matapelajaran' || lower === 'pelajaran' || lower === 'namapelajaran';
      });
      if (existingKey) {
        updatedMetadata[existingKey] = namaMapel;
      }
      
      const { error } = await supabase.from('mata_pelajaran').update({ metadata: updatedMetadata }).eq('id', row.id);
      if (error) throw error;
      
      return NextResponse.json({ success: true, message: 'Mata pelajaran berhasil diperbarui' });

    } else if (action === 'delete') {
      if (!id) return NextResponse.json({ success: false, error: 'ID tidak ditemukan' }, { status: 400 });
      
      const { data: rows, error: fetchError } = await supabase.from('mata_pelajaran').select('*');
      if (fetchError) throw fetchError;
      
      const row = (rows || []).find((r: any) => r.id === id || r.metadata?.['id'] === id || r.metadata?.['ID'] === id || getMapelName(r) === id);
      if (!row) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
      
      const { error } = await supabase.from('mata_pelajaran').delete().eq('id', row.id);
      if (error) throw error;
      
      return NextResponse.json({ success: true, message: 'Mata pelajaran berhasil dihapus' });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });

  } catch (error) {
    console.error('Error modifying Mata Pelajaran:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan data mata pelajaran' }, { status: 500 });
  }
}
