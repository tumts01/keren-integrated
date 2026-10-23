import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('data_lpj_kegiatan')
      .select('*')
      .filter('metadata->>jenis', 'eq', 'Laporan Diklat')
      .order('id', { ascending: false });

    if (error) throw error;

    const formatted = (data || []).map((row: any) => ({
      id: row.id,
      created_at: row.created_at,
      ...row.metadata
    }));

    return NextResponse.json({
      success: true,
      data: formatted
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error: any) {
    console.error('Fetch Laporan Diklat Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { namaGuru, namaKegiatan, tanggal } = body;

    if (!namaGuru || !namaKegiatan || !tanggal) {
      return NextResponse.json({ success: false, error: 'Nama guru, nama kegiatan, dan tanggal wajib diisi' }, { status: 400 });
    }

    const { error } = await supabase.from('data_lpj_kegiatan').insert([{
      metadata: {
        jenis: 'Laporan Diklat',
        ...body,
        created_at: new Date().toISOString()
      }
    }]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Insert Laporan Diklat Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menambah data: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID laporan wajib disertakan' }, { status: 400 });
    }

    const { error } = await supabase.from('data_lpj_kegiatan')
      .update({
        metadata: {
          jenis: 'Laporan Diklat',
          ...rest,
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update Laporan Diklat Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memperbarui data: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID laporan wajib disertakan' }, { status: 400 });
    }

    const { error } = await supabase.from('data_lpj_kegiatan').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Laporan Diklat Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus data: ' + error.message }, { status: 500 });
  }
}
