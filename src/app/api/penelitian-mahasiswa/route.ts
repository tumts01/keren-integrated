import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';


export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('data_lpj_kegiatan')
      .select('*')
      .filter('metadata->>jenis', 'eq', 'Penelitian Mahasiswa')
      .order('id', { ascending: false });

    if (error) throw error;

    const formatted = (data || []).map(row => ({
      id: row.id,
      created_at: row.created_at,
      ...row.metadata
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Fetch Penelitian Mahasiswa Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { error } = await supabase.from('data_lpj_kegiatan').insert([{
      metadata: {
        jenis: 'Penelitian Mahasiswa',
        ...body
      }
    }]);

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Insert Penelitian Mahasiswa Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menambah data: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body;
    
    const { error } = await supabase.from('data_lpj_kegiatan')
      .update({
        metadata: {
          jenis: 'Penelitian Mahasiswa',
          ...rest
        }
      })
      .eq('id', id);

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update Penelitian Mahasiswa Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal update data: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('ID required');

    const { error } = await supabase.from('data_lpj_kegiatan').delete().eq('id', id);
    if (error) throw error;
    
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Gagal hapus data: ' + error.message }, { status: 500 });
  }
}
