import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get('tanggal');

    const { data: rows, error } = await supabase.from('data_jam_config').select('*');
    if (error) throw error;

    const data = (rows || []).map((r: any) => ({
      id: r.id,
      tanggal: r.metadata?.['Tanggal'] || r.tanggal || '',
      jamTersedia: r.metadata?.['JamTersedia'] ?? (r.jam_tersedia || ''),
      keterangan: r.metadata?.['Keterangan'] || '',
      updatedAt: r.metadata?.['UpdatedAt'] || '',
    })).filter((r: any) => r.tanggal);

    if (tanggal) {
      const found = data.find((r: any) => r.tanggal === tanggal);
      if (!found) {
        return NextResponse.json({ success: true, hasConfig: false, jamTersedia: [1,2,3,4,5,6,7,8,9,10,11,12,13], keterangan: '' });
      }
      const jams = (typeof found.jamTersedia === 'string' && found.jamTersedia.trim().length > 0)
        ? found.jamTersedia.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n))
        : [];
      return NextResponse.json({ success: true, hasConfig: true, jamTersedia: jams, keterangan: found.keterangan });
    }

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, jamTersedia, keterangan } = body;

    if (!tanggal || !Array.isArray(jamTersedia)) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const jamStr = jamTersedia.join(', ');
    const updatedAt = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // Check existing
    const { data: existingRows } = await supabase.from('data_jam_config').select('id, tanggal, metadata');
    const existingRow = (existingRows || []).find((r: any) => (r.metadata?.['Tanggal'] || r.tanggal) === tanggal);

    const metadata = {
      'Tanggal': tanggal,
      'JamTersedia': jamStr,
      'Keterangan': keterangan || '',
      'UpdatedAt': updatedAt
    };

    if (existingRow) {
      const { error } = await supabase.from('data_jam_config').update({ metadata }).eq('id', existingRow.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('data_jam_config').insert([{ tanggal, metadata }]);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get('tanggal');

    if (!tanggal) {
      return NextResponse.json({ success: false, error: 'Tanggal diperlukan' }, { status: 400 });
    }

    const { data: rows, error: selectErr } = await supabase.from('data_jam_config').select('id, tanggal, metadata');
    if (selectErr) throw selectErr;

    const matched = (rows || []).filter((r: any) => (r.metadata?.['Tanggal'] || r.tanggal) === tanggal);
    if (matched.length > 0) {
      const ids = matched.map((r: any) => r.id);
      const { error: delErr } = await supabase.from('data_jam_config').delete().in('id', ids);
      if (delErr) throw delErr;
    } else {
      await supabase.from('data_jam_config').delete().eq('tanggal', tanggal);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
