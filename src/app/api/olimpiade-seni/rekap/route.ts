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

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID tidak ditemukan' }, { status: 400 });
    }

    const { error } = await supabase
      .from('data_olimpiade_seni')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE Rekap Olimpiade Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
