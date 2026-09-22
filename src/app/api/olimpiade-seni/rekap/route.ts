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

export async function PUT(req: Request) {
  try {
    const { id, action } = await req.json();
    if (!id || action !== 'validasi') {
      return NextResponse.json({ success: false, error: 'Data tidak valid' }, { status: 400 });
    }

    // Ambil metadata saat ini
    const { data: existing, error: getErr } = await supabase
      .from('data_olimpiade_seni')
      .select('metadata')
      .eq('id', id)
      .single();

    if (getErr || !existing) {
      throw getErr || new Error('Data tidak ditemukan');
    }

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
  } catch (error: any) {
    console.error('PUT Rekap Olimpiade Error:', error);
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
